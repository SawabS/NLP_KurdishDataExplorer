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


def available_model_options(source: str, available_runs: dict[str, list[str]] | None = None) -> list[tuple[str, str]]:
    """Return UI-ready model labels for a source, marking unfitted models explicitly."""
    run_keys = set((available_runs or runs_by_source()).get(source, []))
    options: list[tuple[str, str]] = []
    for model_key in config.EMBEDDING_MODELS:
        label = config.EMBEDDING_MODEL_LABELS.get(model_key, model_key)
        if model_key not in run_keys:
            label = f"{label} — fit required"
        options.append((label, model_key))
    return options


def fitted_model_options(source: str, available_runs: dict[str, list[str]] | None = None) -> list[tuple[str, str]]:
    """Return UI-ready model labels for fitted artifacts only."""
    run_keys = set((available_runs or runs_by_source()).get(source, []))
    return [
        (config.EMBEDDING_MODEL_LABELS.get(model_key, model_key), model_key)
        for model_key in config.EMBEDDING_MODELS
        if model_key in run_keys
    ]


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
    """Fit the full pipeline for one (built-in source, embedding model).

    Parameters
    ----------
    source        : "kndh" or "asosoft".
    model_key     : embedding model registry key (see config.EMBEDDING_MODELS).
    max_docs      : optional subsample size (random, seeded) for quick runs.
    normalize     : run KLPT normalization on the text (use for un-preprocessed
                    sources such as AsoSoft; KNDH ships a preprocessed column).
    with_baselines: also fit LDA + NMF and compare NPMI coherence.
    """
    df = data.load_corpus(source)
    if max_docs is not None and len(df) > max_docs:
        df = df.sample(max_docs, random_state=config.SEED).reset_index(drop=True)
    if normalize:
        df = df.assign(text=preprocess.normalize_many(df["text"].tolist()))
    return run_on_dataframe(
        df, source=source, model_key=model_key,
        with_baselines=with_baselines, min_cluster_size=min_cluster_size,
        normalized=normalize,
    )


def run_on_texts(
    texts: list[str],
    title: str,
    run_id: str | None = None,
    labels: list[str] | None = None,
    model_key: str = config.DEFAULT_EMBEDDING_MODEL,
    normalize: bool = False,
    with_baselines: bool = False,
    min_cluster_size: int | None = None,
    progress=None,
) -> PipelineResult:
    """Fit the pipeline on an arbitrary list of texts (uploads / any source).

    This is the generic engine entry point. ``title`` is a human-readable name
    for the source (e.g. an uploaded file name or a dataset column); ``run_id``
    is the sanitized key used on disk (defaults to a slug of ``title``).
    """
    import pandas as pd

    run_id = run_id or _slugify(title)
    if normalize:
        texts = preprocess.normalize_many(texts)
    df = pd.DataFrame({
        "doc_id": range(len(texts)),
        "source": run_id,
        "text": pd.Series(texts, dtype="string"),
        "label": pd.Series(labels if labels is not None else [pd.NA] * len(texts), dtype="string"),
    }).dropna(subset=["text"]).reset_index(drop=True)
    return run_on_dataframe(
        df, source=run_id, model_key=model_key,
        with_baselines=with_baselines, min_cluster_size=min_cluster_size,
        normalized=normalize, title=title, progress=progress,
    )


