from __future__ import annotations

import json
from pathlib import Path
import sys

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "src"))

from kurdish_explorer import config
from kdx_server import runcache


@pytest.fixture
def fake_artifacts(tmp_path, monkeypatch):
    artifacts = tmp_path / "artifacts"
    run = artifacts / "demo__minilm"
    run.mkdir(parents=True)
    docs = pd.DataFrame({
        "doc_id": range(8),
        "source": ["demo"] * 8,
        "text": [f"Sorani document {index}" for index in range(8)],
        "label": ["news", "sport", "news", "sport", "news", "sport", "news", "sport"],
        "topic": [0, 0, 0, 1, 1, 1, 1, -1],
        "x": [float(value) for value in range(8)],
        "y": [float(value * 2) for value in range(8)],
    })
    info = pd.DataFrame({"Topic": [-1, 0, 1], "Count": [1, 3, 4], "Name": ["outlier", "0_alpha_beta", "1_gamma_delta"]})
    meta = {
        "source": "demo", "title": "Demo corpus", "model_key": "minilm", "model_name": "minilm",
        "n_docs": 8, "n_topics": 2, "n_outliers": 1, "coherence_npmi": {"BERTopic": 0.2},
        "normalized": False, "has_labels": True, "has_hierarchy": True, "seconds": 1.2,
        "categories": ["news", "sport"],
    }
    hierarchy = [
        {"id": "2", "parent": "", "label": "root", "count": 7, "is_leaf": False, "topic_id": None},
        {"id": "0", "parent": "2", "label": "alpha", "count": 3, "is_leaf": True, "topic_id": 0},
        {"id": "1", "parent": "2", "label": "gamma", "count": 4, "is_leaf": True, "topic_id": 1},
    ]
    docs.to_parquet(run / "documents.parquet", index=False)
    info.to_parquet(run / "topic_info.parquet", index=False)
    (run / "meta.json").write_text(json.dumps(meta), encoding="utf-8")
    (run / "topic_words.json").write_text(json.dumps({"0": [["alpha", 0.5]], "1": [["gamma", 0.4]]}), encoding="utf-8")
    (run / "hierarchy.json").write_text(json.dumps(hierarchy), encoding="utf-8")
    (run / "coherence.json").write_text(json.dumps({"BERTopic": 0.2}), encoding="utf-8")
    (run / "baseline_topics.json").write_text(json.dumps({"LDA": [["alpha", "beta"]]}), encoding="utf-8")
    monkeypatch.setattr(config, "ARTIFACTS_DIR", artifacts)
    monkeypatch.setattr(config, "EMBED_CACHE_DIR", artifacts / "embeddings")
    runcache.clear()
    yield artifacts
    runcache.clear()
