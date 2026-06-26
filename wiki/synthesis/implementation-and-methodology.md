---
title: "Implementation and Methodology"
type: synthesis
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [implementation, methodology, reproducibility, bertopic, tsdae, pipeline, transparency]
sources: ["raw/sources/KLPT – Kurdish Language Processing Toolkit.pdf", "raw/sources/Kurdish News Dataset Headlines (KNDH) through multiclass classification.pdf", "raw/sources/Toward Kurdish language processing: Experiments in collecting and processing the AsoSoft text corpus.pdf", "raw/sources/Multilingual transformer and BERTopic for short text topic modeling: The case of Serbian.pdf"]
---

# Implementation and Methodology

Transparent, reproducible record of how the [[Kurdish Data Explorer Pipeline]] was
actually built and trained, beyond the proposal. Updated as work proceeds.

## Goal (as refined with the user)

The Kurdish/KNDH work is the first concrete use case; the **target is a general,
size-unbounded text-exploration engine**: point it at a dataset's text column or an
uploaded file (potentially hundreds of MB) and get embeddings, topics, and visual
exploration without running out of memory. Scaling design lives in
`docs/ARCHITECTURE.md`.

## Environment

- Conda env `ai`, Python 3.11.15, single NVIDIA RTX 4060 Laptop GPU (8 GB), CUDA.
- Key versions: torch 2.11.0+cu130, transformers 5.8.1, sentence-transformers 5.5.1,
  bertopic 0.17.4, umap-learn 0.5.12, hdbscan 0.8.44, gensim 4.4.0,
  scikit-learn 1.8.0, klpt 0.1.7 (+ chunspell 2.0.4), streamlit 1.58.0,
  datasets 5.0.0, huggingface_hub 1.21.0.
- Dependency note (transparent): `datasets`/`huggingface_hub` versions clashed on
  this bleeding-edge stack; pinned `huggingface_hub==1.21.0` to satisfy both
  `transformers` (>=1.5,<2.0) and `datasets`.

## Data acquisition and provenance

- [[Kurdish News Dataset Headlines (KNDH)]]: downloaded from Mendeley Data
  (DOI 10.17632/kb7vvkg2th.2) as a single xlsx. 50,000 rows, 5 perfectly balanced
  categories (10k each): **economic, health, science & technology, social, sport**
  (confirmed from the `labels` column). Ships a KLPT-preprocessed Kurdish column
  plus English translations.
- [[AsoSoft Text Corpus]]: cloned from `github.com/AsoSoft/AsoSoft-Text-Corpus`.
  Used the public **Small version** (~4.9M whitespace tokens, 7,108 documents);
  non-commercial research license. (The Large 75M-token split-zip and the
  topic-annotated set — a RAR needing `unrar` — are optional, not yet ingested.)
- Both prepared to Parquet via `scripts/prepare_data.py` into `data/processed/`.

## Preprocessing

- [[Text Normalization]] and tokenization via [[KLPT]] (`Preprocess` Sorani/Arabic,
  Latin numerals). KNDH already ships a preprocessed column; AsoSoft is normalized
  at source.
- Sorani stopwords loaded from KLPT's `stopwords.json` (`Sorani.Arabic`) and removed
  in the CountVectorizer used for c-TF-IDF and the LDA/NMF baselines.
- **Bug fixed during development:** one CountVectorizer was shared for both
  BERTopic c-TF-IDF and the baselines with `min_df=5, max_df=0.5`. BERTopic's
  c-TF-IDF runs over *grouped per-topic* documents, so `min_df=5` meant a keyword
  had to appear in ≥5 topics — gutting keywords and crashing at low topic counts.
  Now split: c-TF-IDF vectorizer uses `min_df=1` (per-topic docs); baselines use
  `min_df=5, max_df=0.5` (full document set). This was the single biggest BERTopic
  quality fix.

## Embedding

- Default `paraphrase-multilingual-MiniLM-L12-v2` (384-dim). Registry also includes
  distiluse (512), mpnet (768), multilingual-e5-base, and the fine-tuned
  [[KDX-MiniLM-TSDAE (fine-tuned embedder)]].
- GPU encoding (fp32, normalized), with an on-disk `.npy` cache keyed by
  (model, content hash) so re-runs reuse embeddings.

## Topic modeling ([[BERTopic]])

Configuration (in `src/kurdish_explorer/config.py`):

- UMAP: `n_neighbors=15, n_components=5, min_dist=0.0, metric=cosine, seed=42`.
- HDBSCAN: `min_cluster_size=250, min_samples=10, metric=euclidean` (tuned, below).
- c-TF-IDF: `ClassTfidfTransformer(reduce_frequent_words=True)` + MMR keyword
  diversification (`diversity=0.3`), `top_n_words=10`.
- Outlier handling: HDBSCAN `-1` documents reassigned with
  `reduce_outliers(strategy="c-tf-idf")` (large "uncategorized" buckets are poor UX
  for an explorer).
- A separate 2D UMAP projection is stored per document for the app's Map view.

