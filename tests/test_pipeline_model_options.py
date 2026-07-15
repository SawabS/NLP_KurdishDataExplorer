import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from kurdish_explorer import config
from kurdish_explorer.embed import OpenAIEmbedder
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
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    assert config.default_model_key() == "openai"


def test_default_model_rejects_unknown_explicit_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("KDX_EMBEDDING_PROVIDER", "not-a-provider")

    with pytest.raises(ValueError, match="KDX_EMBEDDING_PROVIDER"):
        config.default_model_key()


def test_openai_embedder_batches_orders_and_normalizes_responses() -> None:
    calls: list[list[str]] = []

    class FakeEmbeddings:
        def create(self, model: str, input: list[str]):
            calls.append(input)
            return SimpleNamespace(data=[
                SimpleNamespace(index=1, embedding=[0.0, 4.0]),
                SimpleNamespace(index=0, embedding=[3.0, 0.0]),
            ])

    embedder = OpenAIEmbedder.__new__(OpenAIEmbedder)
    embedder.model = "test-model"
    embedder.client = SimpleNamespace(embeddings=FakeEmbeddings())

    vectors = embedder.encode(["first", "second"], batch_size=2)

    assert calls == [["first", "second"]]
    np.testing.assert_allclose(vectors, [[1.0, 0.0], [0.0, 1.0]])
