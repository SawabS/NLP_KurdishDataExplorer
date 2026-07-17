"""Document embedding with on-disk caching.

Embeddings are the most expensive reusable artifact, so they are cached to
``artifacts/embeddings/`` keyed by (model, content hash). Re-running the
pipeline on the same documents and model reuses the cached vectors.
"""
from __future__ import annotations

from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed
import functools
import hashlib
import os
import random
import re
import threading
import time
from collections.abc import Callable

import numpy as np

from . import config


class OpenAIEmbedder:
    """SentenceTransformer-compatible adapter for OpenAI embedding models."""

    def __init__(self, model: str) -> None:
        from openai import OpenAI
        import tiktoken

        self.model = model
        # Handle retries here so token-budget reservations include every retry.
        self.client = OpenAI(max_retries=0)
        try:
            self.encoding = tiktoken.encoding_for_model(model)
        except KeyError:
            self.encoding = tiktoken.get_encoding("cl100k_base")

        # text-embedding-3-small's free tier is 40k TPM. Both values are
        # configurable so paid tiers can opt into their higher limits.
        self.tpm_limit = max(1_000, int(os.getenv("OPENAI_EMBEDDING_TPM", "40000")))
        self.token_budget = max(1, int(self.tpm_limit * 0.9))
        default_batch_tokens = min(18_000, max(1, self.token_budget // 2))
        self.max_batch_tokens = min(
            self.token_budget,
            max(
                1,
                int(os.getenv("OPENAI_EMBEDDING_BATCH_TOKENS", str(default_batch_tokens))),
            ),
        )
        self.max_input_tokens = min(
            8_000,
            max(1, int(os.getenv("OPENAI_EMBEDDING_MAX_INPUT_TOKENS", "8000"))),
        )
        self.max_retries = max(0, int(os.getenv("OPENAI_EMBEDDING_MAX_RETRIES", "6")))

    def _settings(self) -> tuple[int, int, int, int]:
        """Return settings, including safe defaults for test doubles."""
        tpm_limit = getattr(self, "tpm_limit", 40_000)
        token_budget = getattr(self, "token_budget", int(tpm_limit * 0.9))
        max_batch_tokens = getattr(
            self, "max_batch_tokens", min(18_000, max(1, token_budget // 2))
        )
        max_input_tokens = getattr(self, "max_input_tokens", 8_000)
        return tpm_limit, token_budget, max_batch_tokens, max_input_tokens

    def _encoding(self):
        encoding = getattr(self, "encoding", None)
        if encoding is None:
            import tiktoken

            try:
                encoding = tiktoken.encoding_for_model(self.model)
            except KeyError:
                encoding = tiktoken.get_encoding("cl100k_base")
            self.encoding = encoding
        return encoding

    def estimate_tokens(self, docs: list[str]) -> int:
        """Return the exact tokenizer count used to construct API requests."""
        encoding = self._encoding()
        return sum(
            max(1, len(encoding.encode(doc, disallowed_special=())))
            for doc in docs
        )

    def _pieces(self, docs: list[str]) -> list[tuple[int, list[int]]]:
        """Tokenize documents and split overlong inputs without losing a row."""
        encoding = self._encoding()
        _, _, max_batch_tokens, configured_input_tokens = self._settings()
        max_input_tokens = min(max_batch_tokens, configured_input_tokens)
        pieces: list[tuple[int, list[int]]] = []
        for doc_index, doc in enumerate(docs):
            token_ids = encoding.encode(doc, disallowed_special=())
            if not token_ids:
                token_ids = encoding.encode(" ", disallowed_special=())
            pieces.extend(
                (doc_index, token_ids[start:start + max_input_tokens])
                for start in range(0, len(token_ids), max_input_tokens)
            )
        return pieces

    @staticmethod
    def _retry_delay(exc: Exception, fallback: float) -> float:
        """Prefer server-provided reset headers, then exponential backoff."""
        response = getattr(exc, "response", None)
        headers = getattr(response, "headers", {}) or {}
        retry_after = headers.get("retry-after")
        if retry_after:
            try:
                return max(fallback, float(retry_after))
            except ValueError:
                pass

        reset = headers.get("x-ratelimit-reset-tokens")
        if reset:
            units = {"ms": 0.001, "s": 1.0, "m": 60.0, "h": 3_600.0}
            seconds = sum(
                float(value) * units[unit]
                for value, unit in re.findall(r"([0-9.]+)(ms|s|m|h)", reset)
            )
            if seconds:
                return max(fallback, seconds)
        return fallback

    def _request_with_backoff(
        self,
        inputs: list[list[int]],
        token_count: int,
        limiter: "_TokenRateLimiter",
    ):
        from openai import RateLimitError

        delay = 1.0
        max_retries = getattr(self, "max_retries", 6)
        for attempt in range(max_retries + 1):
            limiter.wait_for(token_count)
            try:
                raw_client = getattr(self.client.embeddings, "with_raw_response", None)
                if raw_client is None:
                    return self.client.embeddings.create(model=self.model, input=inputs)
                raw_response = raw_client.create(model=self.model, input=inputs)
                api_limit = raw_response.headers.get("x-ratelimit-limit-tokens")
                if api_limit:
                    limiter.update_limit(max(1, int(float(api_limit) * 0.9)))
                return raw_response.parse()
            except RateLimitError as exc:
                if attempt == max_retries:
                    raise
                wait_seconds = self._retry_delay(
                    exc, min(60.0, delay * (1.0 + random.random()))
                )
                time.sleep(wait_seconds)
                delay = min(60.0, delay * 2.0)
        raise AssertionError("unreachable")

    def encode(
        self,
        docs: list[str],
        batch_size: int = 128,
        show_progress_bar: bool = False,
        convert_to_numpy: bool = True,
        normalize_embeddings: bool = True,
        progress: Callable[[int, int], None] | None = None,
        **_: object,
    ) -> np.ndarray:
        """Embed texts in token-aware, rate-limited batches.

        Documents longer than the embedding input limit are split into token
        chunks. Their chunk vectors are combined with a token-weighted mean so
        the result still contains exactly one vector per input document.
        """
        if not docs:
            return np.empty((0, 0), dtype="float32")

        _, token_budget, max_batch_tokens, _ = self._settings()
        pieces = self._pieces(docs)
        limiter = _TokenRateLimiter(token_budget)
        sums: list[np.ndarray | None] = [None] * len(docs)
        weights = np.zeros(len(docs), dtype="float64")
        completed = 0

        while completed < len(pieces):
            # Greedily pack token chunks while respecting both the caller's
            # item cap and the model/account token budget.
            batch: list[tuple[int, list[int]]] = []
            batch_tokens = 0
            cursor = completed
            while cursor < len(pieces) and len(batch) < max(1, batch_size):
                piece = pieces[cursor]
                piece_tokens = len(piece[1])
                if batch and batch_tokens + piece_tokens > max_batch_tokens:
                    break
                batch.append(piece)
                batch_tokens += piece_tokens
                cursor += 1

            response = self._request_with_backoff(
                [token_ids for _, token_ids in batch], batch_tokens, limiter
            )
            ordered = sorted(response.data, key=lambda item: item.index)
            if len(ordered) != len(batch):
                raise RuntimeError(
                    f"OpenAI returned {len(ordered)} embeddings for {len(batch)} inputs."
                )
            for item, (doc_index, token_ids) in zip(ordered, batch, strict=True):
                vector = np.asarray(item.embedding, dtype="float64")
                weight = len(token_ids)
                if sums[doc_index] is None:
                    sums[doc_index] = np.zeros_like(vector)
                sums[doc_index] += vector * weight
                weights[doc_index] += weight

            completed = cursor
            if progress is not None:
                progress(completed, len(pieces))

        embeddings = np.vstack([
            vector / weights[index]
            for index, vector in enumerate(sums)
            if vector is not None
        ]).astype("float32")
        if len(embeddings) != len(docs):
            raise RuntimeError("OpenAI embedding aggregation lost one or more documents.")
        if normalize_embeddings and len(embeddings):
            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            embeddings = embeddings / np.maximum(norms, np.finfo("float32").eps)
        return embeddings


class _TokenRateLimiter:
    """Sliding-window token limiter for synchronous embedding requests."""

    def __init__(self, token_budget: int) -> None:
        self.token_budget = token_budget
        self.history: deque[tuple[float, int]] = deque()

    def wait_for(self, tokens: int) -> None:
        if tokens > self.token_budget:
            raise ValueError(
                f"Embedding request has {tokens} tokens but the safe TPM budget is "
                f"{self.token_budget}. Reduce OPENAI_EMBEDDING_BATCH_TOKENS."
            )
        while True:
            now = time.monotonic()
            while self.history and now - self.history[0][0] >= 60.0:
                self.history.popleft()
            used = sum(count for _, count in self.history)
            if used + tokens <= self.token_budget:
                self.history.append((now, tokens))
                return
            wait_seconds = max(0.05, 60.0 - (now - self.history[0][0]) + 0.05)
            time.sleep(wait_seconds)

    def update_limit(self, token_budget: int) -> None:
        """Adopt the API's current limit after a successful response."""
        self.token_budget = token_budget


class NvidiaEmbedder:
    """SentenceTransformer-compatible adapter for NVIDIA's hosted Nemotron NIM.

    Uses the OpenAI-compatible endpoint at ``integrate.api.nvidia.com``. Unlike
    OpenAI's free tier, NVIDIA's hosted embedding endpoint has no documented
    low per-minute token cap, so this adapter optimizes for throughput instead
    of a conservative token-bucket: batches are fanned out across a thread
    pool so many requests are in flight at once. The model's 32k-token context
    also means overlong documents can be truncated server-side (``truncate``)
    rather than split and recombined like the OpenAI adapter.
    """

    def __init__(self, model: str) -> None:
        from openai import OpenAI

        self.model = model
        self.client = OpenAI(
            api_key=os.getenv("NVIDIA_API_KEY"),
            base_url=os.getenv("NVIDIA_API_BASE_URL", "https://integrate.api.nvidia.com/v1"),
            max_retries=0,
        )
        # Corpus documents are embedded as retrieval passages, not queries.
        self.input_type = os.getenv("NVIDIA_EMBEDDING_INPUT_TYPE", "passage")
        self.truncate = os.getenv("NVIDIA_EMBEDDING_TRUNCATE", "END")
        self.batch_size = max(1, int(os.getenv("NVIDIA_EMBEDDING_BATCH_SIZE", "64")))
        self.max_concurrency = max(1, int(os.getenv("NVIDIA_EMBEDDING_MAX_CONCURRENCY", "8")))
        self.max_retries = max(0, int(os.getenv("NVIDIA_EMBEDDING_MAX_RETRIES", "6")))

    def _request_with_backoff(self, batch: list[str]):
        from openai import APIStatusError

        delay = 1.0
        max_retries = getattr(self, "max_retries", 6)
        for attempt in range(max_retries + 1):
            try:
                return self.client.embeddings.create(
                    model=self.model,
                    input=batch,
                    extra_body={
                        "input_type": getattr(self, "input_type", "passage"),
                        "truncate": getattr(self, "truncate", "END"),
                    },
                )
            except APIStatusError as exc:
                retryable = exc.status_code == 429 or exc.status_code >= 500
                if attempt == max_retries or not retryable:
                    raise
                time.sleep(min(30.0, delay * (1.0 + random.random())))
                delay = min(30.0, delay * 2.0)
        raise AssertionError("unreachable")

    def encode(
        self,
        docs: list[str],
        batch_size: int | None = None,
        show_progress_bar: bool = False,
        convert_to_numpy: bool = True,
        normalize_embeddings: bool = True,
        progress: Callable[[int, int], None] | None = None,
        **_: object,
    ) -> np.ndarray:
        """Embed texts with many batches in flight at once for max throughput."""
        if not docs:
            return np.empty((0, 0), dtype="float32")

        batch_size = batch_size or getattr(self, "batch_size", 64)
        batches = [
            (start, docs[start:start + batch_size])
            for start in range(0, len(docs), batch_size)
        ]
        results: list[np.ndarray | None] = [None] * len(docs)
        completed = 0
        lock = threading.Lock()

        def _run(start: int, batch: list[str]):
            return start, self._request_with_backoff(batch).data

        max_workers = min(getattr(self, "max_concurrency", 8), len(batches)) or 1
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = [pool.submit(_run, start, batch) for start, batch in batches]
            for future in as_completed(futures):
                start, items = future.result()
                for item in items:
                    results[start + item.index] = np.asarray(item.embedding, dtype="float32")
                with lock:
                    completed += len(items)
                    if progress is not None:
                        progress(completed, len(docs))

        embeddings = np.vstack(results).astype("float32")
        if normalize_embeddings and len(embeddings):
            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            embeddings = embeddings / np.maximum(norms, np.finfo("float32").eps)
        return embeddings


@functools.lru_cache(maxsize=4)
def get_embedder(model_key: str):
    """Load and cache the configured embedding provider."""

    if model_key not in config.EMBEDDING_MODELS:
        raise ValueError(
            f"Unknown model {model_key!r}. Options: {list(config.EMBEDDING_MODELS)}"
        )
    if model_key == "openai":
        if not os.getenv("OPENAI_API_KEY"):
            raise RuntimeError(
                "OPENAI_API_KEY is required for the OpenAI embedding provider. "
                "Set it in your environment or .env file."
            )
        return OpenAIEmbedder(config.EMBEDDING_MODELS[model_key])
    if model_key == "nvidia":
        if not os.getenv("NVIDIA_API_KEY"):
            raise RuntimeError(
                "NVIDIA_API_KEY is required for the NVIDIA embedding provider. "
                "Set it in your environment or .env file (get a key at build.nvidia.com)."
            )
        return NvidiaEmbedder(config.EMBEDDING_MODELS[model_key])

    import torch
    from sentence_transformers import SentenceTransformer
    device = "cuda" if torch.cuda.is_available() else "cpu"
    return SentenceTransformer(config.EMBEDDING_MODELS[model_key], device=device)


def project_2d(embeddings: np.ndarray, n_neighbors: int = 15) -> np.ndarray:
    """Project embeddings to 2D with UMAP for the document map (CPU, seeded)."""
    from umap import UMAP

    reducer = UMAP(
        n_neighbors=n_neighbors, n_components=2, min_dist=0.1,
        metric="cosine", random_state=config.SEED,
    )
    return reducer.fit_transform(embeddings).astype("float32")


def _cache_path(model_key: str, docs: list[str]):
    h = hashlib.sha1()
    h.update(model_key.encode())
    h.update(str(len(docs)).encode())
    for d in docs:
        h.update(d.encode("utf-8", "ignore"))
        h.update(b"\x00")
    return config.EMBED_CACHE_DIR / f"{model_key}_{h.hexdigest()[:16]}.npy"


def embed_documents(
    docs: list[str],
    model_key: str = config.DEFAULT_EMBEDDING_MODEL,
    batch_size: int = 128,
    use_cache: bool = True,
    progress: Callable[[int, int], None] | None = None,
) -> np.ndarray:
    """Return a (n_docs, dim) embedding matrix, using the disk cache when possible."""
    path = _cache_path(model_key, docs)
    if use_cache and path.exists():
        return np.load(path)

    model = get_embedder(model_key)
    encode_kwargs = dict(
        batch_size=batch_size,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    if isinstance(model, (OpenAIEmbedder, NvidiaEmbedder)):
        encode_kwargs["progress"] = progress
    emb = model.encode(docs, **encode_kwargs)
    if use_cache:
        np.save(path, emb)
    return emb
