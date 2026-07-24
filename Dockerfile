# Kurdish Data Explorer — single-container deploy (FastAPI serves the built
# React SPA + API from one process). Built for a short-lived Fly.io deployment:
# the deploy-approved fitted corpus is baked into the image rather than
# provisioned on a volume. .dockerignore is the deployment allow-list: local
# corpora, uploads, embedding caches, and model weights stay on disk but never
# enter the Fly build context.

# ---- stage 1: build the React SPA -----------------------------------------
FROM node:20-slim AS web-build
WORKDIR /app

# Install first (cacheable layer) — npm workspaces cover both web/ and the
# vendored noor-ui design system, so both package.json files are needed here.
COPY package.json package-lock.json ./
COPY web/package.json web/package.json
COPY raw/sources/noor-ui/package.json raw/sources/noor-ui/package.json
RUN npm ci

# noor-ui is consumed as raw TS source via vite/tsconfig path aliases (not an
# installed package build), so its source must be present at build time.
COPY raw/sources/noor-ui raw/sources/noor-ui
COPY web web
RUN npm run build -w web

# ---- stage 2: Python runtime ------------------------------------------------
FROM python:3.11-slim AS runtime

# build-essential: hdbscan/umap-learn sometimes need to compile on a platform
# without a prebuilt wheel; cheap insurance against a failed pip install.
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
# CPU-only torch build: the default PyPI resolution pulls a multi-GB
# CUDA-enabled wheel even on a CPU-only host (Fly's shared-cpu machines have
# no GPU) — the explicit index keeps the image far smaller and the build fast.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# Baked-in comparison runs. The build context contains only the completed
# NVIDIA and OpenAI fits of corpus_unreviewed plus their exact semantic-search
# caches (enforced by .dockerignore).
COPY artifacts artifacts

COPY src src
COPY server server
COPY --from=web-build /app/web/dist web/dist

ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["python", "-m", "uvicorn", "kdx_server.main:app", "--app-dir", "server", "--host", "0.0.0.0", "--port", "8080"]
