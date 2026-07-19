# Kurdish Data Explorer

Interactive topic modeling and exploratory analysis for Central Kurdish (Sorani)
text and, generically, for any text corpus you point it at. Upload a raw text
file or a dataset with a text column (CSV / TSV / Excel / Parquet, up to
GB-scale via the server-path option) and explore it through four workspace tabs:
Structure (drill-down topic tree), Map (2D document map), Search (free-text
semantic search with one-click example questions), and Evaluate
(keyword/baseline comparisons). The Overview landing page lists every corpus
with switchable card and row (table) views.

One **BERTopic** pipeline (sentence embeddings → UMAP → HDBSCAN → c-TF-IDF)
with selectable **OpenAI**, **NVIDIA**, and local sentence-transformer models.
When provider keys are configured, new runs prefer NVIDIA and then OpenAI;
local KDX MiniLM and base MiniLM remain available for offline use and model
comparison. LDA/NMF remain evaluation baselines (NPMI coherence).

## Quickstart

```bash
# 1. Environment (conda env "ai" or equivalent)
pip install -r requirements.txt

# Optional: use a hosted embedding provider for new pipeline runs. Create a
# .env file in the repo root (git-ignored, loaded automatically):
#   OPENAI_API_KEY=sk-...
#   NVIDIA_API_KEY=nvapi-...

# 2. Clone noor-ui at the workspace path, then install frontend dependencies
git clone https://github.com/SawabS/noor-ui.git raw/sources/noor-ui
npm install

# 3. Prepare the built-in corpora (KNDH, AsoSoft) into data/processed/
python scripts/prepare_data.py

# 4. Fit the pipeline for the built-in sources. With NVIDIA_API_KEY or
#    OPENAI_API_KEY configured, omit --model to use the preferred hosted model.
#    (writes artifacts/<source>__<model>/)
python scripts/run_pipeline.py --source kndh
python scripts/run_pipeline.py --source asosoft --normalize --no-baselines

# 5. Build and launch FastAPI + React on http://127.0.0.1:8655
npm run build -w web
./scripts/serve_web.sh
```

In this production-like mode one FastAPI process serves both the API and the
compiled SPA from `web/dist`, so rebuild (`npm run build -w web`) after any
frontend change. If port 8655 is occupied, pick another with
`PORT=8656 ./scripts/serve_web.sh`. The serve script uses the `ai` conda
environment's Python by default; override with `PYTHON=/path/to/python`.

The original Streamlit interface remains supported and reads the same artifacts:

```bash
/home/sawab/miniconda3/envs/ai/bin/python -m streamlit run app/streamlit_app.py \
  --server.headless true --server.port 8655
```

When running both applications simultaneously, use another port for the migrated
web app, for example `PORT=8656 ./scripts/serve_web.sh`.

For development, start FastAPI and Vite together from the repository root:

```bash
npm run dev
```

Open `http://127.0.0.1:5173`. Vite proxies `/api` requests to FastAPI on
`http://127.0.0.1:8600`. Press Ctrl+C once to stop both processes. To run only
the frontend (when the API is already running), use `npm run dev:web`.

The app reads fitted artifacts through an mtime-keyed cache. Use the model
dropdown to switch between fitted embedders; models without artifacts are shown
as **fit required** and run in a serialized background worker. Hosted runs
require an explicit cost acknowledgement. Set `PRELOAD_EMBEDDER=1` to construct
the preferred embedder during API startup.

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

**OpenAI.** New runs use `text-embedding-3-small` by default; set
`OPENAI_EMBEDDING_MODEL=text-embedding-3-large` to choose another. Requests
are token-aware: long documents are split and recombined, requests stay below
a safe fraction of the configured token-per-minute limit, and 429 responses
retry with server-aware exponential backoff. The default is the free-tier
`OPENAI_EMBEDDING_TPM=40000`; set this environment variable to your
dashboard's higher TPM after upgrading. The adapter also adopts a higher limit
automatically when the API returns it in rate-limit headers.

**NVIDIA.** Get a free key at [build.nvidia.com](https://build.nvidia.com);
new runs use `nvidia/nemotron-3-embed-1b` (2048-dim, 32k-token context) over
NVIDIA's OpenAI-compatible hosted endpoint by default; set
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
| `app/` | Retained Streamlit explorer and upload interface |
| `server/kdx_server/` | FastAPI artifact/search/upload/job API and production SPA host |
| `web/` | Vite + React + TypeScript SPA built from noor-ui source and Plotly |
| `src/kurdish_explorer/` | The pipeline package: config, data, preprocess (KLPT), embed, topics (BERTopic), baselines, evaluate, pipeline |
| `scripts/` | `prepare_data.py`, `run_pipeline.py`, `tune_bertopic.py`, `finetune_tsdae.py` (domain-adapted embedder) |
| `artifacts/` | Per-run outputs: `documents.parquet`, `topic_info.parquet`, `topic_words.json`, `hierarchy.json`, `coherence.json`, `meta.json`; cached embeddings; tuned models |
| `data/` | `raw/` corpus downloads, `processed/` unified Parquet tables |
| `docs/ARCHITECTURE.md` | Scaling plan: how each stage grows from 50k docs to millions |
| `reports/` | LaTeX project proposal |
| `tests/` | Pytest suite |
| `wiki/`, `raw/`, `tools/`, `AGENTS.md` | The source-grounded research wiki (below) |

## Embedding models

The registry in `src/kurdish_explorer/config.py` exposes four choices:

- **`nvidia`**: hosted Nemotron embeddings; preferred when `NVIDIA_API_KEY` is set.
- **`openai`**: hosted OpenAI embeddings; preferred when only `OPENAI_API_KEY` is set.
- **`kdx-minilm-tsdae` (KDX MiniLM)**: `paraphrase-multilingual-MiniLM-L12-v2`
  domain-adapted to Sorani with unsupervised TSDAE (`scripts/finetune_tsdae.py`).
  Training data: ~120k Sorani sentences (the 50k KNDH headlines plus
  sentence-split AsoSoft running text), deduplicated, shuffled (seed 42), no labels.
- **`minilm` (base MiniLM)**: the unadapted base, kept only as the evaluation
  comparison point.

On the existing local-model KNDH comparison, KDX MiniLM reaches positive NPMI topic
coherence (+0.057 vs −0.047 for base MiniLM; earlier DistilUSE/MPNet
experiments also scored negative and were unregistered). Because the TSDAE
space is anisotropic, KDX runs use per-model fit overrides
(`config.MODEL_FIT_OVERRIDES`: wider UMAP neighborhood + HDBSCAN leaf
selection); without them HDBSCAN grows a junk mega-cluster. These results are
an offline comparison, not a restriction on using OpenAI or NVIDIA. To create
the optional local TSDAE model:

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

Rule: never edit files inside `raw/` during wiki maintenance; raw files are
evidence only.
