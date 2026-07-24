# Wiki Log

## [2026-07-17] implementation | Add NVIDIA Nemotron-3-Embed-1B as a max-speed embedding provider

- Registered `nvidia` in `EMBEDDING_MODELS`/`EMBEDDING_MODEL_LABELS`
  (`nvidia/nemotron-3-embed-1b`, 2048-dim, 32k-token context), gated on
  `NVIDIA_API_KEY`.
- Added `NvidiaEmbedder` (`src/kurdish_explorer/embed.py`), an OpenAI-compatible
  adapter against `https://integrate.api.nvidia.com/v1`. Optimized for
  throughput rather than the OpenAI adapter's conservative TPM queue: batches
  (`NVIDIA_EMBEDDING_BATCH_SIZE`, default 64) are dispatched concurrently
  across a thread pool (`NVIDIA_EMBEDDING_MAX_CONCURRENCY`, default 8), since
  NVIDIA's hosted endpoint has no documented low per-minute token cap.
  Overlong documents are truncated server-side (`truncate=END`) instead of
  split/recombined locally. 429/5xx responses retry with bounded exponential
  backoff.
- `default_model_key()` now checks `NVIDIA_API_KEY` before `OPENAI_API_KEY`
  (NVIDIA is the faster default once configured); `KDX_EMBEDDING_PROVIDER`
  still overrides explicitly.
- Wired into both model dropdowns (Explore a source, Upload & explore) via the
  existing generic `EMBEDDING_MODELS` iteration in `pipeline.available_model_options`
  — no dropdown-specific code needed. Added an NVIDIA branch next to the OpenAI
  one in `streamlit_app.py`'s interactive-fit flow (API-key check + explicit
  data-sharing/cost acknowledgement before fitting).
- Also fixed stale documentation: README's Quickstart and setup sections still
  referenced `.env.example`, which was deleted in a prior commit
  (`22b7989`). Replaced with inline `.env` instructions covering both
  `OPENAI_API_KEY` and `NVIDIA_API_KEY`.
- Added `NvidiaEmbedder` unit tests (batching/ordering/normalization, multi-batch
  dispatch + progress) and `default_model_key` precedence tests; full suite
  (10 tests) passes.

## [2026-07-15] fix | Repair stale OpenAI adapter after Streamlit hot reload

- Root cause: Streamlit reran `streamlit_app.py` while Python retained the older
  imported embedding module and its LRU-cached `OpenAIEmbedder` instance. The old
  object predated `estimate_tokens()`.
- Added capability detection plus targeted cache clearing/module reload before
  OpenAI token estimation or fitting.
- Simulated the stale object and confirmed automatic recovery; all six tests pass.

## [2026-07-15] fix | OpenAI embedding batches respect TPM limits

- Root cause: a 128-document request contained 288,005 tokens against the
  organization's 40,000 TPM `text-embedding-3-small` limit.
- Replaced document-count-only requests with exact tokenizer-based batching and
  a 90% sliding-window TPM budget. Overlong documents are split into token chunks
  and reduced back to one normalized vector using a token-weighted mean.
- Added bounded 429 retries with jitter and server reset headers; successful API
  responses can raise the limiter automatically when the account tier is higher.
- Streamlit now shows an exact token count and theoretical minimum duration before
  enabling an OpenAI fit. AsoSoft's saved 7,108 documents contain 29.34M tokens,
  implying at least 13.6 hours at 40k TPM.
- Added `tiktoken`, `.env.example` throttle settings, and regression tests for
  token-budget packing, long-document splitting, aggregation, and progress.

## [2026-07-15] implementation | Interactive embedding-model selection and fitting

- Added model selectors to existing-source exploration and the upload workflow.
- Unfitted model/source combinations remain visible and can now be fitted inside
  Streamlit using the source's saved documents; progress is reported in the UI.
- OpenAI fitting requires explicit acknowledgement that source text is sent to
  OpenAI and API charges may apply.
- Verified selector state, confirmation gating, and the fit callback with
  Streamlit's application-test harness; no API request was sent during testing.

