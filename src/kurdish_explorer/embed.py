"""Document embedding with on-disk caching.

Embeddings are the most expensive reusable artifact, so they are cached to
``artifacts/embeddings/`` keyed by (model, content hash). Re-running the
pipeline on the same documents and model reuses the cached vectors.
"""
from __future__ import annotations

import functools
import hashlib

import numpy as np

from . import config


@functools.lru_cache(maxsize=4)
def get_embedder(model_key: str):
    """Load (and cache) a SentenceTransformer by registry key, on GPU if available."""
    import torch
    from sentence_transformers import SentenceTransformer

    if model_key not in config.EMBEDDING_MODELS:
        raise ValueError(
            f"Unknown model {model_key!r}. Options: {list(config.EMBEDDING_MODELS)}"
        )
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
) -> np.ndarray:
    """Return a (n_docs, dim) embedding matrix, using the disk cache when possible."""
    path = _cache_path(model_key, docs)
    if use_cache and path.exists():
        return np.load(path)

    model = get_embedder(model_key)
    emb = model.encode(
        docs,
        batch_size=batch_size,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    if use_cache:
        np.save(path, emb)
    return emb
