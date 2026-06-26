"""BERTopic model construction and fitting.

Wires together the components from Medvecki et al. (2024): sentence-transformer
embeddings -> UMAP -> HDBSCAN -> Kurdish c-TF-IDF, with Sorani stopwords removed
so topic keywords are content words rather than function words.
"""
from __future__ import annotations

import numpy as np

from . import config
from .preprocess import build_vectorizer


def build_bertopic(embedding_model=None, hdbscan_overrides: dict | None = None):
    """Construct a configured (unfitted) BERTopic model."""
    from bertopic import BERTopic
    from bertopic.representation import MaximalMarginalRelevance
    from bertopic.vectorizers import ClassTfidfTransformer
    from hdbscan import HDBSCAN
    from umap import UMAP

    hdbscan_params = dict(config.HDBSCAN_PARAMS)
    if hdbscan_overrides:
        hdbscan_params.update(hdbscan_overrides)

    umap_model = UMAP(random_state=config.SEED, **config.UMAP_PARAMS)
    hdbscan_model = HDBSCAN(**hdbscan_params)
    vectorizer_model = build_vectorizer(kind="ctfidf")
    ctfidf_model = ClassTfidfTransformer(reduce_frequent_words=True)
    # MMR diversifies keywords so topics read as distinct content words.
    representation_model = MaximalMarginalRelevance(diversity=0.3)

    return BERTopic(
        embedding_model=embedding_model,
        umap_model=umap_model,
        hdbscan_model=hdbscan_model,
        vectorizer_model=vectorizer_model,
        ctfidf_model=ctfidf_model,
        representation_model=representation_model,
        top_n_words=config.TOP_N_WORDS,
        calculate_probabilities=False,
        verbose=False,
    )


def fit_bertopic(
    docs: list[str],
    embeddings: np.ndarray,
    embedding_model=None,
    hdbscan_overrides: dict | None = None,
    reduce_outliers: bool = True,
):
    """Fit BERTopic on precomputed embeddings.

    With ``reduce_outliers`` the HDBSCAN ``-1`` documents are reassigned to their
    nearest topic (via c-TF-IDF), which matters for an explorer where large
    "uncategorized" buckets are poor UX.

    Returns ``(model, topics)`` where ``topics`` is the per-document topic id.
    """
    model = build_bertopic(embedding_model=embedding_model, hdbscan_overrides=hdbscan_overrides)
    topics, _ = model.fit_transform(docs, embeddings=embeddings)
    if reduce_outliers and (np.asarray(topics) == -1).any():
        new_topics = model.reduce_outliers(docs, topics, strategy="c-tf-idf")
        model.update_topics(docs, topics=new_topics, vectorizer_model=build_vectorizer(kind="ctfidf"))
        topics = new_topics
    return model, topics


def topic_words(model, top_n: int = config.TOP_N_WORDS) -> dict[int, list[tuple[str, float]]]:
    """Map each (non-outlier) topic id to its top (word, score) pairs."""
    out: dict[int, list[tuple[str, float]]] = {}
    for tid in model.get_topics():
        if tid == -1:
            continue
        out[int(tid)] = [(w, float(s)) for w, s in model.get_topic(tid)[:top_n]]
    return out


# ---------------------------------------------------------------------------
# Hierarchical topics (the drill-down tree)
# ---------------------------------------------------------------------------
def hierarchy_nodes(model, docs: list[str], topic_info) -> list[dict]:
    """Compute BERTopic's topic hierarchy and flatten it into tree nodes.

    BERTopic merges topics pairwise by c-TF-IDF distance, producing a binary
    tree: each *internal* node is a merge of two children, each *leaf* is an
    original topic. We convert that into a parent/child node table the app can
    render as an icicle / treemap / sunburst (Plotly ``branchvalues="total"``),
    so a user can start at a broad cluster and drill down into ever more
    specific sub-topics.

    Each node carries its document ``count`` (leaf = topic size; internal =
    sum of descendant leaf sizes), a readable ``label`` (top keywords), and a
    ``topic_id`` for leaves so the app can pull example documents.
    """
    hier = model.hierarchical_topics(docs)
    counts = {int(t): int(c) for t, c in zip(topic_info["Topic"], topic_info["Count"])}

    info: dict[int, dict] = {}
    child_to_parent: dict[int, int] = {}
    for _, row in hier.iterrows():
        p = int(row["Parent_ID"])
        cl, cr = int(row["Child_Left_ID"]), int(row["Child_Right_ID"])
        leaf_topics = [int(t) for t in row["Topics"]]
        info[p] = {"name": str(row["Parent_Name"]), "topics": leaf_topics}
        info.setdefault(cl, {"name": str(row["Child_Left_Name"]), "topics": None})
        info.setdefault(cr, {"name": str(row["Child_Right_Name"]), "topics": None})
        child_to_parent[cl] = p
        child_to_parent[cr] = p

    nodes: list[dict] = []
    for nid, meta in info.items():
        is_leaf = nid in counts
        if is_leaf:
            count = counts[nid]
        else:
            count = sum(counts.get(t, 0) for t in (meta["topics"] or []))
        parent = child_to_parent.get(nid)
        nodes.append({
            "id": str(nid),
            "parent": "" if parent is None else str(parent),
            "label": _short_label(meta["name"]),
            "full_label": meta["name"],
            "count": count,
            "is_leaf": is_leaf,
            "topic_id": nid if is_leaf else None,
        })
    return nodes


def _short_label(name: str, max_words: int = 4) -> str:
    """Trim a BERTopic node name ('12_word_word_word') to a few readable words."""
    parts = [p for p in str(name).replace("_", " ").split() if not p.isdigit()]
    return " · ".join(parts[:max_words]) if parts else str(name)
