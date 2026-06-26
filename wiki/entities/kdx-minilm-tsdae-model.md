---
title: "KDX-MiniLM-TSDAE (fine-tuned embedder)"
type: entity
created: 2026-06-26
updated: 2026-06-26
status: draft
tags: [model, embedding, tsdae, fine-tuning, domain-adaptation, sorani, minilm]
sources: ["raw/sources/Multilingual transformer and BERTopic for short text topic modeling: The case of Serbian.pdf"]
---

# KDX-MiniLM-TSDAE (fine-tuned embedder)

## Summary

A domain-adapted Kurdish sentence embedder produced for this project by
**unsupervised** TSDAE fine-tuning of
`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` on Sorani text. The
goal is better Sorani representation **without** biasing the model toward any
label set, so it stays usable as a general-purpose embedder (see the
[[Kurdish Data Explorer Pipeline]] dual goal). Saved at
`artifacts/models/kdx-minilm-tsdae`; produced by `scripts/finetune_tsdae.py`.

## How it was trained (full transparency)

- **Method:** TSDAE (Transformer-based Sequential Denoising Auto-Encoder) — the
  encoder embeds a corrupted (word-deleted) sentence and a decoder reconstructs the
  original; unsupervised, no labels. Method aligns with the
  [[Transformer Models]] embedding stage of [[BERTopic]].
- **Base model:** `paraphrase-multilingual-MiniLM-L12-v2` (BERT-type, 384-dim).
  MiniLM chosen deliberately: small and fast, which matters for the size-unbounded
  scaling goal.
- **Training corpus:** ~110,000 Sorani sentences = all
  [[Kurdish News Dataset Headlines (KNDH)]] headlines + sentence-split
  [[AsoSoft Text Corpus]] running text (sentences of 4–32 words), de-duplicated,
  shuffled (seed 42), capped at 110k. Both inputs were already normalized.
- **Loss:** `DenoisingAutoEncoderLoss`, `tie_encoder_decoder=False` (required:
  `transformers >= 5.0` dropped tied encoder/decoder).
- **Hyperparameters:** 1 epoch (~13,750 steps), batch size 8, lr 3e-5, constant
  scheduler, weight decay 0.
- **Hardware/runtime:** single RTX 4060 (8 GB), ~50 minutes, ~6.2 GB VRAM.
- **Operational notes (transparent):** NLTK `punkt_tab` is required for TSDAE's
  noise function; batch 16 hit CUDA OOM, so batch 8 plus
  `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True` was used.

## Evidence / evaluation

Training converged in ~45 min (train_loss 11.54). Evaluated by re-running the full
KNDH pipeline and comparing against base MiniLM (production configs, post
outlier-reduction):

| Model (tuned) | Topics | Outliers | NPMI | Diversity | NMI vs categories |
|---|---|---|---|---|---|
| Base MiniLM (`min_cluster_size=250`) | 48 | 36 | -0.056 | 0.838 | **0.224** |
| **KDX-MiniLM-TSDAE** (`min_cluster_size=50`) | 45 | **2** | **+0.038** | **0.847** | 0.159 |

**Honest finding (a trade-off, not a clean win):** at comparable granularity, TSDAE
adaptation *wins on every intrinsic metric* — coherence (NPMI -0.056 → +0.038, now
positive and beating LDA), diversity (0.838 → 0.847), and cluster confidence (only 2
documents stay unassigned vs 36; native HDBSCAN outliers drop sharply in the sweeps).
But it *reduces* alignment with the 5 human news categories (NMI 0.224 → 0.159),
because the unsupervised reconstruction objective does not track those domains.
Different embedding geometry also needs its own granularity: the same HDBSCAN setting
that gives base MiniLM its topics yields too few here, so it was re-tuned to
`min_cluster_size=50`. (These are the shipped artifacts; topic counts move a few
between runs because UMAP/HDBSCAN are stochastic.)

Practical guidance: base MiniLM for category-faithful exploration; KDX-MiniLM-TSDAE
for finer, more coherent semantic clustering. Both are selectable in the app.

## Connections

- Base/method context: [[Transformer Models]], [[BERTopic]],
  [[Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et al. 2024)]].
- Training data: [[Kurdish News Dataset Headlines (KNDH)]], [[AsoSoft Text Corpus]].
- Used as an embedding option in the [[Kurdish Data Explorer Pipeline]];
  full procedure recorded in [[Implementation and Methodology]].

## Open questions

- Does domain adaptation actually improve topic quality on KNDH, or is the
  off-the-shelf multilingual model already sufficient?
- Would more epochs / a larger sentence corpus (full AsoSoft 75M) help materially?

## Change log

- 2026-06-26: Created when TSDAE fine-tuning was launched; evaluation pending.
