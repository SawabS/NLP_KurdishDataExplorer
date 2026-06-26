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
