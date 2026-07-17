---
name: verify
description: Launch and verify the FastAPI + React Kurdish Data Explorer.
---

# Verifying the Kurdish Data Explorer

The Python environment is `/home/sawab/miniconda3/envs/ai/bin/python`.
The React production bundle is served by FastAPI so API and SPA routing are
verified together.

## Launch

```bash
npm run build -w web
./scripts/serve_web.sh
```

The default URL is `http://127.0.0.1:8655`. Use `PORT=8656` when that port is
occupied. For development, run Uvicorn on 8600 and `npm run dev -w web`; Vite
proxies `/api` to Uvicorn.

The retained Streamlit app can be launched independently:

```bash
/home/sawab/miniconda3/envs/ai/bin/python -m streamlit run app/streamlit_app.py \
  --server.headless true --server.port 8655
```

When verifying both, run FastAPI/React with `PORT=8656`.

## Browser flows

Use Playwright from the `ai` environment:

- Open `/` and wait for `Topic hierarchy`; assert four metric cards are visible.
- Switch Topic tree layouts and depth; click a topic and inspect Sorani samples.
- Open Document map, change color mode and point cap, and assert Plotly renders.
- Open Ask the corpus, submit a Sorani example, and follow the best topic to Map.
- Toggle theme and verify the control state changes without console errors.
- Open Upload, use a small `.txt` or CSV, start a local-model fit, and poll until
  redirect to the new `/explore/<source>/<model>/tree` route.
- Repeat the explorer load at a 390x844 viewport and assert no horizontal page
  overflow.

## Fast checks

```bash
/home/sawab/miniconda3/envs/ai/bin/python -m pytest tests/ -q
npm run typecheck -w web
npm run build -w web
./tools/lint_wiki.py
```

Test fits write run artifacts and cached embeddings. Remove only artifacts
created specifically for verification; never remove existing user runs.
