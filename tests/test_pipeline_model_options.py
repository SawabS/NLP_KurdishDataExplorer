import sys
from pathlib import Path
from types import SimpleNamespace

import httpx
import numpy as np
from openai import APIConnectionError
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from kurdish_explorer import config
from kurdish_explorer.embed import NvidiaEmbedder, OpenAIEmbedder
from kurdish_explorer.pipeline import available_model_options, fitted_model_options


def test_available_model_options_includes_all_configured_models() -> None:
    options = available_model_options("kndh", {"kndh": ["minilm"]})

    labels = [label for label, _ in options]
    keys = [key for _, key in options]

    assert keys == list(config.EMBEDDING_MODELS)
    assert any("fit required" in label for label in labels)
    assert any(key == "kdx-minilm-tsdae" for key in keys)


def test_fitted_model_options_only_includes_precomputed_runs() -> None:
    options = fitted_model_options("kndh", {"kndh": ["minilm", "mpnet"]})

    # mpnet is fitted on disk but no longer registered, so only minilm shows.
    assert options == [
        (config.EMBEDDING_MODEL_LABELS["minilm"], "minilm"),
    ]


def test_default_model_uses_openai_when_key_is_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("KDX_EMBEDDING_PROVIDER", raising=False)
    monkeypatch.delenv("NVIDIA_API_KEY", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    assert config.default_model_key() == "openai"


def test_default_model_uses_nvidia_when_key_is_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("KDX_EMBEDDING_PROVIDER", raising=False)
    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")

    assert config.default_model_key() == "nvidia"


def test_default_model_prefers_nvidia_over_openai_when_both_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("KDX_EMBEDDING_PROVIDER", raising=False)
    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    assert config.default_model_key() == "nvidia"


def test_default_model_rejects_unknown_explicit_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("KDX_EMBEDDING_PROVIDER", "not-a-provider")

    with pytest.raises(ValueError, match="KDX_EMBEDDING_PROVIDER"):
        config.default_model_key()


def test_openai_embedder_batches_orders_and_normalizes_responses() -> None:
    calls: list[list[list[int]]] = []

    class FakeEncoding:
        def encode(self, text: str, disallowed_special=()):
            return [ord(char) for char in text]

    class FakeEmbeddings:
        def create(self, model: str, input: list[list[int]]):
            calls.append(input)
            return SimpleNamespace(data=[
                SimpleNamespace(index=1, embedding=[0.0, 4.0]),
                SimpleNamespace(index=0, embedding=[3.0, 0.0]),
            ])

    embedder = OpenAIEmbedder.__new__(OpenAIEmbedder)
    embedder.model = "test-model"
    embedder.encoding = FakeEncoding()
    embedder.client = SimpleNamespace(embeddings=FakeEmbeddings())

    vectors = embedder.encode(["first", "second"], batch_size=2)

    assert calls == [[
        [ord(char) for char in "first"],
        [ord(char) for char in "second"],
    ]]
    np.testing.assert_allclose(vectors, [[1.0, 0.0], [0.0, 1.0]])


def test_openai_embedder_splits_long_docs_and_respects_token_budget() -> None:
    calls: list[list[list[int]]] = []
    progress: list[tuple[int, int]] = []

    class FakeEncoding:
        def encode(self, text: str, disallowed_special=()):
            return [ord(char) for char in text]

    class FakeEmbeddings:
        def create(self, model: str, input: list[list[int]]):
            calls.append(input)
            return SimpleNamespace(data=[
                SimpleNamespace(index=index, embedding=[3.0, 4.0])
                for index in range(len(input))
            ])

    embedder = OpenAIEmbedder.__new__(OpenAIEmbedder)
    embedder.model = "test-model"
    embedder.encoding = FakeEncoding()
    embedder.client = SimpleNamespace(embeddings=FakeEmbeddings())
    embedder.tpm_limit = 1_000_000
    embedder.token_budget = 900_000
    embedder.max_batch_tokens = 5
    embedder.max_input_tokens = 4
    embedder.max_retries = 0

    vectors = embedder.encode(
        ["abcdefgh", "xy"], batch_size=128,
        normalize_embeddings=False,
        progress=lambda done, total: progress.append((done, total)),
    )

    assert all(sum(map(len, batch)) <= 5 for batch in calls)
    assert all(len(item) <= 4 for batch in calls for item in batch)
    assert progress[-1] == (3, 3)
    np.testing.assert_allclose(vectors, [[3.0, 4.0], [3.0, 4.0]])


def test_openai_embedder_retries_transient_connection_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    attempts = 0

    class FakeRawEmbeddings:
        @property
        def with_raw_response(self):
            return self

        def create(self, model: str, input: list[list[int]]):
            nonlocal attempts
            attempts += 1
            if attempts == 1:
                raise APIConnectionError(
                    request=httpx.Request("POST", "https://api.openai.com/v1/embeddings")
                )
            parsed = SimpleNamespace(data=[SimpleNamespace(index=0, embedding=[1.0, 0.0])])
            return SimpleNamespace(headers={}, parse=lambda: parsed)

    class FakeLimiter:
        def __init__(self) -> None:
            self.waits = 0

        def wait_for(self, tokens: int) -> None:
            self.waits += 1

        def update_limit(self, token_budget: int) -> None:
            pass

    monkeypatch.setattr("kurdish_explorer.embed.time.sleep", lambda _: None)
    embedder = OpenAIEmbedder.__new__(OpenAIEmbedder)
    embedder.model = "test-model"
    embedder.client = SimpleNamespace(embeddings=FakeRawEmbeddings())
    embedder.max_retries = 1
    limiter = FakeLimiter()

    response = embedder._request_with_backoff([[1]], 1, limiter)

    assert response.data[0].embedding == [1.0, 0.0]
    assert attempts == 2
    assert limiter.waits == 2


def test_nvidia_embedder_batches_orders_and_normalizes_responses() -> None:
    calls: list[list[str]] = []

    class FakeEmbeddings:
        def create(self, model: str, input: list[str], extra_body: dict):
            calls.append(input)
            assert extra_body == {"input_type": "passage", "truncate": "END"}
            return SimpleNamespace(data=[
                SimpleNamespace(index=1, embedding=[0.0, 4.0]),
                SimpleNamespace(index=0, embedding=[3.0, 0.0]),
            ])

    embedder = NvidiaEmbedder.__new__(NvidiaEmbedder)
    embedder.model = "test-model"
    embedder.client = SimpleNamespace(embeddings=FakeEmbeddings())
    embedder.input_type = "passage"
    embedder.truncate = "END"
    embedder.batch_size = 2
    embedder.max_concurrency = 1
    embedder.max_retries = 0

    vectors = embedder.encode(["first", "second"])

    assert calls == [["first", "second"]]
    np.testing.assert_allclose(vectors, [[1.0, 0.0], [0.0, 1.0]])


def test_nvidia_embedder_dispatches_multiple_batches_and_reports_progress() -> None:
    calls: list[list[str]] = []
    progress: list[tuple[int, int]] = []

    class FakeEmbeddings:
        def create(self, model: str, input: list[str], extra_body: dict):
            calls.append(input)
            return SimpleNamespace(data=[
                SimpleNamespace(index=index, embedding=[1.0, 0.0])
                for index in range(len(input))
            ])

    embedder = NvidiaEmbedder.__new__(NvidiaEmbedder)
    embedder.model = "test-model"
    embedder.client = SimpleNamespace(embeddings=FakeEmbeddings())
    embedder.input_type = "passage"
    embedder.truncate = "END"
    embedder.batch_size = 1
    embedder.max_concurrency = 4
    embedder.max_retries = 0

    vectors = embedder.encode(
        ["a", "b", "c"],
        normalize_embeddings=False,
        progress=lambda done, total: progress.append((done, total)),
    )

    assert len(calls) == 3
    assert progress[-1] == (3, 3)
    np.testing.assert_allclose(vectors, [[1.0, 0.0], [1.0, 0.0], [1.0, 0.0]])