## [2026-07-11] research | Anisotropy diagnosis: the mega-topics were a fit bug, now fixed

User reported the model "performing bad". Root-caused and fixed:

- **Diagnosis:** the KDX (TSDAE) embedding space is severely anisotropic — mean
  cosine between *random* KNDH documents is **0.951** (base MiniLM: 0.171).
  The shipped run's topic 0 (27,220 docs) was a junk cluster: near-uniform
  label mix (27% social / 23% economic / 23% health / 20% sci-tech / 7% sport).
  Mean-centering and PCA-whitening restore isotropy in the metric (0.951 →
  0.004) but NOT the cluster structure — the blob survives, so the collapse is
  geometric, not just a common mean direction.
- **Remedy sweep** (cached embeddings, HDBSCAN on shared UMAP reductions):
  EOM selection always grows a ~50% mega-cluster; **leaf selection over a wider
  UMAP neighborhood (n_neighbors=50, min_cluster_size=100)** yields 46 native
  topics (largest 3%) with ~70% native outliers that c-TF-IDF reassignment
  distributes cleanly: final largest topic 6%, NMI 0.159 → **0.212** (base:
  0.232), NPMI +0.038 → **+0.057**. Better than the old KDX fit on every
  tracked KDX diagnostic.
- **Shipped:** `config.MODEL_FIT_OVERRIDES` applies per-model UMAP/HDBSCAN
  overrides at fit time (explicit `--min-cluster-size` still wins). Refit
  `kndh__kdx-minilm-tsdae` (46 topics, NPMI +0.057, LDA/NMF baselines kept) and
  `asosoft__kdx-minilm-tsdae` (5 → 10 topics, NPMI +0.049 — long-doc
  under-segmentation is reduced but not solved).
- **Upload-path verification:** restarted Streamlit and submitted the 54.0 MB
  AsoSoft Small raw text through the server-path upload flow. The UI processed
  7,108 line-documents with KDX + normalization and returned 12 topics, NPMI
  +0.063, in 51.7 seconds.
- The 2026-07-10 "known open issue" (mega-topics) is now resolved for KNDH.

## [2026-07-11] update | "Ask the corpus" semantic search + AsoSoft refits

