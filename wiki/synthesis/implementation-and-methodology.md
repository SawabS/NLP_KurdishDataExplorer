---
title: "Implementation and Methodology"
type: synthesis
created: 2026-06-26
updated: 2026-07-24
status: stable
tags: [implementation, methodology, reproducibility, bertopic, tsdae, pipeline, transparency, llm-labeling, rag]
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
  scikit-learn 1.8.0, klpt 0.1.7 (+ chunspell 2.0.4), FastAPI 0.128.0,
  Uvicorn 0.40.0, React 18, Vite 6, datasets 5.0.0, huggingface_hub 1.21.0.
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

- The registry includes the fine-tuned
  [[KDX-MiniLM-TSDAE (fine-tuned embedder)]], its multilingual MiniLM base,
  OpenAI `text-embedding-3-small`, and NVIDIA `nemotron-3-embed-1b`. Older
  DistilUSE/MPNet artifacts remain on disk but are no longer registered.
- GPU encoding (fp32, normalized), with an on-disk `.npy` cache keyed by
  (model, content hash) so re-runs reuse embeddings.
- The OpenAI adapter tokenizes before sending: requests are packed below a safe
  fraction of the configured TPM limit, overlong documents are split and their
  vectors recombined with a token-weighted mean, and 429 responses use reset
  headers plus bounded exponential backoff. The web fit screen estimates
  total tokens and minimum run time before the user confirms a hosted run.
- The NVIDIA adapter (`NvidiaEmbedder`, `src/kurdish_explorer/embed.py`) is the
  fastest hosted option: it uses NVIDIA's OpenAI-compatible endpoint
  (`https://integrate.api.nvidia.com/v1`) and, because that endpoint has no
  documented low per-minute token cap the way OpenAI's free tier does, fans
  batched requests (default 64 docs/request) out across a thread pool (default
  8 concurrent requests) instead of a single-threaded token-bucket queue.
  Overlong documents are truncated server-side (`truncate=END`) rather than
  split locally, since the model's 32k-token context comfortably covers
  headlines/sentences. 429/5xx responses retry with bounded exponential
  backoff. `NVIDIA_API_KEY` is checked before `OPENAI_API_KEY` in
  `default_model_key()` for this reason.

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
- **UI note (2026-07-20):** the app no longer surfaces this comparison as an
  "Evaluate" tab — it read as embedding-model benchmarking, not data
  exploration, and was replaced by an **Insights** tab (glance metrics, a
  topic-size Pareto, category balance, run provenance — see "Application"
  below). The `/coherence` and `/baselines` endpoints and the numbers below
  are unchanged and still computed at fit time; they're just not shown in
  the UI anymore.

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
Historical decision (2026-07-10): KDX-MiniLM-TSDAE briefly became the app's
single production embedder because it is the project-specific Sorani adaptation
and gives the highest KDX/BERTopic coherence. That product decision was
superseded by the hosted-provider comparison. KDX and base MiniLM remain
registered so existing research runs stay loadable and keyless local work still
has a fallback; new interactive fits offer OpenAI and NVIDIA. DistilUSE, MPNet,
and E5-base remain unregistered (all scored negative NPMI; old artifacts may
still exist locally).

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

**(2026-07-21) Visible corpus root.** The chart used to hide its own root
(`root.color` forced transparent), so the tree effectively had no visible
starting point. `tree.py:build_tree` now prepends a synthetic `__source__`
node — labeled with the corpus title, value = sum of the top-level nodes —
and reparents the (normally single) top-level merge node under it, so the
icicle/treemap/sunburst reads as one tree that starts at the corpus and
drills down into ever more specific topics.

## LLM topic labeling and retrieval-augmented answers

Two problems this addresses: BERTopic's own node names are raw c-TF-IDF
keyword strings (`"نییە_ئەمە_خۆت_شتێک"`) — precise but unreadable to a
general user — and the "Ask the corpus" search only ever ranked topic
centroids instead of actually answering a question.

