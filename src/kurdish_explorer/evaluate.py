"""Topic-quality evaluation via NPMI coherence.

Uses gensim's CoherenceModel (``c_npmi``), the same measure reported by
Medvecki et al. (2024), so BERTopic, LDA, and NMF are compared on one metric.
"""
from __future__ import annotations

import re

from . import config


_TOKEN_RE = re.compile(config.TOKEN_PATTERN)


def topic_diversity(topics: list[list[str]]) -> float:
    """Fraction of unique words across all topics' keyword lists (1.0 = all distinct)."""
    words = [w for t in topics for w in t]
    return len(set(words)) / len(words) if words else float("nan")


def tokenize(docs) -> list[list[str]]:
    """Lightweight tokenization matching the vectorizer's token pattern."""
    return [_TOKEN_RE.findall(d.lower()) for d in docs]


def npmi_coherence(topics: list[list[str]], tokenized_docs: list[list[str]]) -> float:
    """Mean NPMI coherence for a set of topics (list of word lists)."""
    from gensim.corpora import Dictionary
    from gensim.models.coherencemodel import CoherenceModel

    dictionary = Dictionary(tokenized_docs)
    vocab = set(dictionary.token2id)
    # Keep only words gensim knows about; drop topics left with <2 words.
    filtered = [[w for w in t if w in vocab] for t in topics]
    filtered = [t for t in filtered if len(t) >= 2]
    if not filtered:
        return float("nan")
    cm = CoherenceModel(
        topics=filtered,
        texts=tokenized_docs,
        dictionary=dictionary,
        coherence="c_npmi",
    )
    return float(cm.get_coherence())


def evaluate_models(model_topics: dict[str, list[list[str]]], docs) -> dict[str, float]:
    """Return {model_name: mean_npmi} for each model's topic-word lists."""
    tokenized = tokenize(docs)
    return {name: npmi_coherence(topics, tokenized) for name, topics in model_topics.items()}