- New explorer tab **Ask the corpus**: one-click example questions (three Sorani,
  one English to demonstrate the multilingual embedder) plus free-text input. The
  query is embedded with the run's KDX embedder and matched to per-topic centroid
  vectors (computed from the pipeline's cached document embeddings — no
  re-embedding; keyword-embedding fallback if a run's cache is missing). Shows
  the top-3 topics with sample documents and highlights the best topic on the 2D
  map. Displayed as *relative* match (best = 100%) because TSDAE embeddings are
  anisotropic — raw cosines bunch near 1.0 and would all read "0.99".
- Fitting audit: both registered embedders load; all four registered runs load;
  a fresh 1,500-doc end-to-end fit works. Found both AsoSoft runs degenerate
  (refit at some point with the 50k-tuned default mcs=250 → 2–4 topics).
  Restored `asosoft__minilm` at the documented mcs=25 → 47 topics, NPMI 0.081
  (matches the table below). Refit `asosoft__kdx-minilm-tsdae` → 5 topics,
  NPMI 0.086.
- **New finding:** the KDX (TSDAE) space collapses *long running-text documents*
  — an offline sweep on AsoSoft gives only 4–5 topics at any granularity
  (mcs 10/15/25), largest cluster 2,671 of 7,108, while base MiniLM separates
  47 topics. TSDAE was adapted on sentence-length text (headlines + split
  sentences), so long documents average out. KDX remains the production model
  for sentence/headline-scale text, which is the app's primary use case;
  recorded as a limitation on [[KDX-MiniLM-TSDAE (fine-tuned embedder)]].

## [2026-07-10] update | "One clear model" cleanup: KDX becomes the single production embedder

The app had drifted vague: five registered embedding models (E5-base never even
fitted), a model dropdown, and no in-app statement of what the model is or what it
was trained on. Unified around one model with a clear story:

- `config.EMBEDDING_MODELS` reduced to `kdx-minilm-tsdae` (production) + `minilm`
  (evaluation comparison only); DistilUSE / MPNet / E5-base unregistered (all
  negative NPMI on KNDH; artifacts left on disk). Default flipped to KDX with a
  `default_model_key()` base-MiniLM fallback for fresh clones.
- Explorer sidebar: model dropdown and "fit required" notices removed; the embedder
  is chosen automatically per source. Upload page likewise always uses KDX.
- "Baselines" tab replaced by **Model & evaluation**: states the model, its TSDAE
  training data (~110k KNDH + AsoSoft sentences, seed 42), the NMI trade-off, and
  one NPMI chart (KDX vs base MiniLM vs LDA/NMF).
- Updated [[KDX-MiniLM-TSDAE (fine-tuned embedder)]] and
  [[Implementation and Methodology]] to record the decision; README rewritten to
  the single-model story.
- Visualization pass (same day): the topic tree now propagates each node's
  dominant category up from its descendant leaves (internal boxes were all grey
  at the default depth); the topic×category heatmap is row-normalized to
  %-of-topic (the 27k-doc mega-topic was stretching the raw-count scale so every
  other row rendered near-white), raw counts moved to hover; the upload page's
  auto granularity now scales min_cluster_size ≈ docs/100 (clamped 15–250)
  instead of silently using the 50k-doc default, which collapsed small uploads
  into 2 topics.
- Known open issue (disclosed, not fixed): the shipped `kndh__kdx-minilm-tsdae`
  run has two mega-topics (27,220 + 16,058 docs = 86% of the corpus) with a long
  tail of small ones — a property of the dense TSDAE embedding space (see the
  tuning sweep in `artifacts/tuning_kndh_kdx-minilm-tsdae.json`). Candidate
  remedies to evaluate: different UMAP n_neighbors/n_components, HDBSCAN
  min_samples, or `cluster_selection_method="leaf"`.

## [2026-07-04] lint+ingest | Pre-presentation wiki review and consolidated overview

User is presenting the project tomorrow and generating a NotebookLM podcast from
the sources. Reviewed the whole wiki for staleness ahead of that:

- Found `entities/kdx-minilm-tsdae-model.md` stuck at `status: draft` with a change
  log saying "evaluation pending," even though the file's own body already
  contained the finished comparison table. Fixed: status set to `stable`,
  `updated` bumped, change log entry added, open questions section split into
  "answered" vs still-open.
- Found `synthesis/kurdish-data-explorer-pipeline.md`'s "Open questions / risks"
  section pre-dated the finished implementation: data-availability and
  topic–label-alignment questions were already answered by
  [[Implementation and Methodology]], and the embedding-backbone question needed
  narrowing (KuBERT was never wired into the embedding stage). Reconciled.
- All other pages checked (`status:` field, line counts 47–86 lines each) were
  consistently detailed with no orphans or contradictions found.
- Created `synthesis/project-presentation-overview.md`: a single linear narrative
  (problem → literature review → methodology → tuning → results/trade-offs → app
  → limitations → conclusion) meant to be the primary upload for NotebookLM /
  presentation prep, since a fragmented wiki graph makes for a worse podcast
  source than one coherent document.

Updated `wiki/index.md` (new synthesis entry).

Unresolved / pending (unchanged from before):

- AsoSoft Large (75M) + topic-annotated RAR (needs `unrar`) not yet ingested.
- Kurdish-specific KuBERT was never wired into the embedding stage — untested
  against multilingual sentence-transformers for this clustering task.

## [2026-07-03] build | Streamlit UI polish, upload-read efficiency, and verification

Updated the live explorer UI and documentation after a codebase/wiki/doc/env pass:

- Model selectors use friendly labels from `EMBEDDING_MODEL_LABELS`; unfitted
  model/source pairs remain visible as `fit required`.
- Dark-theme Plotly styling now covers chart titles, axes, legends, colorbars,
  hover labels, topic/category heatmap scale, and single-series bar accents.
- Topic-tree rendering defaults to 3 visible levels, keeps drill-down available,
  hides the Plotly pathbar that produced `undefined`, and uses theme-aware tree
  colors.
- Upload table handling now peeks schemas cheaply and reads only the selected text
  and optional label columns for CSV/TSV/Excel/Parquet inputs.
- README was rewritten to document the application, pipeline, artifacts, wiki, and
  reproducibility commands.
- Verification: `python -m pytest` passed (1 test). Streamlit was launched on
  `127.0.0.1:8602` and checked with Playwright across KNDH, Topic tree / Map /
  Baselines, light/dark themes, icicle/treemap/sunburst layouts, dark tooltip
  computed colors, absence of literal `undefined`, and upload-page rendering.

Unresolved / pending:

- `gh` is not installed in this environment, so GitHub PR creation via GitHub CLI
  was unavailable. Plain `git` push may still work if SSH credentials are present.

## [2026-06-26] build | Drill-down topic tree, source isolation, and upload engine

Three user-requested features for the demo, all documented in
[[Implementation and Methodology]]:

- **Drill-down topic hierarchy.** Topics are now an interactive tree
  (icicle / treemap / sunburst) built from BERTopic `hierarchical_topics`: click a
  broad cluster to reveal sub-topics; box size = document count; hover shows
  keywords + count + a sample; a leaf inspector shows counts and example texts, with
  the distribution placed directly below. New `topics.hierarchy_nodes()` +
  `hierarchy.json` artifact.
- **Source-first navigation, no mixing.** The app picks a *source* then a model;
  each run is one corpus only, with a provenance banner. Added an explorable
  **AsoSoft** run (7,108 docs, 47 topics, NPMI +0.081, mcs=25) alongside the two
  KNDH runs.
- **Generic upload engine.** `app/upload_page.py` + `pipeline.run_on_texts()` accept
  a `.txt` (line/paragraph) or table (`.csv/.tsv/.xlsx/.parquet`, choose column);
  server-path input + streamed reads + a sample cap target hundreds-of-MB inputs.

Regenerated all artifacts with hierarchy and refreshed the comparison numbers to the
shipped runs: base MiniLM 48 topics / NPMI -0.056 / NMI 0.224; TSDAE 45 / +0.038 /
NMI 0.159 (TSDAE now wins coherence, diversity, and outliers; base wins label
alignment). Numbers in [[KDX-MiniLM-TSDAE (fine-tuned embedder)]] updated to match.

## [2026-06-26] build | Pipeline implementation, BERTopic tuning, and TSDAE fine-tuning

Documented in full at [[Implementation and Methodology]]. Summary of work done:

- **Environment**: `ai` conda env (Python 3.11, RTX 4060). Installed bertopic,
  umap-learn, hdbscan, gensim, streamlit, klpt (+chunspell), datasets, etc.; torch
  2.11+CUDA already present. Pinned `huggingface_hub==1.21.0` to resolve a
  datasets/transformers version clash.
- **Data**: KNDH downloaded from Mendeley (50k, 5 balanced classes — confirmed
  *economic, health, science & technology, social, sport*); AsoSoft Small (~4.9M
  tokens) cloned from GitHub. Both prepared to Parquet.
- **Code**: scaffolded `src/kurdish_explorer/` (config, data, preprocess, embed,
  topics, baselines, evaluate, pipeline) + `scripts/` + Streamlit `app/`.
- **BERTopic tuning** (full 50k): fixed a c-TF-IDF vectorizer bug, added MMR + outlier
  reassignment, tuned HDBSCAN (`min_cluster_size=250, min_samples=10`). Final NPMI
  -0.053 (beats LDA -0.149; NMF +0.107), 46 topics, 0.06% outliers.
- **Fine-tuning**: launched domain-adaptive **TSDAE** on ~110k Sorani sentences to
  produce [[KDX-MiniLM-TSDAE (fine-tuned embedder)]] (unsupervised, keeps the model
  general-purpose). Batch 8, lr 3e-5, 1 epoch, RTX 4060. Comparison vs base MiniLM
  pending completion.
- **App**: added a 2D document Map tab (sampled for scale).

Corrected the KNDH wiki pages: 5th category confirmed as "science & technology"
from the released data (paper prose was inconsistent).

Unresolved / pending:

- AsoSoft Large (75M) + topic-annotated RAR (needs `unrar`) not yet ingested.

## [2026-06-26] eval | TSDAE fine-tuning comparison completed

TSDAE training finished (train_loss 11.54, ~45 min). Compared
[[KDX-MiniLM-TSDAE (fine-tuned embedder)]] vs base MiniLM on full KNDH:

- Base MiniLM (mcs=250): 44 topics, NPMI -0.038, diversity 0.864, NMI 0.232.
- KDX-MiniLM-TSDAE (mcs=50): 88 topics, NPMI +0.009, diversity 0.855, NMI 0.175.

Honest finding: TSDAE improved coherence and cluster confidence (fewer outliers) but
reduced alignment with the 5 human categories; it also needed its own granularity
(mcs 250→50). Both models ship and are selectable in the app. Numbers written into
[[KDX-MiniLM-TSDAE (fine-tuned embedder)]] and [[Implementation and Methodology]].
Both 50k artifacts regenerated with 2D map coordinates; app verified (both runs
load, Map tab renders).

## [2026-06-26] ingest | Bootstrap wiki from 8 Kurdish NLP sources

First ingest pass. Processed all eight PDFs in `raw/sources/` into the wiki.

Sources ingested:

- KLPT – Kurdish Language Processing Toolkit (Ahmadi 2020)
- Kurdish News Dataset Headlines (KNDH) (Badawi et al. 2023)
- Toward Kurdish Language Processing: AsoSoft Text Corpus (Veisi et al. 2019)
- The Kurdish Language Corpus: State of the Art (Azzat et al. 2023)
- Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et al. 2024)
- Idiom Detection in Sorani Kurdish Texts (Omer & Hassani 2025)
- A Transformer-based NMT Model for Sorani (Badawi 2023)
- Morphological Feature Extraction for Sorani Dialect Identification (Bharati et al. 2026)

