from __future__ import annotations

import json
import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from kurdish_explorer import config, embed, pipeline
from ..runcache import load, run_dir
from ..tree import build_tree

router = APIRouter(prefix="/runs/{source}/{model}", tags=["runs"])


def _clean(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _clean(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_clean(item) for item in value]
    if hasattr(value, "item"):
        value = value.item()
    if value is pd.NA or (isinstance(value, float) and not math.isfinite(value)):
        return None
    return value


@router.get("")
def run_header(source: str, model: str) -> dict:
    return _clean(load(source, model)["meta"])


@router.get("/tree")
def run_tree(source: str, model: str, depth: int = Query(-1, le=64)) -> dict:
    artifact = load(source, model)
    return build_tree(
        artifact["hierarchy"], artifact["documents"], bool(artifact["meta"].get("has_labels")), depth
    )


@router.get("/topics")
def topics(source: str, model: str) -> dict:
    artifact = load(source, model)
    frame = artifact["topic_info"]
    frame = frame[frame["Topic"] != -1][["Topic", "Count", "Name"]].sort_values("Count", ascending=False)
    return {"topics": _clean(frame.rename(columns=str.lower).to_dict("records"))}


@router.get("/topics/{topic_id}")
def topic(
    source: str,
    model: str,
    topic_id: int,
    n_samples: int = Query(12, ge=1, le=50),
    category: str | None = None,
) -> dict:
    artifact = load(source, model)
    docs = artifact["documents"]
    subset = docs[docs["topic"] == topic_id]
    if subset.empty or str(topic_id) not in artifact["topic_words"]:
        raise HTTPException(404, f"Topic {topic_id} was not found")
    if category and category != "(all)" and "label" in subset:
        subset = subset[subset["label"] == category]
    columns = [name for name in ("text", "text_en", "label") if name in subset]
    return {
        "topic_id": topic_id,
        "count": int(len(subset)),
        "keywords": [
            {"word": word, "score": float(score)}
            for word, score in artifact["topic_words"].get(str(topic_id), [])
        ],
        "samples": _clean(subset[columns].head(n_samples).to_dict("records")),
    }


@router.get("/points")
def points(
    source: str,
    model: str,
    max_points: int = Query(12_000, ge=2_000, le=40_000),
    category: str | None = None,
) -> dict:
    artifact = load(source, model)
    docs = artifact["documents"]
    if not {"x", "y", "topic"}.issubset(docs.columns):
        raise HTTPException(404, "This run has no 2D coordinates")
    frame = docs[docs["topic"] != -1]
    if category and category != "(all)" and "label" in frame:
        frame = frame[frame["label"] == category]
    total = len(frame)
    if total > max_points:
        frame = frame.sample(max_points, random_state=config.SEED)
    words = {
        int(topic_id): " ".join(word for word, _ in values[:4])
        for topic_id, values in artifact["topic_words"].items()
        if int(topic_id) != -1
    }
    result = {
        "x": [float(value) for value in frame["x"]],
        "y": [float(value) for value in frame["y"]],
        "topic": [int(value) for value in frame["topic"]],
        "keywords": [words.get(int(value), "") for value in frame["topic"]],
        "text": [str(value)[:120] for value in frame["text"]],
        "shown": int(len(frame)),
        "total": int(total),
    }
    if "label" in frame:
        result["label"] = _clean(frame["label"].tolist())
    return result


@router.get("/distribution")
def distribution(source: str, model: str) -> dict:
    artifact = load(source, model)
    docs = artifact["documents"]
    labeled = "label" in docs and docs["label"].notna().any()
    if labeled:
        counts = (
            docs[(docs["topic"] != -1) & docs["label"].notna()]
            .groupby(["topic", "label"]).size().unstack(fill_value=0).sort_index()
        )
        shares = counts.div(counts.sum(axis=1), axis=0).mul(100)
        return {
            "kind": "heatmap",
            "topics": [str(value) for value in counts.index],
            "categories": [str(value) for value in counts.columns],
            "counts": counts.astype(int).values.tolist(),
            "shares": shares.values.tolist(),
        }
    sizes = docs[docs["topic"] != -1].groupby("topic").size().nlargest(25)
    return {"kind": "bar", "topics": [str(value) for value in sizes.index], "counts": sizes.astype(int).tolist()}


@router.get("/coherence")
def coherence(source: str, model: str) -> dict:
    current = run_dir(source, model) / "coherence.json"
    scores = json.loads(current.read_text(encoding="utf-8")) if current.exists() else {}
    comparisons = []
    for model_key in pipeline.runs_by_source().get(source, []):
        if model_key not in config.EMBEDDING_MODELS:
            continue
        meta = pipeline.run_meta(pipeline.run_key(source, model_key))
        score = meta.get("coherence_npmi", {}).get("BERTopic")
        if score is not None:
            comparisons.append({
                "model": model_key,
                "label": config.EMBEDDING_MODEL_LABELS.get(model_key, model_key),
                "npmi": float(score),
            })
    return {"scores": _clean(scores), "comparisons": comparisons}


@router.get("/baselines")
def baselines(source: str, model: str) -> dict:
    return {"baselines": _clean(load(source, model)["baseline_topics"])}


@router.get("/estimate")
def estimate(source: str, model: str) -> dict:
    try:
        artifact = load(source, model)
    except HTTPException as exc:
        if exc.status_code != 404:
            raise
        fitted = pipeline.runs_by_source().get(source, [])
        reference_model = next((key for key in fitted if key in config.EMBEDDING_MODELS), None)
        if reference_model is None:
            raise HTTPException(404, f"No reference corpus exists for {source}") from exc
        artifact = load(source, reference_model)
    texts = artifact["documents"]["text"].astype(str).tolist()
    response: dict[str, Any] = {"n_docs": len(texts), "model": model}
    if model == "openai":
        adapter = embed.get_embedder("openai")
        tokens = int(adapter.estimate_tokens(texts))
        safe_tpm = int(adapter.token_budget)
        response.update({"estimated_tokens": tokens, "safe_tpm": safe_tpm, "minimum_minutes": tokens / safe_tpm})
    return response