**Human-readable labels.** `src/kurdish_explorer/labeling.py` batches every
hierarchy node — leaf topics *and* internal merge groups — to a chat LLM,
each with its top keywords and one representative document, asking for a
short name in the *same language as the document* (uploaded corpora aren't
always Kurdish, so the language is inferred per corpus, not hardcoded).
Saved as `topic_labels.json` per run, keyed by node id; leaf node ids are
exactly the BERTopic topic ids, so one file labels both the flat topic list
and the tree. Runs automatically at fit time
(`pipeline.run_on_dataframe`) and can retrofit any already-fitted run from
saved artifacts alone — no re-embedding — via `pipeline.label_run()` /
`POST /runs/{source}/{model}/label` (a background job, same queue as fits).
The frontend surfaces this as a "Name topics" button
(`structure/NameTopicsAction.tsx`) that only appears while some topics are
still unlabeled; `lib/labels.ts:topicName()` prefers the LLM label
everywhere in the UI, falling back to the old keyword formatting.

**Real RAG for "Ask the corpus."** `search.py:retrieve()` now does genuine
per-document nearest-neighbor search — cosine similarity over the run's full
cached embedding matrix (brute-force numpy; fast enough at these corpus
sizes, no vector DB needed) — instead of the earlier topic-centroid
approximation (`rank()`, kept for the original `/search` endpoint).
`search.py:answer()` feeds the retrieved passages to the chat LLM with
inline-citation instructions (`[1]`, `[2]`...); new endpoint
`POST /runs/{source}/{model}/ask`. It degrades gracefully if the LLM call
fails: citations still render, with an explicit "couldn't generate an
answer" state rather than a blank screen.

**Chat/completion provider**, a separate concern from the embedding
provider above: `config.CHAT_MODELS` / `config.default_chat_provider()` /
`src/kurdish_explorer/llm.py`. One `chat_complete()` covers Ollama (local),
OpenAI, and NVIDIA through the same OpenAI-compatible client shape (NVIDIA's
and Google Gemini's APIs both expose an OpenAI-compatible endpoint, as does
Ollama). Selected via `.env`: `KDX_CHAT_PROVIDER`
(`ollama|openai|nvidia`), `OLLAMA_CHAT_MODEL` (default `qwen2.5:7b-instruct`),
`NVIDIA_CHAT_API_KEY`/`NVIDIA_CHAT_MODEL` (falls back to `NVIDIA_API_KEY` if
unset, so the chat model can use a different NIM deployment/key than the
embedding provider).

**Model-choice finding (2026-07-21).** NVIDIA's `google/gemma-4-31b-it` is a
real, confirmed-available model on this account, but ~47s+ per call even for
a trivial reply (cold-start/low-priority queuing) with occasional transient
500s — labeling 45 hierarchy nodes took ~6 minutes. `meta/llama-3.1-8b-instruct`
on the same account responds in ~1s with equally coherent, correctly-cited
RAG answers — an identical query dropped from minutes to ~4 seconds after
switching. `google/gemma-3-12b-it`/`gemma-3-4b-it` are listed in NVIDIA's
catalog but 404 ("not found for account") on this key without a separate
provisioning step. Shipped default: `meta/llama-3.1-8b-instruct`.

## Source isolation and transparency

The user explores **one source at a time and sources are never mixed** unless they
ask. Navigation is source-first: pick a corpus, then choose among that source's
completed embedding runs. The run key is `<source>__<model>` so each run contains
one corpus's documents. `GET /api/sources` returns every fitted registered model
in preference order; the preferred run supplies the default route and
source-level metadata but does not hide the others. Every source shows its size,
label status, origin, and run provenance.

The current Fly demonstration intentionally exposes only one source:
`corpus-unreviewed`, a deterministic 100,000-document sample from 376,292
available paragraphs in `corpus_unreviewed.txt`. It has completed OpenAI and
NVIDIA fits:

| Run | Docs | Topics | Outliers | NPMI | End-to-end fit |
|---|---:|---:|---:|---:|---:|
| `corpus-unreviewed__openai` | 100,000 | 38 | 868 | 0.03742 | 3,628.7 s |
| `corpus-unreviewed__nvidia` | 100,000 | 32 | 552 | 0.04915 | 337.4 s cache-reusing; 597.5 s earlier cold run |

These timings compare complete fitting workflows, not isolated embedding API
latency. The NVIDIA result demonstrates the practical throughput benefit of its
concurrent batching; the topic counts and NPMI values also show that providers
produce structurally different topic spaces on the same document sample.

