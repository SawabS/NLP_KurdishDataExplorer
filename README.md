# Kurdish Data Explorer

Interactive topic modeling and exploratory analysis for Central Kurdish (Sorani)
text — and, generically, for any text corpus you point it at. Upload a raw text
file or a dataset with a text column (CSV / TSV / Excel / Parquet, up to
GB-scale via the server-path option) and explore it as a drill-down topic tree,
a 2D document map, free-text semantic search ("Ask the corpus", with one-click
example questions), and keyword/baseline comparisons.

One pipeline, one model: **BERTopic** (sentence embeddings → UMAP → HDBSCAN →
c-TF-IDF) on top of **KDX MiniLM**, our Sorani-adapted embedder, with the
off-the-shelf base MiniLM and LDA/NMF kept as evaluation baselines (NPMI
coherence).

## Quickstart

```bash
# 1. Environment (conda env "ai" or equivalent)
pip install -r requirements.txt

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

The app preloads all fitted artifacts at startup and explores every source with
the KDX embedder (there is no model dropdown); the **Model & evaluation** tab
documents the model, its training data, and the coherence comparison.

Use the in-app **Upload & explore** mode to run the pipeline on your own text;
the result becomes a selectable source next to the built-ins.

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
coherence (+0.038 vs −0.047 for base MiniLM; earlier DistilUSE/MPNet
experiments also scored negative and were unregistered). If the local TSDAE
directory does not exist yet, the app and uploader fall back to base MiniLM;
create it with:

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
