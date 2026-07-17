import numpy as np
import pytest

from kdx_server import search


class FakeEmbedder:
    def encode(self, texts, **kwargs):
        return np.array([[1.0, 0.0]])


def test_search_ranking(fake_artifacts, monkeypatch):
    monkeypatch.setattr(search, "_topic_vectors", lambda *args: ([0, 1], np.array([[1.0, 0.0], [0.0, 1.0]])))
    monkeypatch.setattr(search.embed, "get_embedder", lambda model: FakeEmbedder())
    result = search.rank("demo", "minilm", "question")
    assert result["best_topic_id"] == 0
    assert result["results"][0]["match"] == pytest.approx(100.0)
    assert result["results"][0]["samples"]
