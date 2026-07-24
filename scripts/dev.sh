#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON:-/home/sawab/miniconda3/envs/ai/bin/python}"
WEB_HOST="${WEB_HOST:-127.0.0.1}"
WEB_PORT="${WEB_PORT:-5173}"
API_PORT="${API_PORT:-8600}"

if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="$(command -v python3)"
fi

api_pid=""
web_pid=""

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  [[ -n "$web_pid" ]] && kill "$web_pid" 2>/dev/null || true
  [[ -n "$api_pid" ]] && kill "$api_pid" 2>/dev/null || true
  [[ -n "$web_pid" ]] && wait "$web_pid" 2>/dev/null || true
  [[ -n "$api_pid" ]] && wait "$api_pid" 2>/dev/null || true
  exit "$status"
}
trap cleanup EXIT INT TERM

cd "$ROOT"
export PYTHONPATH="$ROOT/src${PYTHONPATH:+:$PYTHONPATH}"
export KDX_API_ORIGIN="http://127.0.0.1:$API_PORT"

# --reload keeps the API in step with Vite's hot reload; without it an edited
# route keeps serving old responses to a freshly reloaded frontend.
"$PYTHON_BIN" -m uvicorn kdx_server.main:app \
  --app-dir server --host 127.0.0.1 --port "$API_PORT" \
  --reload --reload-dir server --reload-dir src &
api_pid=$!

npm run dev -w web -- --host "$WEB_HOST" --port "$WEB_PORT" &
web_pid=$!

echo "Kurdish Data Explorer development servers"
echo "  Web: http://$WEB_HOST:$WEB_PORT"
echo "  API: http://127.0.0.1:$API_PORT/api/health"

wait -n "$api_pid" "$web_pid"