def run_on_dataframe(
    df,
    source: str,
    model_key: str = config.DEFAULT_EMBEDDING_MODEL,
    with_baselines: bool = True,
    min_cluster_size: int | None = None,
    normalized: bool = False,
    title: str | None = None,
    progress=None,
) -> PipelineResult:
    """Core pipeline over a unified-schema DataFrame (doc_id, source, text, label[, text_en]).

    Writes lightweight artifacts under ``artifacts/<source>__<model>/`` that the
    Streamlit app loads without re-fitting: topic table, per-doc topics + 2D map
    coordinates, per-topic keywords, the drill-down hierarchy, baselines, and meta.
    """
    def _say(msg: str) -> None:
        if progress is not None:
            progress(msg)

    t0 = time.time()
    docs = df["text"].astype(str).tolist()

    # --- Embeddings + BERTopic ---
    _say(f"Embedding {len(docs):,} documents…")
    embeddings = embed.embed_documents(
        docs,
        model_key=model_key,
        progress=lambda done, total: _say(
            f"Embedding {len(docs):,} documents… ({done:,}/{total:,} API chunks)"
        ),
    )
    embedder = embed.get_embedder(model_key)
    # Per-model fit overrides (e.g. leaf selection for the anisotropic KDX
    # space); an explicit min_cluster_size from the caller wins over them.
    model_overrides = config.MODEL_FIT_OVERRIDES.get(model_key, {})
    hdbscan_overrides = dict(model_overrides.get("hdbscan", {}))
    if min_cluster_size:
        hdbscan_overrides["min_cluster_size"] = min_cluster_size
    umap_overrides = model_overrides.get("umap") or None
    _say("Clustering into topics (UMAP → HDBSCAN → c-TF-IDF)…")
    bt_model, bt_topics = topics.fit_bertopic(
        docs, embeddings, embedding_model=embedder,
        hdbscan_overrides=hdbscan_overrides or None,
        umap_overrides=umap_overrides,
    )
    _say("Projecting documents to 2D map…")
    coords = embed.project_2d(embeddings)
    df = df.assign(topic=bt_topics, x=coords[:, 0], y=coords[:, 1])

    bt_topic_words = topics.topic_words(bt_model)
    info = bt_model.get_topic_info()

    # --- Hierarchy (drill-down tree) ---
    _say("Building topic hierarchy…")
    try:
        hierarchy = topics.hierarchy_nodes(bt_model, docs, info)
    except Exception as exc:  # hierarchy is optional; never fail the whole run
        hierarchy = []
        _say(f"(hierarchy skipped: {exc})")

    # --- Coherence comparison ---
    model_topics = {"BERTopic": [[w for w, _ in ws] for ws in bt_topic_words.values()]}
    baseline_objs = {}
    if with_baselines:
        _say("Fitting LDA / NMF baselines…")
        lda = baselines.fit_lda(docs)
        nmf = baselines.fit_nmf(docs)
        baseline_objs = {"LDA": lda, "NMF": nmf}
        model_topics["LDA"] = lda.topics
        model_topics["NMF"] = nmf.topics

    _say("Scoring topic coherence…")
    coherence = evaluate.evaluate_models(model_topics, docs)

    # --- Persist artifacts ---
    out = artifact_dir(source, model_key)
    info.to_parquet(out / "topic_info.parquet", index=False)
    df.to_parquet(out / "documents.parquet", index=False)
    (out / "topic_words.json").write_text(
        json.dumps({str(k): v for k, v in bt_topic_words.items()}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (out / "hierarchy.json").write_text(
        json.dumps(hierarchy, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    if baseline_objs:
        baseline_payload = {name: r.topics for name, r in baseline_objs.items()}
        (out / "baseline_topics.json").write_text(
            json.dumps(baseline_payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    (out / "coherence.json").write_text(json.dumps(coherence, indent=2), encoding="utf-8")

    n_topics = int((info["Topic"] != -1).sum())
    has_labels = bool(df["label"].notna().any()) if "label" in df.columns else False
    meta = {
        "source": source,
        "title": title or _SOURCE_TITLES.get(source, source),
        "model_key": model_key,
        "model_name": config.EMBEDDING_MODELS[model_key],
        "n_docs": len(df),
        "n_topics": n_topics,
        "n_outliers": int((df["topic"] == -1).sum()),
        "coherence_npmi": coherence,
        "normalized": normalized,
        "has_labels": has_labels,
        "has_hierarchy": bool(hierarchy),
        "seconds": round(time.time() - t0, 1),
        "categories": config.KNDH_CATEGORIES if source == "kndh" else None,
    }
    (out / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    return PipelineResult(source, model_key, len(df), n_topics, coherence, str(out))


_SOURCE_TITLES = {
    "kndh": "KNDH — Kurdish News Dataset Headlines (50k, labeled)",
    "asosoft": "AsoSoft Text Corpus (Small) — running Sorani text",
}


def _slugify(text: str) -> str:
    import re
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "upload"


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
    hierarchy_path = d / "hierarchy.json"
    hierarchy = (
        json.loads(hierarchy_path.read_text(encoding="utf-8")) if hierarchy_path.exists() else []
    )
    return {
        "meta": meta,
        "topic_info": pd.read_parquet(d / "topic_info.parquet"),
        "documents": pd.read_parquet(d / "documents.parquet"),
        "topic_words": topic_words,
        "baseline_topics": baseline_topics,
        "hierarchy": hierarchy,
    }


def runs_by_source() -> dict[str, list[str]]:
    """Group available run keys by source: {source: [model_key, ...]}."""
    out: dict[str, list[str]] = {}
    for key in list_runs():
        source, _, model = key.partition("__")
        out.setdefault(source, []).append(model)
    return out


def run_meta(run: str) -> dict:
    """Cheap read of just a run's meta.json (for source listings)."""
    p = config.ARTIFACTS_DIR / run / "meta.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
