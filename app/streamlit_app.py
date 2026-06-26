"""Kurdish Data Explorer: interactive Streamlit app.

Reads precomputed artifacts from ``artifacts/<source>__<model>/`` (produced by
``scripts/run_pipeline.py`` or the in-app uploader) so the UI stays responsive
without re-fitting models.

Design principles the user asked for:
- **Source-first, no mixing.** You pick a *source* (KNDH, AsoSoft, an upload),
  then an embedding model. A run only ever shows one source's documents.
- **Drill-down topic tree.** Topics are shown as a hierarchy you can expand from
  broad clusters into specific sub-topics, with per-node document counts and
  example text for intuition.
- **Transparency.** Every source's provenance, size, and settings are visible.
- **Theme-aware.** All charts follow the active light/dark theme (switchable in
  the Settings menu, top-right).
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

# Human-readable provenance shown next to each source so users know what they
# are exploring and never confuse one corpus with another.
SOURCE_INFO = {
    "kndh": {
        "name": "KNDH: Kurdish News Dataset Headlines",
        "desc": "50,000 Sorani news headlines, 5 balanced categories "
                "(economic, health, science & technology, social, sport). "
                "Labeled; KLPT-preprocessed. Source: Badawi et al. 2023 (Mendeley).",
        "labeled": True,
    },
    "asosoft": {
        "name": "AsoSoft Text Corpus (Small)",
        "desc": "About 7,100 documents of running Sorani text (~4.9M tokens). "
                "Unlabeled; normalized at source. Source: Veisi et al. 2019 (GitHub).",
        "labeled": False,
    },
}

# Qualitative palette for category coloring (readable in both themes).
_CAT_PALETTE = px.colors.qualitative.Set2
_GROUP_COLOR = "#9aa7b3"  # neutral grey for internal (non-leaf) tree nodes


def source_meta(source: str) -> dict:
    if source in SOURCE_INFO:
        return SOURCE_INFO[source]
    # Uploaded / ad-hoc source: pull a friendly title from its saved meta.
    m = pipeline.run_meta(_first_run_for(source))
    return {
        "name": m.get("title", source),
        "desc": f"User-uploaded source, {m.get('n_docs', '?')} documents"
                + (", labeled" if m.get("has_labels") else ", unlabeled"),
        "labeled": bool(m.get("has_labels")),
    }


def _first_run_for(source: str) -> str:
    models = pipeline.runs_by_source().get(source, [])
    return f"{source}__{models[0]}" if models else f"{source}__"


@st.cache_data(show_spinner=False)
def _load(run: str) -> dict:
    return pipeline.load_run(run)


# ---------------------------------------------------------------------------
# Theme-aware chart styling
# ---------------------------------------------------------------------------
def _theme_type() -> str:
    """Active Streamlit theme ('light' or 'dark'); robust to API quirks."""
    try:
        return st.context.theme.type or "light"
    except Exception:
        return "light"


def themed(fig, height: int | None = None):
    """Make a Plotly figure follow the active light/dark theme.

    Uses a transparent background so the chart blends with the Streamlit canvas,
    and a matching template + font color so text stays readable in both themes.
    """
    dark = _theme_type() == "dark"
    fig.update_layout(
        template="plotly_dark" if dark else "plotly_white",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color="#e6e6e6" if dark else "#1a1a1a"),
    )
    if height is not None:
        fig.update_layout(height=height)
    return fig


# ---------------------------------------------------------------------------
# Hierarchy / tree helpers
# ---------------------------------------------------------------------------
def topic_samples(docs: pd.DataFrame) -> dict[int, str]:
    """One short representative snippet per topic, for hover intuition."""
    out: dict[int, str] = {}
    for tid, grp in docs[docs["topic"] != -1].groupby("topic"):
        out[int(tid)] = str(grp["text"].iloc[0])[:120]
    return out


def dominant_categories(docs: pd.DataFrame, has_labels: bool) -> dict[int, str]:
    """Most common human category per topic (labeled sources only)."""
    if not has_labels:
        return {}
    g = docs[docs["topic"] != -1].dropna(subset=["label"])
    if g.empty:
        return {}
    agg = g.groupby("topic")["label"].agg(lambda s: s.value_counts().idxmax())
    return {int(k): str(v) for k, v in agg.items()}


def keyword_string(topic_words: dict, n: int = 4) -> dict[int, str]:
    """Map topic id -> a short space-joined keyword string (for hovers)."""
    return {int(k): " ".join(w for w, _ in v[:n]) for k, v in topic_words.items()}


def build_tree_frame(hierarchy: list[dict], docs: pd.DataFrame, has_labels: bool) -> pd.DataFrame:
    """Turn saved hierarchy nodes into a Plotly icicle/treemap/sunburst frame.

    Leaves carry their dominant human category (labeled sources) so the tree's
    color shows how discovered topics line up with the human labels; internal
    'group' nodes are neutral grey.
    """
    samples = topic_samples(docs)
    dom = dominant_categories(docs, has_labels)
    rows = []
    for node in hierarchy:
        tid = node.get("topic_id")
        is_leaf = node["is_leaf"]
        sample = samples.get(int(tid), "") if tid is not None else ""
        if is_leaf and has_labels:
            category = dom.get(int(tid), "(unlabeled)")
        else:
            category = "(group)"
        rows.append({
            "id": node["id"],
            "parent": node["parent"],
            "label": node["label"] or node["id"],
            "count": node["count"],
            "kind": "topic" if is_leaf else "group",
            "category": category,
            "topic_id": "" if tid is None else str(tid),
            "sample": sample,
        })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    st.title("📰 Kurdish Data Explorer")
    st.caption("Topic modeling and exploratory analysis for Central Kurdish (Sorani) text. "
               "Explore one source at a time, drill into topics, or upload your own text.")

    runs_by_source = pipeline.runs_by_source()

    page = st.sidebar.radio("Mode", ["Explore a source", "Upload & explore"], index=0)
    st.sidebar.caption("Tip: switch light / dark theme in the Settings menu (top-right).")

    if page == "Upload & explore":
        from upload_page import render_upload  # local module
        render_upload()
        return

    if not runs_by_source:
        st.warning(
            "No fitted runs found. Generate one first, e.g.:\n\n"
            "`python scripts/run_pipeline.py --source kndh --model minilm`\n\n"
            "or use **Upload & explore** in the sidebar."
        )
        st.stop()

    # ---- Source-first navigation (never mixes sources) ----
    st.sidebar.markdown("### 1 · Source")
    sources = sorted(runs_by_source)
    source = st.sidebar.selectbox(
        "Corpus to explore", sources,
        format_func=lambda s: source_meta(s)["name"],
    )
    sinfo = source_meta(source)

    st.sidebar.markdown("### 2 · Embedding model")
    models = sorted(runs_by_source[source])
    model = st.sidebar.selectbox("Embedding model", models)
    run = f"{source}__{model}"

    art = _load(run)
    meta, docs = art["meta"], art["documents"]
    topic_info, topic_words = art["topic_info"], art["topic_words"]
    hierarchy = art.get("hierarchy", [])

    # ---- Source banner (provenance shown once, here) ----
    st.info(f"**Source:** {sinfo['name']}  \n{sinfo['desc']}", icon="📚")

    # ---- Header metrics ----
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Documents", f"{meta['n_docs']:,}")
    c2.metric("Topics", meta["n_topics"])
    c3.metric("Outliers", f"{meta.get('n_outliers', 0):,}")
    bt_npmi = meta.get("coherence_npmi", {}).get("BERTopic")
    c4.metric("BERTopic NPMI", f"{bt_npmi:.3f}" if bt_npmi is not None else "n/a")
    st.caption(f"Embedding model: `{meta['model_name']}`, fit in {meta.get('seconds', '?')}s")

    # ---- Optional category filter (labeled corpora only) ----
    view = docs
    has_labels = "label" in docs.columns and docs["label"].notna().any()
    if has_labels:
        labels = ["(all)"] + sorted(docs["label"].dropna().unique().tolist())
        chosen = st.sidebar.selectbox("Filter by category", labels)
        if chosen != "(all)":
            view = docs[docs["label"] == chosen]

    tab_tree, tab_map, tab_eval = st.tabs(["Topic tree", "Map", "Baselines"])
    render_tree_tab(tab_tree, hierarchy, docs, view, topic_info, topic_words, has_labels)
    render_map_tab(tab_map, view, topic_words, has_labels)
    render_baselines_tab(tab_eval, meta, art)


# ---------------------------------------------------------------------------
# Tab: Topic tree (drill-down hierarchy + inspector + distribution)
# ---------------------------------------------------------------------------
def render_tree_tab(container, hierarchy, docs, view, topic_info, topic_words, has_labels) -> None:
    with container:
        if not hierarchy:
            st.info("This run has no saved hierarchy. Re-run the pipeline to enable the tree.")
            return

        st.subheader("Topic hierarchy: click a cluster to drill in")
        st.caption("Start broad, then click into a cluster to reveal its sub-topics. "
                   "Box size is the number of documents; hover for keywords, counts, and a sample."
                   + (" Color shows each topic's dominant category." if has_labels else ""))

        tree = build_tree_frame(hierarchy, docs, has_labels)
        layout = st.radio("Layout", ["Icicle", "Treemap", "Sunburst"], horizontal=True,
                          label_visibility="collapsed")

        if has_labels:
            cats = [c for c in tree["category"].unique() if c not in ("(group)", "(unlabeled)")]
            cmap = {c: _CAT_PALETTE[i % len(_CAT_PALETTE)] for i, c in enumerate(sorted(cats))}
            cmap["(group)"] = _GROUP_COLOR
            cmap["(unlabeled)"] = _GROUP_COLOR
            color_col = "category"
        else:
            cmap = {"group": _GROUP_COLOR, "topic": "#3182bd"}
            color_col = "kind"

        kw = dict(
            ids="id", parents="parent", names="label", values="count",
            branchvalues="total", color=color_col, color_discrete_map=cmap,
            custom_data=["topic_id", "sample", "count", "category"],
        )
        if layout == "Icicle":
            fig = px.icicle(tree, **kw)
        elif layout == "Treemap":
            fig = px.treemap(tree, **kw)
        else:
            fig = px.sunburst(tree, **kw)

        cat_line = "<br>category: %{customdata[3]}" if has_labels else ""
        fig.update_traces(
            hovertemplate=("<b>%{label}</b><br>%{customdata[2]:,} documents"
                           + cat_line + "<br><i>%{customdata[1]}</i><extra></extra>"),
            root_color="rgba(0,0,0,0)",
        )
        fig.update_layout(margin=dict(l=0, r=0, t=10, b=0))
        st.plotly_chart(themed(fig, height=560), use_container_width=True)

        with st.expander("All topics (table)"):
            named = topic_info[topic_info["Topic"] != -1]
            st.dataframe(named[["Topic", "Count", "Name"]].reset_index(drop=True),
                         use_container_width=True, height=300, hide_index=True)

        # ---- Leaf inspector: how many docs, and what they look like ----
        st.markdown("#### Inspect a topic (leaf)")
        leaves = sorted((n for n in hierarchy if n["is_leaf"]),
                        key=lambda n: n["count"], reverse=True)
        opts = {f"{n['label']}  ·  {n['count']:,} docs": int(n["topic_id"]) for n in leaves}
        pick = st.selectbox("Topic", list(opts), key="tree_leaf")
        tid = opts[pick]

        left, right = st.columns([1, 1])
        with left:
            words = topic_words.get(str(tid), [])
            if words:
                wdf = pd.DataFrame(words, columns=["word", "score"]).iloc[::-1]
                fig = px.bar(wdf, x="score", y="word", orientation="h",
                             title=f"Topic {tid} keywords")
                fig.update_layout(margin=dict(l=10, r=10, t=40, b=10))
                st.plotly_chart(themed(fig, height=340), use_container_width=True)
        with right:
            sub = view[view["topic"] == tid]
            st.metric("Documents in this topic (current filter)", f"{len(sub):,}")
            cols = [c for c in ["text", "text_en", "label"] if c in sub.columns]
            st.dataframe(sub[cols].head(12).reset_index(drop=True),
                         use_container_width=True, height=260, hide_index=True)

        # ---- Distribution, below the tree ----
        st.divider()
        st.subheader("Distribution")
        if has_labels:
            ct = (docs[docs["topic"] != -1]
                  .groupby(["topic", "label"]).size().reset_index(name="n"))
            ct["topic"] = ct["topic"].astype(str)
            fig2 = px.density_heatmap(ct, x="label", y="topic", z="n",
                                      title="Documents per (topic, category)")
            fig2.update_layout(margin=dict(l=10, r=10, t=40, b=10))
            st.plotly_chart(themed(fig2, height=520), use_container_width=True)
            st.caption("Where each discovered topic's documents fall across the human categories.")
        else:
            sizes = (docs[docs["topic"] != -1].groupby("topic").size()
                     .reset_index(name="count").nlargest(25, "count"))
            sizes["topic"] = sizes["topic"].astype(str)
            fig2 = px.bar(sizes, x="count", y="topic", orientation="h",
                          title="Largest topics by document count")
            fig2.update_layout(margin=dict(l=10, r=10, t=40, b=10),
                               yaxis=dict(categoryorder="total ascending"))
            st.plotly_chart(themed(fig2, height=520), use_container_width=True)


# ---------------------------------------------------------------------------
# Tab: Map
# ---------------------------------------------------------------------------
def render_map_tab(container, view, topic_words, has_labels) -> None:
    with container:
        if not {"x", "y"}.issubset(view.columns):
            st.info("This run has no 2D coordinates. Re-run the pipeline to enable the map.")
            return
        st.subheader("Document map (2D UMAP)")

        ctrl1, ctrl2 = st.columns([1, 2])
        with ctrl1:
            color_by = (st.radio("Color by", ["Topic", "Category"], horizontal=True)
                        if has_labels else "Topic")
        with ctrl2:
            max_pts = st.slider("Max points to render", 2000, 40000, 12000, step=2000)

        plot_df = view[view["topic"] != -1]
        if len(plot_df) > max_pts:
            plot_df = plot_df.sample(max_pts, random_state=0)

        kwmap = keyword_string(topic_words)
        plot_df = plot_df.assign(
            topic_str=plot_df["topic"].astype(str),
            keywords=plot_df["topic"].map(kwmap).fillna(""),
            snippet=plot_df["text"].str.slice(0, 90),
        )

        if color_by == "Category" and has_labels:
            color_col, legend = "label", True
        else:
            color_col, legend = "topic_str", False

        fig = px.scatter(
            plot_df, x="x", y="y", color=color_col, opacity=0.65,
            custom_data=["topic_str", "keywords", "snippet"],
            labels={"topic_str": "topic", "label": "category"},
        )
        fig.update_traces(
            marker=dict(size=5),
            hovertemplate=("<b>topic %{customdata[0]}</b>: %{customdata[1]}"
                           "<br>%{customdata[2]}<extra></extra>"),
        )
        fig.update_layout(showlegend=legend, margin=dict(l=0, r=0, t=10, b=0),
                          xaxis=dict(visible=False), yaxis=dict(visible=False),
                          legend_title_text="category")
        st.plotly_chart(themed(fig, height=640), use_container_width=True)
        st.caption(f"Showing {len(plot_df):,} of {len(view):,} documents. "
                   "At hundreds-of-MB scale this view samples; topic stats use all documents.")


# ---------------------------------------------------------------------------
# Tab: Baselines
# ---------------------------------------------------------------------------
def render_baselines_tab(container, meta, art) -> None:
    with container:
        st.subheader("Topic coherence (NPMI), higher is better")
        coh = meta.get("coherence_npmi", {})
        if coh:
            cdf = pd.DataFrame({"model": list(coh), "NPMI": list(coh.values())})
            fig = px.bar(cdf, x="model", y="NPMI", text_auto=".3f",
                         title="BERTopic vs LDA vs NMF")
            st.plotly_chart(themed(fig, height=380), use_container_width=True)
        else:
            st.info("No coherence scores stored for this run.")

        if art["baseline_topics"]:
            st.subheader("Baseline topic keywords")
            which = st.radio("Baseline", list(art["baseline_topics"]), horizontal=True)
            bt = art["baseline_topics"][which]
            tidy = pd.DataFrame({
                "topic": [f"topic {i}" for i in range(len(bt))],
                "keywords": [", ".join(t) for t in bt],
            })
            st.dataframe(tidy, use_container_width=True, hide_index=True, height=360)
        else:
            st.caption("Baselines were not computed for this run.")


if __name__ == "__main__":
    main()