Earlier local research artifacts include:

| Source | Docs | Topics | NPMI | Notes |
|---|---|---|---|---|
| `kndh__minilm` | 50,000 | 46 | -0.047 | labeled, 5 categories; largest topic 7%, NMI 0.232 |
| `kndh__kdx-minilm-tsdae` | 50,000 | 46 | +0.057 | labeled; anisotropy-aware fit (leaf, UMAP n=50), largest topic 6%, NMI 0.212 |
| `asosoft__minilm` | 7,108 | 47 | +0.081 | unlabeled running text (mcs=25) |
| `asosoft__kdx-minilm-tsdae` | 7,108 | 10 | +0.049 | KDX still under-segments long docs (see [[KDX-MiniLM-TSDAE (fine-tuned embedder)]]) |

## Generic upload engine (size-unbounded goal)

The FastAPI upload/job routes + `pipeline.run_on_texts()` let a user point the explorer at
**their own text** — a `.txt` file (split by line or paragraph) or a tabular file
(`.csv/.tsv/.xlsx/.parquet`, choosing a text column and optional label column). The
result becomes its own isolated source with the same tree / map / baselines.

Scaling provisions for hundreds-of-MB inputs:

- **Server-path input** bypasses browser transfer entirely. Browser uploads are
  streamed to `artifacts/uploads/` with an explicit 2000 MB server-side cap.
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

The application is a Vite/React SPA using noor-ui, backed by FastAPI under
`server/kdx_server/`. Saved Parquet/JSON artifacts are read through an mtime-keyed
LRU cache; large map responses are sampled server-side and returned column-wise.
Routes encode source, model, and tab, with layout/depth/topic/search state in
query parameters. `config.best_available_model()` selects the default route,
while the corpus rail exposes every completed registered model for direct
comparison. The landing Overview lists every corpus with card and row views
(persisted per browser); each explore workspace offers **Structure, Map,
Documents, Ask, and Insights**. Missing model/source combinations, uploads, and
topic-labeling retrofit jobs use the same single-worker registry with polling,
progress, error capture, and query invalidation. The corpus-context rail and
header stat row are independently collapsible and persisted.