Created:

- 8 source pages in `wiki/sources/`
- 6 entity pages (`klpt`, `kndh`, `asosoft-text-corpus`, `bertopic`, `kubert`, `soran-badawi`)
- 7 concept pages (`central-kurdish-sorani`, `low-resource-languages`, `topic-modeling`, `morphological-richness`, `text-normalization`, `transformer-models`, `text-classification`)
- 1 synthesis page (`kurdish-data-explorer-pipeline`)
- Updated `wiki/index.md`.

Unresolved issues / cautions:

- Fifth KNDH category label is inconsistent in the source (science vs education); recorded as science per the channel breakdown, with the discrepancy noted on the page.
- NMT BLEU 0.45 and idiom ~99% accuracy are strong claims on small data; flagged as encouraging, not decisive.
- AsoSoft and KNDH licensing/availability for direct ingestion not yet confirmed.
## [2026-07-17] migrate | FastAPI and React web application

- Replaced the Streamlit presentation layer with a FastAPI artifact/search/upload/job
  API and a Vite/React SPA built from noor-ui source via npm workspaces.
- Added shareable source/model/tab routes, Plotly hierarchy and WebGL map views,
  semantic topic search, streamed uploads, serialized fit jobs, mtime-keyed run
  caching, production SPA serving, and self-hosted Arabic fonts.