## Tuning experiment (full 50K, MiniLM)

`scripts/tune_bertopic.py` sweeps HDBSCAN `min_cluster_size` over one shared UMAP
reduction. Metrics: NPMI coherence (gensim `c_npmi`), topic diversity (unique-word
fraction), and NMI between topics and the 5 human categories. Larger clusters →
fewer, more diverse, better label-aligned topics (NPMI plateaus, the expected
bag-of-words bias). Selected `min_cluster_size=250` (+`min_samples=10`).

| min_cluster_size | topics | outliers | NPMI | diversity | NMI vs labels |
|---|---|---|---|---|---|
| 50 | 195 | 28.5% | -0.328 | 0.20 | 0.228 |
| 100 | 91 | 36.1% | -0.315 | 0.33 | 0.230 |
| 150 | 62 | 44.4% | -0.320 | 0.46 | 0.247 |
| 250 | 31 | 45.0% | -0.304 | 0.75 | 0.252 |
| 400 | 21 | 52.1% | -0.301 | 0.85 | 0.275 |

(Sweep NPMI is computed on HDBSCAN clusters *excluding* outliers; the production
pipeline reassigns outliers and recomputes c-TF-IDF on all docs, which improves the
final number substantially — see below.)

## Baselines and evaluation

- Baselines (`src/kurdish_explorer/baselines.py`): LDA (sklearn, online) and NMF
  (TF-IDF), 20 topics, baseline vectorizer.
- Metric (`src/kurdish_explorer/evaluate.py`): NPMI via gensim, plus topic
  diversity and NMI-vs-labels.

### Final full-50K result (production config, post outlier-reduction)

| Model | NPMI | Topics | Notes |
|---|---|---|---|
| **BERTopic (tuned)** | **-0.053** | 46 | 32 outliers (0.06%); beats LDA, near NMF |
| LDA | -0.149 | 20 | |
| NMF | +0.107 | 20 | NPMI structurally favors bag-of-words |

Interpretation: NPMI inherently favors LDA/NMF (they optimize word co-occurrence);
[[BERTopic]] wins on diversity, near-zero outliers, semantic coherence, and not
needing a fixed topic count — a defensible "most suitable configuration within the
project scope," consistent with
[[Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et al. 2024)]].

## Embedding fine-tuning

Domain-adaptive **unsupervised TSDAE** on MiniLM — full procedure and
hyperparameters are recorded on [[KDX-MiniLM-TSDAE (fine-tuned embedder)]].
Rationale: improve Sorani representation while keeping the embedder general-purpose
for the size-unbounded goal (an alternative, supervised fine-tuning on the 5 KNDH
labels, was rejected as it would bias the generic engine).

Comparison on full KNDH (production configs, post outlier-reduction):

| Model (tuned) | Topics | NPMI | Diversity | NMI vs categories |
|---|---|---|---|---|
| Base MiniLM (mcs=250) | 44 | -0.038 | 0.864 | **0.232** |
| KDX-MiniLM-TSDAE (mcs=50) | 88 | **+0.009** | 0.855 | 0.175 |

**Finding (honest trade-off):** TSDAE *improved coherence* (NPMI turned positive,
beating LDA) and produced a denser space (native HDBSCAN outliers fell from ~30–50%
to ~5–16%), but *reduced category alignment* (NMI 0.232 → 0.175) since its
reconstruction objective does not track the 5 news domains. It also needed its own
granularity (mcs=250 gave only 7 topics; re-tuned to 50). Neither model dominates,
so both ship and are selectable in the app — base MiniLM for category-faithful
exploration, the fine-tuned model for finer/more-coherent semantic clustering.

## Application

`app/streamlit_app.py` reads precomputed artifacts (no model refit) and offers
tabs: Topics (table + MMR keyword bars + example docs), Map (2D UMAP scatter,
point-sampled for scale), Distributions (topic sizes, topic×category heatmap),
Baselines (NPMI comparison + LDA/NMF keywords).

## Reproducibility

```bash
conda run -n ai python scripts/prepare_data.py
conda run -n ai python scripts/run_pipeline.py --source kndh --model minilm
conda run -n ai python scripts/tune_bertopic.py --model minilm
PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True \
  conda run -n ai python scripts/finetune_tsdae.py --base minilm --max-sentences 110000 --batch-size 8
conda run -n ai streamlit run app/streamlit_app.py
```

## Connections

- Realizes [[Kurdish Data Explorer Pipeline]] with [[KLPT]],
  [[Kurdish News Dataset Headlines (KNDH)]], [[AsoSoft Text Corpus]], [[BERTopic]],
  and [[KDX-MiniLM-TSDAE (fine-tuned embedder)]].
- Concepts: [[Topic Modeling]], [[Text Normalization]], [[Transformer Models]],
  [[Low-Resource Languages]], [[Text Classification]].

## Change log

- 2026-06-26: Initial implementation record (setup, data, tuning, baselines, app);
  TSDAE fine-tuning launched, comparison numbers pending.
