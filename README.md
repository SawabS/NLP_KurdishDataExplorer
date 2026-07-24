# Kurdish Data Explorer

An end-to-end corpus research workspace for Central Kurdish (Sorani). FastAPI
serves a React application for ingesting text, fitting BERTopic, reviewing
documents, comparing embedding providers, and asking grounded questions against
the corpus. The five workspaces are **Structure**, **Map**, **Documents**,
**Ask**, and **Insights**.

One **BERTopic** pipeline (sentence embeddings → UMAP → HDBSCAN → c-TF-IDF)
with selectable **OpenAI**, **NVIDIA**, and local sentence-transformer models.
When provider keys are configured, new runs prefer NVIDIA and then OpenAI;
local KDX MiniLM and base MiniLM remain available for offline research.

The current Fly demo is deliberately narrow: one 100,000-document
`corpus-unreviewed` source with completed NVIDIA and OpenAI fits. Keeping the
deployed corpus fixed makes the provider comparison and human review workflow
clear, reproducible, and small enough for a short-lived demonstration.

## Quickstart

```bash
# 1. Environment (conda env "ai" or equivalent)
pip install -r requirements.txt

# Optional: use a hosted embedding provider for new pipeline runs. Create a
# .env file in the repo root (git-ignored, loaded automatically):
#   OPENAI_API_KEY=sk-...
#   NVIDIA_API_KEY=nvapi-...

# 2. Restore the local noor-ui workspace, install dependencies, and build
./scripts/bootstrap_web.sh

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

For development, start FastAPI and Vite together from the repository root:

```bash
npm run dev
```

Open `http://127.0.0.1:5173`. Vite proxies `/api` requests to FastAPI on
`http://127.0.0.1:8600`. Press Ctrl+C once to stop both processes. To run only
the frontend (when the API is already running), use `npm run dev:web`.

The app reads fitted artifacts through an mtime-keyed cache. A source's model
dropdown lists every completed registered embedding run for that source; the
preference order selects only the initial route. New uploads auto-select a
configured hosted provider (NVIDIA first, then OpenAI) and fall back to a local
model in a keyless installation. Fit and topic-labeling jobs run through one
serialized background worker. Set `PRELOAD_EMBEDDER=1` to construct the
preferred embedder during API startup.

## Deploy to Fly.io

The repository deploys as one container: Node builds the React SPA, then
FastAPI serves both the SPA and `/api`. The existing app name and machine
configuration live in `fly.toml`.

Install and authenticate `flyctl` once:

```bash
curl -L https://fly.io/install.sh | sh
export PATH="$HOME/.fly/bin:$PATH"
fly auth login
```

Configure runtime secrets once per Fly app. Both embedding keys are required to
query the two deployed model spaces; NVIDIA provides chat completions. Values
below are examples, not literal credentials:

```bash
fly secrets set -a kdx-explorer \
  OPENAI_API_KEY="sk-..." \
  NVIDIA_API_KEY="nvapi-..." \
  NVIDIA_CHAT_API_KEY="nvapi-..." \
  NVIDIA_CHAT_MODEL="meta/llama-3.1-8b-instruct" \
  KDX_CHAT_PROVIDER="nvidia"
```

From the repository root, deploy the current working tree:

```bash
npm run typecheck
npm run build -w web
test -f artifacts/corpus-unreviewed__openai/meta.json
test -f artifacts/corpus-unreviewed__nvidia/meta.json
test -f artifacts/embeddings/openai_596f760f62c82cf9.npy
test -f artifacts/embeddings/nvidia_6aaced7846221f39.npy
fly deploy -a kdx-explorer --remote-only
```

The Docker build performs its own frontend build, but the local build above is
a useful pre-deployment check. `--remote-only` uses Fly's remote builder and
does not require local Docker. Deployment is intentionally manual: fitted
artifacts and the local Noor workspace are git-ignored, so a clean GitHub
checkout or GitHub Actions runner does not contain the complete Docker build
context. Run the deploy from the prepared workstation checkout.

