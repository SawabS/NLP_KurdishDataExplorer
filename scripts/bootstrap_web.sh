#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NOOR="$ROOT/raw/sources/noor-ui"

if [[ ! -f "$NOOR/package.json" ]]; then
  git clone https://github.com/SawabS/noor-ui.git "$NOOR"
fi

cd "$ROOT"
npm install
npm run build -w web
