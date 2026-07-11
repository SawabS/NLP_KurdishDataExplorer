---
title: "Implementation and Methodology"
type: synthesis
created: 2026-06-26
updated: 2026-07-11
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
| **BERTopic (base MiniLM, tuned)** | **-0.047** | 46 | 39 outliers (0.08%); beats LDA, near NMF |
| LDA | -0.149 | 20 | |
| NMF | +0.107 | 20 | NPMI structurally favors bag-of-words |

(Numbers are from the shipped `kndh__minilm` artifact. Run-to-run topic counts
move by a few topics because UMAP/HDBSCAN are stochastic; the artifact in the repo
is the source of truth the app serves.)

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

Comparison on full KNDH (production configs, post outlier-reduction; the shipped
artifacts):

| Model (tuned) | Topics | Outliers | Largest topic | NPMI | Diversity | NMI vs categories |
|---|---|---|---|---|---|---|
| Base MiniLM (mcs=250) | 46 | 39 | 7% | -0.047 | **0.859** | **0.232** |
| KDX old fit (eom, mcs=50) | 45 | 2 | 54% | +0.038 | 0.847 | 0.159 |
| KDX anisotropy-aware fit (leaf, UMAP n=50, mcs=100) | 46 | 199 | **6%** | **+0.057** | 0.737 | 0.212 |

**Finding (honest trade-off):** KDX is not a universal win over base MiniLM. It
does give the best shipped BERTopic coherence on KNDH and, after the 2026-07-11
anisotropy fix, no longer creates the former 27k-document junk topic. Base MiniLM
still has slightly better category alignment and keyword diversity. The decisive
result is narrower: the leaf/UMAP override is a strict improvement over the old
KDX fit (largest topic 54% → 6%, NMI 0.159 → 0.212, NPMI +0.038 → +0.057).
Decision (2026-07-10, "one clear model" cleanup, retained after the fix):
**KDX-MiniLM-TSDAE is the app's single production embedder** because it is the
project-specific Sorani adaptation and gives the highest KDX/BERTopic coherence.
Base MiniLM stays registered only as the evaluation comparison point (Model &
evaluation tab); DistilUSE / MPNet / E5-base were unregistered (all scored
negative NPMI; artifacts remain on disk).

## Topic hierarchy (the drill-down tree)

The headline app idea: instead of a flat list, topics are shown as a **hierarchy
the user can drill into** — start at a broad cluster (e.g. politics, sport), click
to reveal its sub-topics, and keep going until leaves are specific. Implemented on
top of BERTopic's `hierarchical_topics(docs)`, which merges topics pairwise by
c-TF-IDF distance into a binary tree. `topics.hierarchy_nodes()` flattens that tree
into parent/child nodes, each carrying a document `count` (leaf = topic size,
internal = sum of descendant leaf sizes), a readable keyword `label`, and a
`topic_id` for leaves. Saved as `hierarchy.json` per run.

The app renders it as an interactive Plotly **icicle / treemap / sunburst**
(`branchvalues="total"`, so box size = document count). Hovering a node shows its
keywords, document count, and a sample snippet for intuition; a leaf inspector below
shows "how many documents are here", the keyword bars, and example texts. The
**distribution** (top topics + topic×category heatmap) sits directly below the tree.

## Source isolation and transparency

The user explores **one source at a time and sources are never mixed** unless they
ask. Navigation is source-first: pick a corpus (KNDH, AsoSoft, or an upload); the
embedder is chosen automatically (KDX when fitted, no dropdown). The run key is
`<source>__<model>` so each run only ever contains one corpus's documents. Every source shows a provenance banner (what it is, size,
labeled/unlabeled, origin). Shipped runs:

| Source | Docs | Topics | NPMI | Notes |
|---|---|---|---|---|
| `kndh__minilm` | 50,000 | 46 | -0.047 | labeled, 5 categories; largest topic 7%, NMI 0.232 |
| `kndh__kdx-minilm-tsdae` | 50,000 | 46 | +0.057 | labeled; anisotropy-aware fit (leaf, UMAP n=50), largest topic 6%, NMI 0.212 |
| `asosoft__minilm` | 7,108 | 47 | +0.081 | unlabeled running text (mcs=25) |
| `asosoft__kdx-minilm-tsdae` | 7,108 | 10 | +0.049 | KDX still under-segments long docs (see [[KDX-MiniLM-TSDAE (fine-tuned embedder)]]) |