- OpenAI and NVIDIA remain first-class embedding choices and are selected by the
  existing provider preference when keys are configured; local models remain
  available for offline work and comparison.
- Verification: 21 pytest tests passed, TypeScript and Vite production build passed,
  real KNDH artifact endpoints returned HTTP 200, and Playwright desktop/mobile
  checks found no console errors or horizontal overflow.
## [2026-07-18] restore | Retain the Streamlit application

- Restored `app/streamlit_app.py`, `app/upload_page.py`, and `.streamlit/config.toml`
  alongside the FastAPI + React application.
- Re-added the Streamlit dependency and documented independent launch commands.
- Both interfaces continue to use the unchanged `src/kurdish_explorer/` engine and
  the same per-run artifacts; no data migration or duplicate fit is required.

## [2026-07-18] document | Application architecture and operation

- Added [[Application Architecture and Operation]], a full-stack operating guide
  with Mermaid diagrams for system topology, browser/API requests, and fit/upload
  jobs.
- Documented development, production-like, and Streamlit launch modes and common
  startup failures.
- Replaced the frontend-only root development command with a supervised launcher
  that starts and stops FastAPI and Vite together.

## [2026-07-19] fix+feature | UI restructure polish, view toggle, theme-token fix

- Fixed primary buttons rendering as blank black/white pills: tailwind-merge did
  not know the noor-ui typography scale, so `text-caption` (a font size) was
  merged against `text-primary-action-text` (a color) and stripped it. `cn()` now
  extends tailwind-merge with the custom font-size class group.
