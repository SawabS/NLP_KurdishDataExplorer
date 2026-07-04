# Kurdish Data Explorer

Interactive topic modeling and exploratory analysis for Central Kurdish (Sorani)
text — and, generically, for any text corpus you point it at. Upload a raw text
file or a dataset with a text column (CSV / TSV / Excel / Parquet, up to
GB-scale via the server-path option) and explore it as a drill-down topic tree,
a 2D document map, and keyword/baseline comparisons.

Built on sentence-transformer embeddings → UMAP → HDBSCAN → c-TF-IDF
(BERTopic), with LDA/NMF baselines and NPMI coherence evaluation.

## Quickstart

```bash
# 1. Environment (conda env "ai" or equivalent)
pip install -r requirements.txt

# 2. Prepare the built-in corpora (KNDH, AsoSoft) into data/processed/
python scripts/prepare_data.py

# 3. Fast start: precompute one source/model pair
#    (writes artifacts/<source>__<model>/)
python scripts/run_pipeline.py --source kndh --model minilm --no-baselines

# 4. Launch the app after at least one artifact exists
streamlit run app/streamlit_app.py
```

The app preloads the fitted artifacts at startup and the model dropdown only
shows models that already have artifacts for the selected source. The fast-start
path above launches sooner because it fits only MiniLM for KNDH; you can explore
immediately, but only that fitted model is selectable.

For instant switching across every registered model, precompute all models
before launching Streamlit:

```bash
# KNDH, all registered embedding models
python scripts/run_pipeline.py --source kndh --all-models --no-baselines

# Optional: AsoSoft, all registered embedding models.
# AsoSoft is rawer text, so normalize it.
python scripts/run_pipeline.py --source asosoft --all-models --normalize --no-baselines

streamlit run app/streamlit_app.py
```

Use the in-app **Upload & explore** mode to run the pipeline on your own text;
the result becomes a selectable source next to the built-ins.

To add just one model/source pair later, run:

```bash
python scripts/run_pipeline.py --source kndh --model mpnet --no-baselines
```

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

## Embedding models

Registered in `src/kurdish_explorer/config.py` (`EMBEDDING_MODELS`):
MiniLM (default, fast), DistilUSE, MPNet, multilingual-E5-base, and
`kdx-minilm-tsdae` — a TSDAE domain-adapted MiniLM fine-tuned on Sorani text
(`scripts/finetune_tsdae.py`). The `--all-models` flag fits every registered
model for the selected source. If the local TSDAE directory does not exist yet,
create it first:

```bash
python scripts/finetune_tsdae.py
```

Models not yet fitted for a corpus are not selectable in the explorer. Run
`scripts/run_pipeline.py` before launching or rerunning Streamlit to make them
available for instant switching.

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