Verify the release:

```bash
fly status -a kdx-explorer
fly logs -a kdx-explorer
curl -fsS https://kdx-explorer.fly.dev/api/health
curl -fsS https://kdx-explorer.fly.dev/api/sources
```

The demo artifact set is intentionally controlled by `.dockerignore`; never
delete local artifacts to reduce a deployment. At present, the build context
allows only:

- `artifacts/corpus-unreviewed__nvidia/`
- `artifacts/corpus-unreviewed__openai/`
- `artifacts/embeddings/nvidia_6aaced7846221f39.npy`
- `artifacts/embeddings/openai_596f760f62c82cf9.npy`

This produces one visible source, `corpus-unreviewed`, while retaining the
two model choices and the embedding matrices required by semantic search, RAG,
and nearest-document review. The 231 MB uploaded source file, every other fitted
corpus, and unrelated embedding caches stay local and are excluded from the
image. When replacing a fit later, update both its run-directory and exact-cache
allow-list entries before deploying.

The Fly machine has 2 GB RAM. The OpenAI and NVIDIA matrices are approximately
586 MB and 782 MB; the server therefore caches only one full document matrix at
a time. Switching models can incur a reload, but retaining both would leave too
little memory for FastAPI, pandas, and query processing.

Use the in-app **Upload & explore** mode to run the pipeline on your own text;
the result becomes a selectable source next to the built-ins. Upload asks for no
parameters and supports files up to the server's 2 GB upload limit: the server
streams the file to disk, profiles a bounded head sample of it, and derives the
ingestion plan itself —
what counts as a document, which column holds the text, which column looks like
a category label, and how many documents get embedded. The page reports that
plan (and the auto-selected embedding model) before you start the run, and the
same record is stored in the run's `meta.json` and shown under **How this run
was built** in Insights.

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
a safe fraction of the configured token-per-minute limit, and transient
connections, timeouts, 429s, and 5xx responses retry with server-aware
exponential backoff. The default is the free-tier
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
| `server/kdx_server/` | FastAPI artifact/search/upload/job API and production SPA host |
| `web/` | Vite + React + TypeScript SPA built from noor-ui source and Plotly |
| `src/kurdish_explorer/` | The pipeline package: config, data, preprocess (KLPT), embed, topics (BERTopic), baselines, evaluate, pipeline |
| `scripts/` | `prepare_data.py`, `run_pipeline.py`, `tune_bertopic.py`, `finetune_tsdae.py` (domain-adapted embedder) |
| `artifacts/` | Per-run outputs: `documents.parquet`, `topic_info.parquet`, `topic_words.json`, `hierarchy.json`, `coherence.json`, `meta.json`; cached embeddings; tuned models |
| `data/` | `raw/` corpus downloads, `processed/` unified Parquet tables |
| `docs/ARCHITECTURE.md` | Scaling plan: how each stage grows from 100k docs to millions |
| `reports/` | LaTeX project proposal |
| `tests/` | Pytest suite |
| `wiki/`, `raw/`, `tools/`, `AGENTS.md` | The source-grounded research wiki (below) |

The legacy Streamlit application was removed after the FastAPI/React migration
became the sole product direction. Runtime UI code now has one entry point and
one deployment path.

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

For the current deterministic 100,000-document demo sample, the NVIDIA run has
32 topics, 552 outliers, and NPMI 0.04915; its cache-reusing refit took
337.4 seconds, while the earlier cold NVIDIA fit took 597.5 seconds. The OpenAI
`text-embedding-3-small` run took 3,628.7 seconds and has 38 topics, 868
outliers, and NPMI 0.03742. These are end-to-end fit measurements, not a
controlled embedding-only benchmark; they make the practical speed/structure
trade-off visible on the same corpus.

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
