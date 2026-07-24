#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PYTHON:-/home/sawab/miniconda3/envs/ai/bin/python}"

cd "$ROOT"
exec "$PYTHON" -m uvicorn kdx_server.main:app --app-dir server --host 127.0.0.1 --port "${PORT:-8655}"
