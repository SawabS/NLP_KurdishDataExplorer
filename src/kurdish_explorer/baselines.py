"""Classical topic-model baselines: LDA and NMF.

Both use the same Kurdish CountVectorizer as BERTopic's c-TF-IDF stage so the
comparison is on equal preprocessing footing. NMF is fit on a TF-IDF transform
of the counts (standard practice); LDA is fit on raw counts.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from sklearn.decomposition import NMF, LatentDirichletAllocation
from sklearn.feature_extraction.text import TfidfTransformer

from . import config
from .preprocess import build_vectorizer


@dataclass
class BaselineResult:
    name: str
    topics: list[list[str]]                 # top words per topic
    doc_topic: np.ndarray                   # (n_docs,) hard topic assignment
    feature_names: list[str] = field(default_factory=list)


def _top_words(components: np.ndarray, feature_names, top_n: int) -> list[list[str]]:
    topics = []
    for comp in components:
        idx = np.argsort(comp)[::-1][:top_n]
        topics.append([feature_names[i] for i in idx])
    return topics


def fit_lda(docs, n_topics: int = config.N_BASELINE_TOPICS, top_n: int = config.TOP_N_WORDS):
    vec = build_vectorizer(kind="baseline")
    X = vec.fit_transform(docs)
    feature_names = vec.get_feature_names_out().tolist()
    lda = LatentDirichletAllocation(
        n_components=n_topics, random_state=config.SEED, learning_method="online"
    )
    doc_topic = lda.fit_transform(X)
    return BaselineResult(
        name="LDA",
        topics=_top_words(lda.components_, feature_names, top_n),
        doc_topic=doc_topic.argmax(axis=1),
        feature_names=feature_names,
    )


def fit_nmf(docs, n_topics: int = config.N_BASELINE_TOPICS, top_n: int = config.TOP_N_WORDS):
    vec = build_vectorizer(kind="baseline")
    counts = vec.fit_transform(docs)
    feature_names = vec.get_feature_names_out().tolist()
    X = TfidfTransformer().fit_transform(counts)
    nmf = NMF(n_components=n_topics, random_state=config.SEED, init="nndsvda", max_iter=400)
    doc_topic = nmf.fit_transform(X)
    return BaselineResult(
        name="NMF",
        topics=_top_words(nmf.components_, feature_names, top_n),
        doc_topic=doc_topic.argmax(axis=1),
        feature_names=feature_names,
    )
