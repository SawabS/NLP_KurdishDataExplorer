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

# 3. Fit a run (writes lightweight artifacts to artifacts/<source>__<model>/)
python scripts/run_pipeline.py --source kndh --model minilm

# 4. Explore
streamlit run app/streamlit_app.py
```

The app never re-fits on load: it reads the precomputed artifacts, so it stays
responsive. Use the in-app **Upload & explore** mode to run the pipeline on
your own text; the result becomes a selectable source next to the built-ins.

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
(`scripts/finetune_tsdae.py`). Models not yet fitted for a corpus appear in the
app marked "fit required" and can be fitted from the sidebar.

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
