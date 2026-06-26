"""Kurdish Data Explorer — interactive Streamlit app.

Reads precomputed artifacts from ``artifacts/<source>__<model>/`` (produced by
``scripts/run_pipeline.py``) so the UI stays responsive without re-fitting models.
Users can browse topics, inspect per-topic keywords and example documents, view
the category distribution, and compare NPMI coherence against LDA/NMF baselines.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from kurdish_explorer import pipeline  # noqa: E402

st.set_page_config(page_title="Kurdish Data Explorer", page_icon="📰", layout="wide")


@st.cache_data(show_spinner=False)
def _load(run: str) -> dict:
    return pipeline.load_run(run)


def main() -> None:
    st.title("📰 Kurdish Data Explorer")
    st.caption("Interactive topic modeling and exploratory analysis for Central Kurdish (Sorani) text.")

    runs = pipeline.list_runs()
    if not runs:
        st.warning(
            "No fitted runs found. Generate one first, e.g.:\n\n"
            "`python scripts/run_pipeline.py --source kndh --model minilm`"
        )
        st.stop()

    run = st.sidebar.selectbox("Run (source · embedding model)", runs)
    art = _load(run)
    meta, docs = art["meta"], art["documents"]
    topic_info, topic_words = art["topic_info"], art["topic_words"]

    # ---- Header metrics ----
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Documents", f"{meta['n_docs']:,}")
    c2.metric("Topics", meta["n_topics"])
    c3.metric("Outliers", f"{meta.get('n_outliers', 0):,}")
    bt_npmi = meta.get("coherence_npmi", {}).get("BERTopic")
    c4.metric("BERTopic NPMI", f"{bt_npmi:.3f}" if bt_npmi is not None else "—")
    st.caption(f"Embedding model: `{meta['model_name']}` · fit in {meta.get('seconds', '?')}s")

    # ---- Optional category filter (labeled corpora only) ----
    view = docs
    if docs["label"].notna().any():
        labels = ["(all)"] + sorted(docs["label"].dropna().unique().tolist())
        chosen = st.sidebar.selectbox("Filter by category", labels)
        if chosen != "(all)":
            view = docs[docs["label"] == chosen]

    tab_topics, tab_map, tab_dist, tab_eval = st.tabs(["Topics", "Map", "Distributions", "Baselines"])

    # ---- Topics tab ----
    with tab_topics:
        named = topic_info[topic_info["Topic"] != -1].copy()
        left, right = st.columns([1, 1])
        with left:
            st.subheader("Discovered topics")
            st.dataframe(
                named[["Topic", "Count", "Name"]].reset_index(drop=True),
                use_container_width=True, height=420,
            )
        with right:
            tid = st.selectbox("Inspect topic", named["Topic"].tolist())
            words = topic_words.get(str(tid), [])
            if words:
                wdf = pd.DataFrame(words, columns=["word", "score"]).iloc[::-1]
                fig = px.bar(wdf, x="score", y="word", orientation="h",
                             title=f"Topic {tid} — top keywords", height=380)
                fig.update_layout(margin=dict(l=10, r=10, t=40, b=10))
                st.plotly_chart(fig, use_container_width=True)

        st.subheader(f"Example documents — topic {tid}")
        ex = view[view["topic"] == tid].head(15)
        cols = [c for c in ["text", "text_en", "label"] if c in ex.columns]
        st.dataframe(ex[cols].reset_index(drop=True), use_container_width=True, height=320)

    # ---- Map tab (2D document scatter) ----
    with tab_map:
        if {"x", "y"}.issubset(view.columns):
            st.subheader("Document map (2D UMAP)")
            max_pts = st.slider("Max points to render", 2000, 40000, 12000, step=2000)
            plot_df = view[view["topic"] != -1]
            if len(plot_df) > max_pts:
                plot_df = plot_df.sample(max_pts, random_state=0)
            plot_df = plot_df.assign(
                topic_str=plot_df["topic"].astype(str),
                hover=plot_df["text"].str.slice(0, 90),
            )
            fig = px.scatter(
                plot_df, x="x", y="y", color="topic_str",
                hover_name="hover", opacity=0.6, height=640,
                labels={"topic_str": "topic"},
            )
            fig.update_traces(marker=dict(size=4))
            fig.update_layout(showlegend=False, margin=dict(l=0, r=0, t=10, b=0))
            st.plotly_chart(fig, use_container_width=True)
            st.caption(
                f"Showing {len(plot_df):,} of {len(view):,} documents. "
                "At hundreds-of-MB scale this view samples; topic-level stats use all documents."
            )
        else:
            st.info("This run has no 2D coordinates. Re-run the pipeline to enable the map.")

    # ---- Distributions tab ----
    with tab_dist:
        st.subheader("Topic sizes")
        sizes = topic_info[topic_info["Topic"] != -1].nlargest(20, "Count")
        fig = px.bar(sizes, x="Topic", y="Count", title="Top 20 topics by document count")
        st.plotly_chart(fig, use_container_width=True)

        if docs["label"].notna().any():
            st.subheader("Topic × category")
            ct = (
                docs[docs["topic"] != -1]
                .groupby(["topic", "label"]).size().reset_index(name="n")
            )
            fig2 = px.density_heatmap(ct, x="label", y="topic", z="n",
                                      title="Documents per (topic, category)", height=600)
            st.plotly_chart(fig2, use_container_width=True)

    # ---- Baselines tab ----
    with tab_eval:
        st.subheader("Topic coherence (NPMI) — higher is better")
        coh = meta.get("coherence_npmi", {})
        if coh:
            cdf = pd.DataFrame({"model": list(coh), "NPMI": list(coh.values())})
            fig = px.bar(cdf, x="model", y="NPMI", text_auto=".3f",
                         title="BERTopic vs LDA vs NMF")
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No coherence scores stored for this run.")

        if art["baseline_topics"]:
            st.subheader("Baseline topic keywords")
            which = st.radio("Baseline", list(art["baseline_topics"]), horizontal=True)
            bt = art["baseline_topics"][which]
            st.dataframe(
                pd.DataFrame({f"topic {i}": t for i, t in enumerate(bt)}).T,
                use_container_width=True,
            )


if __name__ == "__main__":
    main()
