from __future__ import annotations

import json
import os
import time

import pytest
from fastapi import HTTPException

from kurdish_explorer import pipeline
from kdx_server import runcache
from kdx_server.routers import runs, sources


def test_source_and_run_shapes(fake_artifacts):
    listing = sources.list_sources()
    assert listing[0]["source"] == "demo"
    assert listing[0]["n_docs"] == 8
    assert any(item["key"] == "minilm" and item["fitted"] for item in listing[0]["models"])
    assert runs.run_header("demo", "minilm")["n_topics"] == 2
    assert listing[0]["categories"] == ["news", "sport"]
    assert [item["topic"] for item in runs.topics("demo", "minilm")["topics"]] == [1, 0]


def test_points_sampling_cap_and_category(fake_artifacts):
    sampled = runs.points("demo", "minilm", max_points=3)
    assert sampled["shown"] == 3
    assert sampled["total"] == 7
    assert len(sampled["x"]) == len(sampled["topic"]) == 3
    filtered = runs.points("demo", "minilm", max_points=40, category="sport")
    assert filtered["total"] == 3
    assert set(filtered["label"]) == {"sport"}


def test_tree_values_and_depth(fake_artifacts):
    full = runs.run_tree("demo", "minilm", depth=-1)
    assert full["values"] == [7, 3, 4]
    assert full["branchvalues"] == "total"
    assert sum(value for value, kind in zip(full["values"], full["kinds"]) if kind == "topic") == full["values"][0]
    shallow = runs.run_tree("demo", "minilm", depth=1)
    assert shallow["ids"] == ["2"]


def test_topic_distribution_and_404(fake_artifacts):
    detail = runs.topic("demo", "minilm", 0, n_samples=2)
    assert detail["count"] == 3 and len(detail["samples"]) == 2
    distribution = runs.distribution("demo", "minilm")
    assert distribution["kind"] == "heatmap"
    assert distribution["categories"] == ["news", "sport"]
    with pytest.raises(HTTPException) as exc:
        runs.topic("demo", "minilm", 99)
    assert exc.value.status_code == 404
    with pytest.raises(HTTPException) as exc:
        runcache.load("missing", "minilm")
    assert exc.value.status_code == 404


def test_cache_invalidates_on_meta_mtime(fake_artifacts, monkeypatch):
    calls = 0
    original = pipeline.load_run

    def counted(run):
        nonlocal calls
        calls += 1
        return original(run)

    monkeypatch.setattr(pipeline, "load_run", counted)
    runcache.clear()
    runcache.load("demo", "minilm")
    runcache.load("demo", "minilm")
    assert calls == 1
    meta_path = fake_artifacts / "demo__minilm" / "meta.json"
    stat = meta_path.stat()
    os.utime(meta_path, ns=(stat.st_atime_ns, stat.st_mtime_ns + 1_000_000))
    runcache.load("demo", "minilm")
    assert calls == 2


def test_estimate_uses_fitted_reference_for_unfitted_model(fake_artifacts):
    estimate = runs.estimate("demo", "nvidia")
    assert estimate == {"n_docs": 8, "model": "nvidia"}


def test_high_cardinality_labels_are_not_source_categories(fake_artifacts):
    from kurdish_explorer import config
    import pandas as pd

    path = fake_artifacts / "demo__minilm" / "documents.parquet"
    frame = pd.read_parquet(path)
    frame = pd.concat([frame] * 14, ignore_index=True)
    frame["label"] = [f"label-{index}" for index in range(len(frame))]
    frame.to_parquet(path, index=False)
    meta_path = fake_artifacts / "demo__minilm" / "meta.json"
    import json
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    meta["categories"] = None
    meta_path.write_text(json.dumps(meta), encoding="utf-8")
    assert sources.list_sources()[0]["categories"] == []
