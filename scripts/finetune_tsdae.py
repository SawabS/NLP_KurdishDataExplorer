#!/usr/bin/env python3
"""Domain-adaptive (unsupervised) fine-tuning of the embedding model via TSDAE.

TSDAE (Transformer-based Sequential Denoising Auto-Encoder) adapts a
sentence-transformer to a domain using only raw sentences — no labels — so the
result stays a general-purpose embedder while better representing Kurdish.

Corpus: KNDH headlines + sentence-split AsoSoft running text (both already
normalized). The fine-tuned model is saved to ``artifacts/models/<name>`` and can
then be registered in ``config.EMBEDDING_MODELS`` for the pipeline.

Run (time-boxed example):
    conda run -n ai python scripts/finetune_tsdae.py --base minilm --max-sentences 120000 --epochs 1
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from kurdish_explorer import config, data  # noqa: E402

_SENT_SPLIT = re.compile(r"[.!?؟\n]+")


def build_sentences(max_sentences: int, seed: int) -> list[str]:
    import random

    sents: list[str] = []

    # KNDH headlines are already sentence-sized.
    kndh = data.load_kndh()
    sents.extend(kndh["text"].dropna().astype(str).tolist())

    # AsoSoft: split long documents into sentences.
    try:
        aso = data.load_asosoft()
        for doc in aso["text"].dropna().astype(str):
            for s in _SENT_SPLIT.split(doc):
                s = s.strip()
                if 4 <= len(s.split()) <= 32:
                    sents.append(s)
    except FileNotFoundError:
        print("AsoSoft not found; using KNDH only.")

    # Dedup, shuffle, cap.
    sents = list(dict.fromkeys(s for s in sents if s and len(s.split()) >= 3))
    random.Random(seed).shuffle(sents)
    if max_sentences and len(sents) > max_sentences:
        sents = sents[:max_sentences]
    return sents


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="minilm", choices=list(config.EMBEDDING_MODELS))
    ap.add_argument("--max-sentences", type=int, default=120_000)
    ap.add_argument("--epochs", type=int, default=1)
    ap.add_argument("--batch-size", type=int, default=16)
    ap.add_argument("--lr", type=float, default=3e-5)
    ap.add_argument("--out-name", default=None)
    args = ap.parse_args()

    import torch
    from torch.utils.data import DataLoader
    from sentence_transformers import SentenceTransformer
    from sentence_transformers.datasets import DenoisingAutoEncoderDataset
    from sentence_transformers.losses import DenoisingAutoEncoderLoss

    base_name = config.EMBEDDING_MODELS[args.base]
    out_name = args.out_name or f"kdx-{args.base}-tsdae"
    out_dir = config.ARTIFACTS_DIR / "models" / out_name

    print("Building sentence corpus...")
    sentences = build_sentences(args.max_sentences, config.SEED)
    print(f"  {len(sentences):,} training sentences")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = SentenceTransformer(base_name, device=device)

    train_dataset = DenoisingAutoEncoderDataset(sentences)
    train_dataloader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, drop_last=True)
    # transformers>=5.0 dropped tied encoder/decoder; use an untied decoder.
    train_loss = DenoisingAutoEncoderLoss(model, decoder_name_or_path=base_name, tie_encoder_decoder=False)

    steps = (len(sentences) // args.batch_size) * args.epochs
    print(f"Training TSDAE: {args.epochs} epoch(s), ~{steps:,} steps, batch {args.batch_size}, lr {args.lr}")
    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        epochs=args.epochs,
        weight_decay=0.0,
        scheduler="constantlr",
        optimizer_params={"lr": args.lr},
        show_progress_bar=True,
    )

    out_dir.parent.mkdir(parents=True, exist_ok=True)
    model.save(str(out_dir))
    print("Saved fine-tuned model ->", out_dir)
    print(f"Register in config.EMBEDDING_MODELS, e.g.  \"{out_name}\": \"{out_dir}\"")


if __name__ == "__main__":
    main()