Only `openai`/`nvidia` are offered when fitting a *new* corpus
(`config.NEW_FIT_MODELS`); hosted fits still require a cost acknowledgement.
Older local-model runs (kndh, asosoft) keep loading normally — `config.EMBEDDING_MODELS`
still lists their keys — they're just no longer offered as a choice going forward.
The **Ask** tab (formerly "Search"/"Ask the corpus") is now real
retrieval-augmented generation: it embeds the question, retrieves the nearest
documents by cosine similarity over the run's cached embeddings, and asks a chat
LLM to synthesize a cited answer from them (see "LLM topic labeling and
retrieval-augmented answers" above) — not just a ranked list of topic matches.
The legacy Streamlit application and configuration were removed on 2026-07-24.
FastAPI/React is now the only runtime UI and deployment path.

### Current interaction and loading design (2026-07-24)

- The fixed app bar is a lightly translucent theme surface (44% surface color,
  5 px backdrop blur) with no bottom divider or shadow. Language and theme
  controls occupy the physical top-right in both LTR and RTL layouts.
- On precise pointing devices, a compact 34 px theme-colored wobble follows the
  pointer across the entire application. A contrasting 4 px center marks the
  exact click target and expands on press. Touch devices and reduced-motion
  users keep the native cursor.
- Ask shows staged retrieval and generation feedback plus answer/citation
  skeletons. The former full-width green progress line was removed because it
  implied measurable completion where the backend only exposes an indeterminate
  request.
- Structure's Corpus distribution is a ranked set of real topic labels with
  document counts, corpus shares, and direct selection instead of an opaque
  default Plotly bar chart.
- Explore uses the page scroll container only; the nested browser scrollbar was
  removed.
- The document-vector LRU cache holds one model matrix. This prevents the 586 MB
  OpenAI and 782 MB NVIDIA matrices from remaining resident together on the 2 GB
  Fly machine.

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
- Re-verified after the 2026-07-17 migration with Playwright against FastAPI on
  `127.0.0.1:8656`: artifact-backed hierarchy and WebGL map, route navigation,
  theme switching, desktop/mobile layouts, no horizontal overflow, and no console
  errors.

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
npm run build -w web
./scripts/serve_web.sh
```

## Connections

- Operational topology, launch modes, request lifecycle, and troubleshooting:
  [[Application Architecture and Operation]].
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
- 2026-07-17: Replaced Streamlit with a FastAPI + Vite/React noor-ui application;
  added shareable routes, background fit jobs, streamed uploads, typed APIs,
  self-hosted Arabic fonts, server tests, and production SPA serving.
- 2026-07-18: Restored the original Streamlit interface as a supported compatibility
  app alongside FastAPI/React; both share the same engine and artifact directories.
- 2026-07-18: Added [[Application Architecture and Operation]] as the focused
  full-stack runbook and visual architecture companion to this methodology record.
- 2026-07-11: Diagnosed KDX anisotropy (mean random-pair cosine 0.951) and shipped
  per-model UMAP/HDBSCAN overrides for KDX. Refit KNDH and AsoSoft KDX artifacts;
  refreshed tables to current artifact values.
- 2026-07-15: Restored explicit embedding-model selectors for existing and uploaded
  sources. Added interactive fitting for missing model/source artifacts, including
  progress reporting and explicit OpenAI data-sharing/cost acknowledgement.
- 2026-07-15: Fixed OpenAI 429 failures caused by document-count batching. Added
  exact token batching, long-document aggregation, TPM throttling, reset-aware
  retries, API-limit header detection, and preflight token/time disclosure.
- 2026-07-19: Restructured the frontend into feature folders (`web/src/app/`,
  `web/src/features/`) with an Overview landing page (card/row corpus views),
  workspace tabs renamed Structure/Map/Search/Evaluate, and a bilingual
  English/Sorani UI with RTL support. Fixed invisible primary-button labels by
  teaching tailwind-merge the custom noor-ui font-size scale (it had been
  stripping `text-primary-action-text` as a conflicting color class), and fixed a
  mobile page overflow caused by an absolutely positioned `sr-only` table-header
  span. Re-verified all routes with Playwright in both themes, desktop and
  mobile, with no console errors.
- 2026-07-17: Added NVIDIA `nemotron-3-embed-1b` as a registered embedding
  provider (`NVIDIA_API_KEY`), tuned for maximum throughput via concurrent
  thread-pool batching rather than OpenAI's single-threaded token-bucket
  queue. Wired into the Explore and Upload model dropdowns with the same
  fit-in-app + acknowledgement UX as OpenAI. `default_model_key()` now prefers
  NVIDIA over OpenAI when both keys are configured.
- 2026-07-15: Made Streamlit repair stale cached OpenAI adapter instances after a
  hot code reload, preventing old class objects from missing new token-estimation
  and throttling methods.
- 2026-07-20: Hid the embedding-model picker from the UI (`best_available_model()`
  serves one run per source); restricted new fits to `openai`/`nvidia`
  (`NEW_FIT_MODELS`) while keeping local-model runs loadable; replaced the
  Evaluate tab with Insights (glance metrics, topic-size Pareto, category
  balance, run provenance); made the corpus rail and header stats collapsible.
- 2026-07-21: Added LLM-generated human-readable topic labels (leaf + internal
  hierarchy nodes, retrofittable on existing runs without re-embedding); made
  the topic hierarchy chart show a visible corpus-root node; rebuilt "Ask the
  corpus" as real RAG (per-document retrieval + cited LLM answer, not
  topic-centroid ranking); added a provider-agnostic chat/completion client
  (Ollama/OpenAI/NVIDIA) separate from the embedding provider.
- 2026-07-24: Made FastAPI/React the sole application path and removed Streamlit;
  restored fitted embedding-model selection for side-by-side OpenAI/NVIDIA
  exploration; constrained the Fly demo to the two 100,000-document
  `corpus-unreviewed` runs; bounded RAG's document-vector cache to one matrix;
  redesigned Ask loading, Corpus distribution, scrolling, and the translucent
  theme-aware app bar.
- 2026-07-24: Extended the theme-aware pointer wobble from the app bar to the
  full application, reduced it to 34 px with a precise click center, moved
  language/theme controls to the physical top-right, and reduced the app bar to
  44% surface opacity with 5 px blur and no divider.
