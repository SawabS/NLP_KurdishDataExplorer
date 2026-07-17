# Kurdish Data Explorer

Interactive topic modeling and exploratory analysis for Central Kurdish (Sorani)
text — and, generically, for any text corpus you point it at. Upload a raw text
file or a dataset with a text column (CSV / TSV / Excel / Parquet, up to
GB-scale via the server-path option) and explore it as a drill-down topic tree,
a 2D document map, free-text semantic search ("Ask the corpus", with one-click
example questions), and keyword/baseline comparisons.

One **BERTopic** pipeline (sentence embeddings → UMAP → HDBSCAN →
c-TF-IDF) with selectable embedding models: **KDX MiniLM**, our
Sorani-adapted embedder; off-the-shelf base MiniLM; **OpenAI** embeddings; and
**NVIDIA Nemotron-3-Embed-1B**, the fastest hosted option (concurrent batched
requests, no OpenAI-style free-tier throttling). LDA/NMF remain evaluation
baselines (NPMI coherence).

## Quickstart

```bash
# 1. Environment (conda env "ai" or equivalent)
pip install -r requirements.txt

# Optional: use a hosted embedding provider for new pipeline runs. Create a
# .env file in the repo root (git-ignored, loaded automatically):
#   OPENAI_API_KEY=sk-...
#   NVIDIA_API_KEY=nvapi-...

# 2. Prepare the built-in corpora (KNDH, AsoSoft) into data/processed/
python scripts/prepare_data.py

# 3. Build the KDX embedder (TSDAE fine-tuning; skippable — the app
#    falls back to base MiniLM until this exists)
python scripts/finetune_tsdae.py

# 4. Fit the pipeline for the built-in sources
#    (writes artifacts/<source>__<model>/)
python scripts/run_pipeline.py --source kndh                        # + LDA/NMF baselines
python scripts/run_pipeline.py --source asosoft --normalize --no-baselines

# 5. Optional: fit the base model too, so the in-app evaluation chart can
#    show KDX vs base MiniLM
python scripts/run_pipeline.py --source kndh --model minilm --no-baselines

# 6. Launch the app after at least one artifact exists
streamlit run app/streamlit_app.py
```

The app preloads fitted artifacts at startup. Use the model dropdown to switch
between fitted embedders for a source; configured models without artifacts are
shown as **fit required** and can be fitted interactively without leaving the
app. OpenAI runs require an explicit acknowledgement because API charges may
apply. The **Model & evaluation** tab documents the active model and coherence
comparison.

Use the in-app **Upload & explore** mode to run the pipeline on your own text;
the result becomes a selectable source next to the built-ins.

## Hosted embedding API setup

Create a local `.env` file in the repo root (git-ignored, loaded automatically
via `python-dotenv`) with whichever provider key(s) you want:

```dotenv
OPENAI_API_KEY=sk-your-key-here
NVIDIA_API_KEY=nvapi-your-key-here
```

