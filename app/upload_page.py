"""Upload & explore: the generic engine front-end.

Lets a user point the explorer at *their own* text: a plain-text file (one doc
per line or per paragraph) or a tabular file (CSV / Excel / Parquet) where they
pick the text column. The same pipeline (embed → BERTopic → hierarchy → map)
then runs, and the result becomes a selectable source like the built-in corpora.

Scaling notes:
- Browser uploads are capped by Streamlit (``server.maxUploadSize``). For
  hundreds-of-MB files, use the **server path** input, which reads the file
  directly off disk and never goes through the browser.
- Reading is streamed line-by-line so the file is not duplicated in memory.
- Embedding the *full* corpus of a very large file on a single GPU is slow, so a
  ``Documents to embed`` cap lets the live demo sample to a workable size; the
  full-corpus path (memory-mapped embeddings) is the offline ``run_pipeline``
  script. Topic stats always reflect whatever was embedded.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from kurdish_explorer import config, pipeline  # noqa: E402

_TEXT_EXT = {".txt", ".text"}
_TABLE_EXT = {".csv", ".tsv", ".xlsx", ".xls", ".parquet"}


def _iter_lines(path: Path):
    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
        for line in fh:
            yield line.rstrip("\n")


def read_text_documents(path: Path, split: str, min_words: int) -> list[str]:
    """Split a plain-text file into documents (streamed)."""
    docs: list[str] = []
    if split == "Line":
        for line in _iter_lines(path):
            s = line.strip()
            if len(s.split()) >= min_words:
                docs.append(s)
    else:  # Paragraph (blank-line separated)
        buf: list[str] = []
        for line in _iter_lines(path):
            if line.strip():
                buf.append(line.strip())
            elif buf:
                para = " ".join(buf)
                if len(para.split()) >= min_words:
                    docs.append(para)
                buf = []
        if buf:
            para = " ".join(buf)
            if len(para.split()) >= min_words:
                docs.append(para)
    return docs


def read_table_documents(path: Path, text_col: str, label_col: str | None,
                          min_words: int) -> tuple[list[str], list[str] | None]:
    ext = path.suffix.lower()
    if ext in {".xlsx", ".xls"}:
        df = pd.read_excel(path)
    elif ext == ".parquet":
        df = pd.read_parquet(path)
    else:
        df = pd.read_csv(path, sep="\t" if ext == ".tsv" else ",")
    df = df.dropna(subset=[text_col])
    texts = df[text_col].astype(str).tolist()
    labels = df[label_col].astype(str).tolist() if label_col and label_col != "(none)" else None
    keep = [i for i, t in enumerate(texts) if len(t.split()) >= min_words]
    texts = [texts[i] for i in keep]
    labels = [labels[i] for i in keep] if labels is not None else None
    return texts, labels


def _peek_columns(path: Path) -> list[str]:
    if path.suffix.lower() in {".xlsx", ".xls"}:
        return list(pd.read_excel(path, nrows=5).columns)
    if path.suffix.lower() == ".parquet":
        return list(pd.read_parquet(path).head(5).columns)
    sep = "\t" if path.suffix.lower() == ".tsv" else ","
    return list(pd.read_csv(path, sep=sep, nrows=5).columns)


def render_upload() -> None:
    st.title("Upload & explore your own text")
    st.caption("Point the explorer at any text: a dataset's text column or a raw text file "
               "(supports very large files via the server-path option). It becomes its own "
               "isolated source; nothing is mixed with the built-in corpora.")

    method = st.radio("Input", ["Upload a file", "Path on this machine (large files)"],
                      horizontal=True)

    src_path: Path | None = None
    display_name = ""
    if method == "Upload a file":
        up = st.file_uploader("Text (.txt) or table (.csv / .tsv / .xlsx / .parquet)",
                              type=["txt", "text", "csv", "tsv", "xlsx", "xls", "parquet"])
        if up is not None:
            tmp = config.ARTIFACTS_DIR / "uploads"
            tmp.mkdir(parents=True, exist_ok=True)
            src_path = tmp / up.name
            src_path.write_bytes(up.getbuffer())
            display_name = up.name
    else:
        raw = st.text_input("Absolute path to a .txt / .csv / .tsv / .xlsx / .parquet file",
                            placeholder="/home/.../my_corpus.txt")
        if raw:
            p = Path(raw).expanduser()
            if p.exists() and p.is_file():
                src_path = p
                display_name = p.name
            else:
                st.error(f"File not found: {p}")

    if src_path is None:
        st.stop()

    size_mb = src_path.stat().st_size / 1e6
    st.success(f"**{display_name}** · {size_mb:,.1f} MB")

    ext = src_path.suffix.lower()
    texts: list[str] = []
    labels: list[str] | None = None

    with st.form("ingest"):
        st.markdown("#### Parse")
        min_words = st.number_input("Drop documents shorter than (words)", 1, 50, 3)

        if ext in _TEXT_EXT:
            split = st.radio("Split into documents by", ["Line", "Paragraph"], horizontal=True)
            text_col = label_col = None
        elif ext in _TABLE_EXT:
            cols = _peek_columns(src_path)
            text_col = st.selectbox("Text column", cols)
            label_col = st.selectbox("Label column (optional)", ["(none)"] + cols)
            split = None
        else:
            st.error(f"Unsupported file type: {ext}")
            st.stop()

        st.markdown("#### Model & topics")
        model = st.selectbox("Embedding model", list(config.EMBEDDING_MODELS),
                             index=list(config.EMBEDDING_MODELS).index(config.DEFAULT_EMBEDDING_MODEL))
        normalize = st.checkbox("KLPT-normalize (recommended for raw Sorani)", value=True)
        max_docs = st.number_input("Documents to embed (sample cap for live runs)",
                                   500, 200000, 20000, step=500)
        auto_mcs = st.checkbox("Auto cluster granularity", value=True)
        mcs = None if auto_mcs else st.slider("min_cluster_size", 10, 500, 50, step=10)
        with_baselines = st.checkbox("Also compute LDA/NMF baselines (slower)", value=False)

        go = st.form_submit_button("Run pipeline", type="primary")

    if not go:
        st.stop()

    # ---- Parse ----
    with st.spinner("Reading documents…"):
        if ext in _TEXT_EXT:
            texts = read_text_documents(src_path, split, int(min_words))
        else:
            texts, labels = read_table_documents(src_path, text_col, label_col, int(min_words))

    if not texts:
        st.error("No documents passed the length filter. Lower the minimum word count.")
        st.stop()

    total = len(texts)
    if total > max_docs:
        import random
        random.seed(config.SEED)
        idx = sorted(random.sample(range(total), int(max_docs)))
        texts = [texts[i] for i in idx]
        labels = [labels[i] for i in idx] if labels is not None else None
        st.warning(f"Sampled {max_docs:,} of {total:,} documents for this live run "
                   "(raise the cap or use the offline script for the full corpus).")

    # ---- Run ----
    prog = st.progress(0.0, text="Starting…")
    steps = {"Embedding": 0.1, "Clustering": 0.4, "Projecting": 0.7,
             "Building": 0.85, "Fitting": 0.9, "Scoring": 0.95}

    def _progress(msg: str) -> None:
        frac = next((v for k, v in steps.items() if msg.startswith(k)), None)
        prog.progress(frac if frac is not None else 0.5, text=msg)

    run_id = pipeline._slugify(Path(display_name).stem)[:40] or "upload"
    try:
        res = pipeline.run_on_texts(
            texts, title=f"Upload · {display_name}", run_id=run_id,
            labels=labels, model_key=model, normalize=normalize,
            with_baselines=with_baselines,
            min_cluster_size=mcs, progress=_progress,
        )
    except Exception as exc:
        prog.empty()
        st.exception(exc)
        st.stop()

    prog.progress(1.0, text="Done")
    st.success(f"Found **{res.n_topics} topics** across **{res.n_docs:,} documents**. "
               f"NPMI: {res.coherence.get('BERTopic', float('nan')):.3f}")
    st.cache_data.clear()
    st.info(f"Switch **Mode → Explore a source** and pick source **`{run_id}`** "
            "to browse the topic tree, map, and examples.")
