"""KLPT-based normalization and Kurdish-aware vectorization.

Two roles:
1. Normalize Sorani text (encoding/orthography unification) with KLPT.
2. Build a scikit-learn ``CountVectorizer`` that strips Sorani stopwords, used
   both for BERTopic's c-TF-IDF representation and for the LDA/NMF baselines.

KLPT objects are created lazily and cached, since constructing them loads data
files and is relatively expensive.
"""
from __future__ import annotations

import functools
import json
import os
from typing import Iterable

from sklearn.feature_extraction.text import CountVectorizer

from . import config


@functools.lru_cache(maxsize=1)
def _preprocessor():
    from klpt.preprocess import Preprocess

    return Preprocess("Sorani", "Arabic", numeral="Latin")


@functools.lru_cache(maxsize=1)
def sorani_stopwords() -> frozenset[str]:
    """Sorani (Arabic-script) stopword list shipped with KLPT."""
    import klpt

    path = os.path.join(os.path.dirname(klpt.__file__), "data", "stopwords.json")
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    words = data.get("Sorani", {}).get("Arabic", []) or []
    return frozenset(words)


def normalize(text: str) -> str:
    """Normalize and standardize a single Sorani string via KLPT."""
    if not text:
        return ""
    pre = _preprocessor()
    return pre.standardize(pre.normalize(text))


def normalize_many(texts: Iterable[str]) -> list[str]:
    return [normalize(t or "") for t in texts]


def build_vectorizer(kind: str = "ctfidf", **overrides) -> CountVectorizer:
    """Kurdish CountVectorizer with Sorani stopwords removed.

    kind="ctfidf"   -> for BERTopic's per-topic c-TF-IDF (tiny min_df, no max_df)
    kind="baseline" -> for LDA/NMF over the full document set (corpus df pruning)
    """
    base = config.CTFIDF_VECTORIZER_PARAMS if kind == "ctfidf" else config.BASELINE_VECTORIZER_PARAMS
    params = dict(base)
    params.update(overrides)
    return CountVectorizer(stop_words=list(sorani_stopwords()), **params)
