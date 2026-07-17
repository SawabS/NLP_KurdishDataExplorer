---
title: "KDX-MiniLM-TSDAE (fine-tuned embedder)"
type: entity
created: 2026-06-26
updated: 2026-07-17
status: stable
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

| Model (tuned) | Topics | Largest topic | NPMI | NMI vs categories |
|---|---|---|---|---|
| Base MiniLM (`min_cluster_size=250`) | 46 | 7% | -0.047 | **0.232** |
| KDX, old fit (eom, `mcs=50`) | 45 | 54% (junk mix) | +0.038 | 0.159 |
| **KDX, anisotropy-aware fit** (leaf, `mcs=100`, UMAP n=50) | 46 | **6%** | **+0.057** | 0.212 |

**Anisotropy (2026-07-11):** the TSDAE space is severely anisotropic — mean
cosine between random documents is 0.951 (base MiniLM: 0.171). With default EOM
cluster selection HDBSCAN grew a junk mega-cluster (27,220 docs, near-uniform
label mix). Centering/whitening fixes the metric but not the cluster structure;
**leaf selection over a wider UMAP neighborhood** does (sweep in the wiki log).
Shipped as `config.MODEL_FIT_OVERRIDES["kdx-minilm-tsdae"]`.

**Honest finding (a trade-off, not a clean win):** the corrected KDX fit beats base
MiniLM on KNDH topic coherence (NPMI -0.047 → +0.057) and fixes the KDX-specific
mega-topic failure. It does **not** dominate every metric: base MiniLM still has
slightly stronger category alignment (NMI 0.232 vs 0.212) and higher keyword
diversity in the current artifact (0.859 vs 0.737). The leaf/UMAP override is a
clear win over the old KDX fit (largest topic 54% → 6%, NMI 0.159 → 0.212, NPMI
+0.038 → +0.057), not a claim that TSDAE is universally better than the base
embedder. KDX remains the production model because it is the project-specific
Sorani adaptation and gives the best shipped BERTopic coherence while avoiding the
bad cluster collapse.

Status in the app (since 2026-07-10, superseded 2026-07-15): **KDX-MiniLM-TSDAE
is the default local embedder** and the fallback when no hosted API key is
configured (`config.default_model_key()`). The explorer and upload engine now
expose an explicit model dropdown (`EMBEDDING_MODELS`: `kdx-minilm-tsdae`,
`minilm`, `openai`, `nvidia`) so any registered model can be selected or fitted
interactively; unfitted combinations are marked "fit required." Base MiniLM
remains the comparison bar in the Model & evaluation tab; the category-alignment
trade-off above is disclosed there. DistilUSE / MPNet / E5-base were
unregistered from `config.EMBEDDING_MODELS` (all negative NPMI).

## Connections

- Base/method context: [[Transformer Models]], [[BERTopic]],
  [[Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et al. 2024)]].
- Training data: [[Kurdish News Dataset Headlines (KNDH)]], [[AsoSoft Text Corpus]].
- Used as an embedding option in the [[Kurdish Data Explorer Pipeline]];
  full procedure recorded in [[Implementation and Methodology]].

## Open questions

- **Answered:** domain adaptation improves KNDH BERTopic coherence and, with the
  anisotropy-aware fit, removes the old junk mega-topic. It still trades away some
  category alignment and keyword diversity versus base MiniLM — see the table above.
- **Known limitation (2026-07-11):** the KDX space collapses **long
  running-text documents** — on AsoSoft Small (7,108 docs, avg ~700 tokens), the
  leaf/UMAP override improves KDX from 5 to 10 topics, but base MiniLM still
  separates 47 topics at `mcs=25`. TSDAE was adapted on sentence-length text, so
  long documents average toward the corpus mean. KDX stays the production embedder
  for sentence/headline-scale text (the app's primary use case: dataset text
  columns, descriptions).
- Still open: would more epochs / a larger sentence corpus (full AsoSoft 75M)
  narrow or widen the NMI gap versus base MiniLM? Would sentence-level
  chunk-then-pool embedding fix the long-document collapse?

## Change log

- 2026-06-26: Created when TSDAE fine-tuning was launched; evaluation pending.
- 2026-07-04: Evaluation complete (see table above); marked stable. Status/change
  log had lagged the actual finished results — caught during a pre-presentation
  wiki review.
- 2026-07-10: Promoted to the app's single production embedder ("one clear model"
  cleanup); base MiniLM demoted to evaluation-comparison only, other embedders
  unregistered.
- 2026-07-11: Diagnosed KDX anisotropy and shipped per-model fit overrides
  (UMAP n=50 + HDBSCAN leaf). Refit KNDH to 46 topics / NPMI +0.057 / largest
  topic 6%, and AsoSoft Small to 10 topics / NPMI +0.049.
- 2026-07-15/17: Reintroduced an explicit model dropdown with interactive
  in-app fitting (OpenAI, then NVIDIA) alongside KDX; KDX remains the default
  local model rather than the app's only model. See
  [[Implementation and Methodology]].