- Added a persisted Cards/Rows view toggle to the Overview corpus list so many
  datasets stay scannable; the row view is a sortable-width table with model
  badges and works in RTL and on mobile.
- Fixed a mobile horizontal-overflow bug: an absolutely positioned `sr-only`
  header span anchored to the document; the header cell is now `relative`.
- Playwright tour of Overview, Upload, and all four explore tabs in light and
  dark themes, English and Sorani (RTL), desktop and 390px mobile: no console
  errors, no page overflow; search, tree layouts, and map table verified live.

## [2026-07-20] redesign | Data-first UI: hide the embedding model, Evaluate → Insights

User feedback: the app read as an embedding-model comparison tool, not a data
explorer, and the Evaluate tab (NPMI/LDA/NMF/model dossier) was too technical
for a general audience while adding little for technical users either.

- **Embedding model hidden from the UI.** `CorpusContext` now shows only
  Corpus + Category, no model picker. `GET /sources` returns one "best
  available" run per source via `config.best_available_model()`
  (`MODEL_PREFERENCE`: openai > nvidia > kdx-minilm-tsdae > minilm > mpnet >
  distiluse > e5-base). The URL still carries `/explore/:source/:model/:tab`
  (the model is derived, not chosen) so links stay shareable.
- **Only `openai`/`nvidia` offered for NEW fits.** `config.NEW_FIT_MODELS`
  restricts the Upload page's model selector to the two hosted providers;
  `config.EMBEDDING_MODELS` still lists the local keys (`kdx-minilm-tsdae`,
  `minilm`, ...) purely so already-fitted corpora (kndh, asosoft) keep
  loading. `GET /models` (`server/kdx_server/routers/models.py`) now returns
  richer `ModelCard`s (`key_present`, `provider`, `hosted`) and an `auto`
  field naming the model a new fit would pick with no explicit choice.
- **Evaluate tab replaced by Insights** (`features/explore/insights/InsightsView.tsx`):
  glance metrics (coverage %, largest-topic share, median/avg topic size), a
  share-based topic-size Pareto (bars = % of corpus, line = cumulative
  coverage, one shared axis), a category-balance bar for labeled corpora, and
  a "how this run was built" provenance section (source file, document
  count/rules, embedding model, normalization, fit time). The old
  coherence/baseline endpoints (`/coherence`, `/baselines`) still exist
  server-side but are no longer surfaced in the UI.
- **Sidebar and stats become collapsible.** The corpus-context rail collapses
  via a rail-footer toggle (`layout/WorkspacePanel.tsx`); the header stat row
  (documents/topics/coverage/categories) collapses independently per
  `ExplorePage`, both persisted (localStorage / the panel hook).
- Upload flow gained `FileProfileCard.tsx` and `IngestPlanCard.tsx`
  (structure/plan preview before fitting) and suggested-prompt chips were
  removed from Ask the corpus.

Known documentation debt this created (now fixed by this entry + the
2026-07-21 entry below): this change was shipped without a wiki update; the
"Baselines and evaluation" / "Application" sections of
[[Implementation and Methodology]] still described the old Evaluate tab and
model-dropdown UI until now.

## [2026-07-21] feature | LLM topic labels, visible tree root, and real RAG for Ask the corpus

