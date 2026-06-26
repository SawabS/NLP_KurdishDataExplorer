#!/usr/bin/env python3
"""Tune BERTopic on the full KNDH corpus.

Sweeps HDBSCAN ``min_cluster_size`` (the main lever for topic granularity) over a
single, reused UMAP reduction, and reports for each config:

  - n_topics, outlier %
  - NPMI coherence (topic quality; compare against the NMF/LDA baselines)
  - NMI vs the 5 human KNDH categories (do topics recover real news domains?)

Writes the best config to ``artifacts/tuning_kndh_<model>.json``.

Run:  conda run -n ai python scripts/tune_bertopic.py --model minilm
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np
from sklearn.metrics import normalized_mutual_info_score

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from kurdish_explorer import config, data, embed, evaluate  # noqa: E402
from kurdish_explorer.preprocess import build_vectorizer  # noqa: E402


class _PrecomputedUMAP:
    """Passthrough 'reducer' that returns a precomputed UMAP embedding.

    Lets us run one expensive UMAP fit and reuse it across HDBSCAN settings.
    """

    def __init__(self, reduced: np.ndarray):
        self.reduced = reduced

    def fit(self, X, y=None):
        return self

    def fit_transform(self, X, y=None):
        return self.reduced

    def transform(self, X):
        return self.reduced[: len(X)]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="minilm", choices=list(config.EMBEDDING_MODELS))
    ap.add_argument("--max-docs", type=int, default=None, help="optional cap for a quick sweep")
    ap.add_argument(
        "--min-cluster-sizes", type=int, nargs="+", default=[50, 100, 150, 250, 400]
    )
    args = ap.parse_args()

    from bertopic import BERTopic
    from bertopic.representation import MaximalMarginalRelevance
    from bertopic.vectorizers import ClassTfidfTransformer
    from hdbscan import HDBSCAN
    from umap import UMAP

    df = data.load_kndh()
    if args.max_docs:
        df = df.sample(args.max_docs, random_state=config.SEED).reset_index(drop=True)
    docs = df["text"].tolist()
    labels = df["label"].tolist()
    print(f"Loaded {len(docs):,} KNDH docs")

    print("Embedding (cached)...")
    emb = embed.embed_documents(docs, model_key=args.model)

    print("Fitting shared UMAP once...")
    t = time.time()
    reduced = UMAP(random_state=config.SEED, **config.UMAP_PARAMS).fit_transform(emb)
    print(f"  UMAP done in {time.time()-t:.0f}s")

    tokenized = evaluate.tokenize(docs)  # reused for every coherence computation

    results = []
    for mcs in args.min_cluster_sizes:
        t = time.time()
        model = BERTopic(
            umap_model=_PrecomputedUMAP(reduced),
            hdbscan_model=HDBSCAN(min_cluster_size=mcs, metric="euclidean", prediction_data=True),
            vectorizer_model=build_vectorizer(kind="ctfidf"),
            ctfidf_model=ClassTfidfTransformer(reduce_frequent_words=True),
            representation_model=MaximalMarginalRelevance(diversity=0.3),
            top_n_words=config.TOP_N_WORDS,
            calculate_probabilities=False,
            verbose=False,
        )
        topics = np.asarray(model.fit_transform(docs, embeddings=emb)[0])

        tw = [[w for w, _ in model.get_topic(t)[:config.TOP_N_WORDS]] for t in model.get_topics() if t != -1]
        npmi = evaluate.npmi_coherence(tw, tokenized)
        diversity = evaluate.topic_diversity(tw)

        mask = topics != -1
        nmi = (
            normalized_mutual_info_score(np.asarray(labels)[mask], topics[mask])
            if mask.any() else float("nan")
        )
        n_topics = len(set(topics[mask].tolist())) if mask.any() else 0
        outlier_pct = round(100 * (~mask).mean(), 1)
        row = dict(
            min_cluster_size=mcs, n_topics=n_topics, outlier_pct=outlier_pct,
            npmi=round(float(npmi), 4), diversity=round(float(diversity), 3),
            nmi_vs_labels=round(float(nmi), 4), seconds=round(time.time() - t, 1),
        )
        results.append(row)
        print(f"  mcs={mcs:<4} topics={n_topics:<4} outliers={outlier_pct:<5}% "
              f"npmi={row['npmi']:<8} div={row['diversity']:<6} nmi={row['nmi_vs_labels']:<8} ({row['seconds']}s)")

    # Best = highest NPMI among configs with a sane topic count (>=5).
    sane = [r for r in results if r["n_topics"] >= 5] or results
    best = max(sane, key=lambda r: r["npmi"])
    out = dict(model=args.model, n_docs=len(docs), results=results, best=best)
    dest = config.ARTIFACTS_DIR / f"tuning_kndh_{args.model}.json"
    dest.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print("\nBest config:", best)
    print("Saved:", dest)


if __name__ == "__main__":
    main()
