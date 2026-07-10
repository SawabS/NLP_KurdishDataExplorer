---
name: verify
description: How to launch and drive the Kurdish Data Explorer Streamlit app for end-to-end verification.
---

# Verifying the Kurdish Data Explorer

Everything runs from the conda env `ai` (its bins are NOT on PATH):
`/home/sawab/miniconda3/envs/ai/bin/python`.

## Launch

```bash
/home/sawab/miniconda3/envs/ai/bin/python -m streamlit run app/streamlit_app.py \
  --server.headless true --server.port 8655
```

Startup preloads every `artifacts/<source>__<model>/` run (parquet reads) —
wait until "Topic tree" appears in the page body (~10–60 s).

## Drive (Playwright, installed in the env)

- Sidebar source picker is the **first** `div[data-testid="stSelectbox"]`;
  options are selected via `role=option`.
- **Hidden Streamlit tab panels are excluded from `inner_text`** — click the
  tab (`get_by_text("Model & evaluation")`) before asserting its content.
  Plotly axis/bar labels live in SVG and never appear in `inner_text`;
  screenshot instead.
- Upload flow end-to-end: switch Mode radio to "Upload & explore", choose
  "Path on this machine (large files)", fill the text input with an absolute
  path to a small `.txt` (one Sorani headline per line; make one from
  `data/processed/kndh.parquet`, text column `text_ku`), press Enter, submit
  "Run pipeline". ~1,200 docs completes in about a minute on the GPU.
- Test uploads write `artifacts/<slug>__<model>/` (slug is hyphenated) plus a
  cached embedding in `artifacts/embeddings/` — delete them afterwards.

## Fast checks

```bash
/home/sawab/miniconda3/envs/ai/bin/python -m pytest tests/ -q
./tools/lint_wiki.py   # known pre-existing orphan: synthesis/project-presentation-overview.md
```