Completed local-model artifacts remain available for exploration either way.
To keep using a local model despite a configured key, add
`KDX_EMBEDDING_PROVIDER=minilm` or `KDX_EMBEDDING_PROVIDER=kdx-minilm-tsdae`.
If both `NVIDIA_API_KEY` and `OPENAI_API_KEY` are set, NVIDIA is preferred by
default (it's the faster of the two); set `KDX_EMBEDDING_PROVIDER=openai` to
override.

**OpenAI.** New runs use `text-embedding-3-small` by default — set
`OPENAI_EMBEDDING_MODEL=text-embedding-3-large` to choose another. Requests
are token-aware: long documents are split and recombined, requests stay below
a safe fraction of the configured token-per-minute limit, and 429 responses
retry with server-aware exponential backoff. The default is the free-tier
`OPENAI_EMBEDDING_TPM=40000`; set this environment variable to your
dashboard's higher TPM after upgrading. The adapter also adopts a higher limit
automatically when the API returns it in rate-limit headers.

**NVIDIA.** Get a free key at [build.nvidia.com](https://build.nvidia.com);
new runs use `nvidia/nemotron-3-embed-1b` (2048-dim, 32k-token context) over
NVIDIA's OpenAI-compatible hosted endpoint by default — set
`NVIDIA_EMBEDDING_MODEL` to choose another. This is the fastest embedding
option in the app: unlike the OpenAI adapter's single-threaded token-bucket
queue, requests are batched (`NVIDIA_EMBEDDING_BATCH_SIZE`, default 64 docs)
and fanned out across a thread pool (`NVIDIA_EMBEDDING_MAX_CONCURRENCY`,
default 8 concurrent requests) since NVIDIA's hosted endpoint has no
documented low per-minute token cap. Overlong documents are truncated
server-side (`NVIDIA_EMBEDDING_TRUNCATE=END`) instead of split locally.
Retries on 429/5xx use exponential backoff (`NVIDIA_EMBEDDING_MAX_RETRIES`,
default 6).

## Layout

| Path | What it is |
| --- | --- |
| `app/` | Streamlit UI (`streamlit_app.py`, `upload_page.py`) with a light/dark theme toggle |
| `src/kurdish_explorer/` | The pipeline package: config, data, preprocess (KLPT), embed, topics (BERTopic), baselines, evaluate, pipeline |
| `scripts/` | `prepare_data.py`, `run_pipeline.py`, `tune_bertopic.py`, `finetune_tsdae.py` (domain-adapted embedder) |
| `artifacts/` | Per-run outputs: `documents.parquet`, `topic_info.parquet`, `topic_words.json`, `hierarchy.json`, `coherence.json`, `meta.json`; cached embeddings; tuned models |
| `data/` | `raw/` corpus downloads, `processed/` unified Parquet tables |
| `docs/ARCHITECTURE.md` | Scaling plan: how each stage grows from 50k docs to millions |
| `reports/` | LaTeX project proposal |
| `tests/` | Pytest suite |
| `wiki/`, `raw/`, `tools/`, `AGENTS.md` | The source-grounded research wiki (below) |

## The model

The project presents a single embedding model, registered in
`src/kurdish_explorer/config.py` (`EMBEDDING_MODELS`):

- **`kdx-minilm-tsdae` (KDX MiniLM, default)** — `paraphrase-multilingual-MiniLM-L12-v2`
  domain-adapted to Sorani with unsupervised TSDAE (`scripts/finetune_tsdae.py`).
  Training data: ~120k Sorani sentences — the 50k KNDH headlines plus
  sentence-split AsoSoft running text — deduplicated, shuffled (seed 42), no labels.
- **`minilm` (base MiniLM)** — the unadapted base, kept only as the evaluation
  comparison point.

On KNDH, KDX MiniLM is the only embedder that reaches positive NPMI topic
coherence (+0.057 vs −0.047 for base MiniLM; earlier DistilUSE/MPNet
experiments also scored negative and were unregistered). Because the TSDAE
space is anisotropic, KDX runs use per-model fit overrides
(`config.MODEL_FIT_OVERRIDES`: wider UMAP neighborhood + HDBSCAN leaf
selection) — without them HDBSCAN grows a junk mega-cluster. If the local
TSDAE directory does not exist yet, the app and uploader fall back to base
MiniLM; create it with:

```bash
python scripts/finetune_tsdae.py
```

## Research wiki

`wiki/` is an LLM-maintained, source-grounded knowledge base for the project's
literature (KNDH, AsoSoft, KLPT, BERTopic, …). `raw/sources/` holds the
immutable source PDFs; `AGENTS.md` defines the maintenance rules.

Workflow:

1. Drop source files into `raw/sources/`.
2. Ask the assistant to ingest one source at a time.
3. Review changed wiki files, then commit.
4. Ask questions against the wiki; save valuable answers to `wiki/questions/`
   or `wiki/synthesis/`.
5. Run a lint pass every 5–10 sources.

```bash
./tools/search_wiki.py "dataset"
./tools/lint_wiki.py
grep "^## \[" wiki/log.md | tail -10
```

Rule: never edit files inside `raw/` during wiki maintenance — raw files are
evidence only.