Follow-on request after 2026-07-20: BERTopic's raw c-TF-IDF keyword labels
("نییە_ئەمە_خۆت_شتێک") read as noise to a general user, the topic-hierarchy
chart had no visible starting point, and "Ask the corpus" only ranked topic
centroids instead of actually answering the question.

- **Human-readable topic names.** New `src/kurdish_explorer/labeling.py`
  batches every hierarchy node (leaf topics *and* internal merge groups) —
  its top keywords plus one representative document — to a chat LLM, asking
  for a short name in the same language as the document (not hardcoded
  Kurdish, since uploaded corpora can be any language). Saved as
  `topic_labels.json` per run, keyed by node id (leaf ids == topic ids, so
  one file covers both the flat topic list and the tree). Runs automatically
  at fit time (`pipeline.run_on_dataframe`) and can retrofit any
  already-fitted run from saved artifacts alone, no re-embedding
  (`pipeline.label_run()`, `POST /runs/{source}/{model}/label`, backed by the
  existing job-queue/progress UI). The frontend's "Name topics" button
  (`structure/NameTopicsAction.tsx`) only appears while some topics are still
  unlabeled; `lib/labels.ts:topicName()` prefers the LLM label everywhere,
  falling back to the old keyword formatting for un-labeled runs.
- **The corpus is now a visible tree root.** `tree.py:build_tree` prepends a
  synthetic `__source__` node (labeled with the corpus title) as the one
  true root and reparents the formerly-rootless top-level hierarchy node(s)
  under it; `StructureView.tsx` removed the `root.color: transparent`
  override that had been hiding this.
- **Real RAG, not topic-centroid search.** `search.py:retrieve()` does actual
  per-document nearest-neighbor search (cosine similarity over the run's
  full cached embedding matrix — brute-force numpy, no vector DB; fast
  enough at these corpus sizes) instead of the old centroid approximation
  (`rank()`, kept for the original `/search` endpoint).
  `search.py:answer()` feeds the retrieved passages to the chat LLM with
  inline-citation instructions; new endpoint `POST /runs/{s}/{m}/ask`.
  `SearchView.tsx` was rewritten as an answer-plus-citations chat UI, and
  degrades gracefully (citations still render even if answer synthesis
  errors).
- **New chat-provider abstraction**, separate from the embedding provider:
  `config.CHAT_MODELS` / `config.default_chat_provider()` / new
  `src/kurdish_explorer/llm.py`. One `chat_complete()` covers Ollama
  (local), OpenAI, and NVIDIA through the same OpenAI-compatible client
  shape (NVIDIA and Google's Gemini API both expose one; Ollama does too).
  `.env`: `KDX_CHAT_PROVIDER` (`ollama|openai|nvidia`), `OLLAMA_CHAT_MODEL`
  (default `qwen2.5:7b-instruct`, already pulled locally),
  `NVIDIA_CHAT_API_KEY`/`NVIDIA_CHAT_MODEL` (falls back to `NVIDIA_API_KEY`
  if unset — lets the chat model use a different NIM deployment/key than
  the embedding provider).
- **Model-latency finding, current config:** started on NVIDIA's
  `google/gemma-4-31b-it` (a real, confirmed-available NIM model) — worked,
  but ~47s+ per call even for trivial replies (cold-start/low-priority
  queuing) and occasional transient 500s; labeling 45 hierarchy nodes took
  ~6 minutes. Switched `NVIDIA_CHAT_MODEL` to `meta/llama-3.1-8b-instruct`
  (~1s/call, confirmed on this account) — same `/ask` query dropped from
  minutes to ~4 seconds with an equally coherent, correctly-cited answer.
  `google/gemma-3-12b-it`/`gemma-3-4b-it` are listed in NVIDIA's model
  catalog but 404 ("not found for account") on this key — not usable
  without a separate provisioning step.
- Verification: full pytest suite green (`test_tree_values_and_depth`
  updated for the new root node), `tsc --noEmit` and `vite build` clean,
  and live end-to-end checks against a real corpus (`mabast-version-2`) —
  labeling job, `/tree` root, and `/ask` retrieval+synthesis all confirmed
  working against the running dev server.
