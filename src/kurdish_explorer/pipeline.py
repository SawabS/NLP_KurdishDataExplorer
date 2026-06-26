"""End-to-end pipeline: load -> normalize -> embed -> BERTopic + baselines -> evaluate -> save.

Artifacts are written under ``artifacts/<source>__<model>/`` as lightweight
tables/JSON the Streamlit app can load without re-fitting anything.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass

import pandas as pd

from . import baselines, config, data, embed, evaluate, preprocess, topics


def run_key(source: str, model_key: str) -> str:
    return f"{source}__{model_key}"


def artifact_dir(source: str, model_key: str):
    d = config.ARTIFACTS_DIR / run_key(source, model_key)
    d.mkdir(parents=True, exist_ok=True)
    return d


@dataclass
class PipelineResult:
    source: str
    model_key: str
    n_docs: int
    n_topics: int
    coherence: dict[str, float]
    artifact_dir: str


def run(
    source: str = "kndh",
    model_key: str = config.DEFAULT_EMBEDDING_MODEL,
    max_docs: int | None = None,
    normalize: bool = False,
    with_baselines: bool = True,
    min_cluster_size: int | None = None,
) -> PipelineResult:
    """Fit the full pipeline for one (source, embedding model) and save artifacts.

    Parameters
    ----------
    source        : "kndh" or "asosoft".
    model_key     : embedding model registry key (see config.EMBEDDING_MODELS).
    max_docs      : optional subsample size (random, seeded) for quick runs.
    normalize     : run KLPT normalization on the text (use for un-preprocessed
                    sources such as AsoSoft; KNDH ships a preprocessed column).
    with_baselines: also fit LDA + NMF and compare NPMI coherence.
    """
    t0 = time.time()
    df = data.load_corpus(source)
    if max_docs is not None and len(df) > max_docs:
        df = df.sample(max_docs, random_state=config.SEED).reset_index(drop=True)

    docs = df["text"].tolist()
    if normalize:
        docs = preprocess.normalize_many(docs)
        df = df.assign(text=docs)

    # --- Embeddings + BERTopic ---
    embeddings = embed.embed_documents(docs, model_key=model_key)
    embedder = embed.get_embedder(model_key)
    hdbscan_overrides = {"min_cluster_size": min_cluster_size} if min_cluster_size else None
    bt_model, bt_topics = topics.fit_bertopic(
        docs, embeddings, embedding_model=embedder, hdbscan_overrides=hdbscan_overrides
    )
    coords = embed.project_2d(embeddings)
    df = df.assign(topic=bt_topics, x=coords[:, 0], y=coords[:, 1])

    bt_topic_words = topics.topic_words(bt_model)
    info = bt_model.get_topic_info()

    # --- Coherence comparison ---
    model_topics = {"BERTopic": [[w for w, _ in ws] for ws in bt_topic_words.values()]}
    baseline_objs = {}
    if with_baselines:
        lda = baselines.fit_lda(docs)
        nmf = baselines.fit_nmf(docs)
        baseline_objs = {"LDA": lda, "NMF": nmf}
        model_topics["LDA"] = lda.topics
        model_topics["NMF"] = nmf.topics

    coherence = evaluate.evaluate_models(model_topics, docs)

    # --- Persist artifacts ---
    out = artifact_dir(source, model_key)
    info.to_parquet(out / "topic_info.parquet", index=False)
    df.to_parquet(out / "documents.parquet", index=False)
    (out / "topic_words.json").write_text(
        json.dumps({str(k): v for k, v in bt_topic_words.items()}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    if baseline_objs:
        baseline_payload = {name: r.topics for name, r in baseline_objs.items()}
        (out / "baseline_topics.json").write_text(
            json.dumps(baseline_payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    (out / "coherence.json").write_text(json.dumps(coherence, indent=2), encoding="utf-8")

    n_topics = int((info["Topic"] != -1).sum())
    meta = {
        "source": source,
        "model_key": model_key,
        "model_name": config.EMBEDDING_MODELS[model_key],
        "n_docs": len(df),
        "n_topics": n_topics,
        "n_outliers": int((df["topic"] == -1).sum()),
        "coherence_npmi": coherence,
        "normalized": normalize,
        "seconds": round(time.time() - t0, 1),
        "categories": config.KNDH_CATEGORIES if source == "kndh" else None,
    }
    (out / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    return PipelineResult(source, model_key, len(df), n_topics, coherence, str(out))


# ---------------------------------------------------------------------------
# Artifact loading (used by the Streamlit app)
# ---------------------------------------------------------------------------
def list_runs() -> list[str]:
    """Available fitted runs, by '<source>__<model>' key."""
    if not config.ARTIFACTS_DIR.exists():
        return []
    return sorted(
        p.name for p in config.ARTIFACTS_DIR.iterdir()
        if p.is_dir() and (p / "meta.json").exists()
    )


def load_run(run: str) -> dict:
    """Load all artifacts for a run key into a dict."""
    d = config.ARTIFACTS_DIR / run
    meta = json.loads((d / "meta.json").read_text(encoding="utf-8"))
    topic_words = json.loads((d / "topic_words.json").read_text(encoding="utf-8"))
    baseline_path = d / "baseline_topics.json"
    baseline_topics = (
        json.loads(baseline_path.read_text(encoding="utf-8")) if baseline_path.exists() else {}
    )
    return {
        "meta": meta,
        "topic_info": pd.read_parquet(d / "topic_info.parquet"),
        "documents": pd.read_parquet(d / "documents.parquet"),
        "topic_words": topic_words,
        "baseline_topics": baseline_topics,
    }
