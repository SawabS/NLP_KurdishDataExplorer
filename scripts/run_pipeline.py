#!/usr/bin/env python3
"""Fit the Kurdish Data Explorer pipeline and cache artifacts for the app.

Examples
--------
    conda run -n ai python scripts/run_pipeline.py --source kndh --model minilm
    conda run -n ai python scripts/run_pipeline.py --source kndh --model mpnet --max-docs 10000
    conda run -n ai python scripts/run_pipeline.py --source asosoft --model minilm --normalize
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Make the src/ package importable when run as a plain script.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from kurdish_explorer import config, pipeline  # noqa: E402


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--source", default="kndh", choices=["kndh", "asosoft"])
    p.add_argument("--model", default=config.DEFAULT_EMBEDDING_MODEL, choices=list(config.EMBEDDING_MODELS))
    p.add_argument("--max-docs", type=int, default=None, help="optional subsample size")
    p.add_argument("--normalize", action="store_true", help="run KLPT normalization (use for asosoft)")
    p.add_argument("--no-baselines", action="store_true", help="skip LDA/NMF comparison")
    p.add_argument("--min-cluster-size", type=int, default=None,
                   help="override HDBSCAN min_cluster_size (granularity; model-dependent)")
    args = p.parse_args()

    res = pipeline.run(
        source=args.source,
        model_key=args.model,
        max_docs=args.max_docs,
        normalize=args.normalize,
        with_baselines=not args.no_baselines,
        min_cluster_size=args.min_cluster_size,
    )
    print(f"\nDone: {res.n_docs:,} docs -> {res.n_topics} topics")
    print("NPMI coherence:", {k: round(v, 4) for k, v in res.coherence.items()})
    print("Artifacts:", res.artifact_dir)


if __name__ == "__main__":
    main()