## Generic upload engine (size-unbounded goal)

`app/upload_page.py` + `pipeline.run_on_texts()` let a user point the explorer at
**their own text** — a `.txt` file (split by line or paragraph) or a tabular file
(`.csv/.tsv/.xlsx/.parquet`, choosing a text column and optional label column). The
result becomes its own isolated source with the same tree / map / baselines.

Scaling provisions for hundreds-of-MB inputs:

- **Server-path input** bypasses the browser upload cap (`server.maxUploadSize`
  raised to 2 GB in `.streamlit/config.toml`) and reads the file directly off disk.
- Files are **streamed line-by-line**, not loaded twice into memory.
- Tabular inputs now use a cheap **schema peek** before full read: Parquet reads
  only metadata via `pyarrow.parquet.read_schema()`, while CSV/TSV/Excel peek only
  a few rows. Once the user chooses columns, table reads materialize only the text
  column and optional label column (`usecols` / Parquet `columns`), avoiding
  wide-table memory spikes.
- A **"documents to embed" cap** samples very large corpora to a workable size for a
  live GPU run; the full-corpus path (memory-mapped embeddings, online clustering) is
  the offline `run_pipeline` script — see `docs/ARCHITECTURE.md`. Topic stats always
  reflect whatever was embedded.

## Application

`app/streamlit_app.py` reads precomputed artifacts (no model refit). Two modes:
**Explore a source** (source-first nav → Topic tree, Document map, Ask the
corpus, Model & evaluation) and **Upload & explore** (the generic engine above,
always using the KDX embedder with base-MiniLM fallback via
`config.default_model_key()`). "Ask the corpus" is one-click/free-text semantic
search: the question is embedded with the run's embedder and matched to
per-topic centroids from the cached document embeddings.

### UI polish and verification (2026-07-03)

- Model selectors now show human-readable names from `EMBEDDING_MODEL_LABELS`
  instead of raw Hugging Face identifiers; unfitted model/source combinations are
  still visible and marked `fit required`.
- Plotly theming is explicit for titles, axes, legends, colorbars, hover labels,
  and single-series bar colors. The topic/category heatmap uses a theme-aware
  sequential scale so sparse cells do not glow white in dark mode.
- The topic tree defaults to **3 levels** with a visible depth control. Icicle and
  treemap pathbars are hidden to avoid Plotly rendering a stray `undefined` chip
  for the synthetic root, while click-to-drill remains available.
- Dark-mode tree colors use muted internal-node surfaces and pastel leaf/category
  colors so icicle, treemap, and sunburst charts blend with the page.
- Verified live with Playwright against Streamlit on `127.0.0.1:8602`: KNDH source
  selection, friendly model labels, Topic tree / Map / Baselines tabs, light and
  dark themes, icicle / treemap / sunburst layouts, dark tooltip computed colors,
  absence of literal `undefined`, and upload-page rendering.

## Reproducibility

```bash
conda run -n ai python scripts/prepare_data.py
conda run -n ai python scripts/run_pipeline.py --source kndh --model minilm --min-cluster-size 250
conda run -n ai python scripts/run_pipeline.py --source kndh --model kdx-minilm-tsdae
conda run -n ai python scripts/run_pipeline.py --source asosoft --model minilm --normalize --min-cluster-size 25
conda run -n ai python scripts/run_pipeline.py --source asosoft --model kdx-minilm-tsdae --normalize --no-baselines
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
- 2026-06-26: Added the drill-down topic hierarchy, source-first navigation (no
  mixing) with an AsoSoft run, and the generic upload engine. Regenerated all
  artifacts with `hierarchy.json`; refreshed comparison numbers to match the shipped
  runs (base MiniLM 48 topics / NPMI -0.056 / NMI 0.224; TSDAE 45 / +0.038 / 0.159).
- 2026-07-03: Polished Streamlit selectors, chart theming, topic-tree defaults, and
  upload table reads; verified the live app with Playwright in light and dark modes.
- 2026-07-11: Diagnosed KDX anisotropy (mean random-pair cosine 0.951) and shipped
  per-model UMAP/HDBSCAN overrides for KDX. Refit KNDH and AsoSoft KDX artifacts;
  refreshed tables to current artifact values.
