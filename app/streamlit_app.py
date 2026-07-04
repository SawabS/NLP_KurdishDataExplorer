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

import html
import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

_APP_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_APP_DIR))                 # so sibling modules (upload_page) import
sys.path.insert(0, str(_APP_DIR.parent / "src"))  # so the kurdish_explorer package imports
from kurdish_explorer import config, pipeline  # noqa: E402

st.set_page_config(page_title="Kurdish Data Explorer", layout="wide")

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

# Soft pastel palette for category coloring (readable in both themes).
_CAT_PALETTE = px.colors.qualitative.Pastel


def _leaf_color() -> str:
    """Pastel blue for unlabeled leaves, tuned per theme."""
    return "#7ba7d7" if current_theme() == "Dark" else "#8fb8e8"


def _group_color() -> str:
    """Neutral grey for internal (non-leaf) tree nodes, tuned per theme."""
    return "#3e4557" if current_theme() == "Dark" else "#b7c0cc"


def category_color_map(categories) -> dict:
    """Stable category -> pastel color, so a label looks the same in every chart.

    Sorting the real categories keeps colors consistent run-to-run; the synthetic
    tree placeholders ('(group)', '(unlabeled)') always fall back to neutral grey.
    """
    cats = sorted(c for c in set(categories) if c not in ("(group)", "(unlabeled)"))
    cmap = {c: _CAT_PALETTE[i % len(_CAT_PALETTE)] for i, c in enumerate(cats)}
    cmap["(group)"] = _group_color()
    cmap["(unlabeled)"] = _group_color()
    return cmap


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
def _load_all(runs: tuple[str, ...]) -> dict[str, dict]:
    """Preload every fitted run so sidebar navigation never triggers fitting."""
    return {run: pipeline.load_run(run) for run in runs}


# ---------------------------------------------------------------------------
# Theming: a visible in-app Light/Dark toggle (Streamlit 1.58 has no runtime
# theme setter, so we paint the page with CSS and match every chart to it).
# ---------------------------------------------------------------------------
# Soft pastel palettes, tuned for contrast (text passes WCAG AA on its surface
# in both modes). `th`/`zebra`/`hover`/`soft` drive the custom HTML tables.
THEMES = {
    "Light": dict(
        bg="#fbfcfe", fg="#2b3039", muted="#6b7280",
        sidebar="#f4f6fb", card="#ffffff", input="#ffffff",
        border="#e4e8f1", soft="#eef1f7", header="#eef2fb", alert="#eef4fc",
        accent="#6b9bd1", th="#e9eefb", zebra="#f7f9fd", hover="#eef4ff",
    ),
    "Dark": dict(
        bg="#171a23", fg="#e7eaf2", muted="#9aa3b5",
        sidebar="#1b1f2b", card="#1e2230", input="#232838", border="#2f3547",
        soft="#272c3a", header="#232838", alert="#1c2533",
        accent="#9db8e8", th="#262b3b", zebra="#1b1f2b", hover="#2a3042",
    ),
}


def current_theme() -> str:
    return st.session_state.get("ui_theme") or "Light"


def _flip_theme() -> None:
    st.session_state.ui_theme = "Dark" if current_theme() == "Light" else "Light"


def render_theme_toggle() -> None:
    """A small borderless icon button (top-right) that flips light/dark."""
    if "ui_theme" not in st.session_state:
        st.session_state.ui_theme = "Light"
    light = current_theme() == "Light"
    icon = ":material/dark_mode:" if light else ":material/light_mode:"
    tip = "Switch to dark theme" if light else "Switch to light theme"
    st.button(icon, key="theme_toggle", help=tip, on_click=_flip_theme)


def render_table(df: pd.DataFrame, height: int = 320, rename: dict | None = None) -> None:
    """Render a DataFrame as a fully theme-controlled, scrollable HTML table.

    Streamlit's ``st.dataframe`` is a canvas grid that ignores page CSS, so it
    never matched the theme. This emits semantic HTML styled by the classes in
    ``apply_theme`` (pastel header, zebra rows, sticky header) and uses
    ``dir="auto"`` so Sorani (Arabic-script) renders right-to-left correctly.
    """
    show = df.rename(columns=rename) if rename else df
    head = "".join(f"<th>{html.escape(str(c))}</th>" for c in show.columns)
    body = []
    for _, row in show.iterrows():
        cells = "".join(
            f"<td dir='auto'>{'' if pd.isna(v) else html.escape(str(v))}</td>" for v in row
        )
        body.append(f"<tr>{cells}</tr>")
    st.markdown(
        f"<div class='kdx-twrap' style='max-height:{height}px'>"
        f"<table class='kdx-table'><thead><tr>{head}</tr></thead>"
        f"<tbody>{''.join(body)}</tbody></table></div>",
        unsafe_allow_html=True,
    )


def apply_theme(mode: str) -> None:
    """Paint the whole page (chrome, widgets, tables, charts) for the chosen mode."""
    t = THEMES[mode]
    st.markdown(
        f"""
        <style>
          /* base surfaces */
          .stApp, [data-testid="stMain"] {{ background-color: {t['bg']}; color: {t['fg']}; }}
          [data-testid="stHeader"] {{ background: transparent; }}
          section[data-testid="stSidebar"] > div {{ background-color: {t['sidebar']}; }}

          /* text */
          .stApp h1, .stApp h2, .stApp h3, .stApp h4, .stApp p, .stApp li, .stApp span,
          [data-testid="stMarkdownContainer"], [data-testid="stWidgetLabel"] label,
          [data-baseweb="tab"] {{ color: {t['fg']} !important; }}
          [data-testid="stCaptionContainer"], .stApp small {{ color: {t['muted']} !important; }}
          [data-testid="stMetricValue"] {{ color: {t['fg']} !important; }}
          [data-testid="stMetricLabel"] {{ color: {t['muted']} !important; }}
          hr {{ border-color: {t['border']} !important; }}
          .stApp code {{ background: {t['header']}; color: {t['accent']}; }}

          /* inputs: text / number / select (BaseWeb) */
          .stTextInput input, .stNumberInput input, .stTextArea textarea,
          [data-baseweb="select"] > div, [data-baseweb="input"] > div {{
            background-color: {t['input']} !important; color: {t['fg']} !important;
            border-color: {t['border']} !important;
          }}
          [data-baseweb="popover"] [role="listbox"], [data-baseweb="menu"], [data-baseweb="menu"] li {{
            background-color: {t['card']} !important; color: {t['fg']} !important;
          }}
          [data-baseweb="menu"] li[aria-selected="true"],
          [data-baseweb="menu"] li:hover {{
            background-color: {t['hover']} !important; color: {t['fg']} !important;
          }}

          /* tooltips (e.g. on the theme toggle) must follow the theme too */
          [data-baseweb="tooltip"], [role="tooltip"], [data-baseweb="tooltip"] *,
          [data-testid="stTooltipContent"], [data-testid="stTooltipContent"] * {{
            background-color: {t['card']} !important; color: {t['fg']} !important;
            border-color: {t['border']} !important;
          }}

          /* tabs / expander / alerts / buttons / slider / radio */
          [data-baseweb="tab-list"] {{ border-bottom-color: {t['border']} !important; }}
          [data-baseweb="tab-highlight"] {{ background-color: {t['accent']} !important; }}
          [data-testid="stExpander"] details {{
            background-color: {t['card']}; border: 1px solid {t['border']}; border-radius: 10px;
          }}
          [data-testid="stExpander"] summary {{ color: {t['fg']} !important; }}
          [data-testid="stAlert"] {{
            background-color: {t['alert']} !important; color: {t['fg']} !important;
            border: 1px solid {t['border']};
          }}
          [data-testid="stAlert"] * {{ color: {t['fg']} !important; }}
          .stButton button, [data-testid="stBaseButton-secondary"] {{
            background-color: {t['card']} !important; color: {t['fg']} !important;
            border: 1px solid {t['border']} !important;
          }}
          [data-testid="stMetric"] {{
            background-color: {t['card']}; border: 1px solid {t['border']};
            border-radius: 10px; padding: 10px 14px;
          }}

          /* file uploader: dropzone box, instructions, Browse button, file chip */
          [data-testid="stFileUploaderDropzone"] {{
            background-color: {t['soft']} !important; color: {t['fg']} !important;
            border: 1px dashed {t['border']} !important; border-radius: 10px;
          }}
          [data-testid="stFileUploaderDropzoneInstructions"],
          [data-testid="stFileUploaderDropzoneInstructions"] * {{ color: {t['muted']} !important; }}
          [data-testid="stFileUploaderDropzone"] button,
          [data-testid="stFileUploader"] [data-testid="stBaseButton-secondary"] {{
            background-color: {t['card']} !important; color: {t['fg']} !important;
            border: 1px solid {t['border']} !important;
          }}
          [data-testid="stFileUploader"] li,
          [data-testid="stFileUploader"] [data-testid="UploadedFileInfo"] {{
            background-color: {t['soft']} !important; color: {t['fg']} !important;
            border-radius: 8px;
          }}

          /* form: render the parse/model panel as a themed card */
          [data-testid="stForm"] {{
            background-color: {t['card']} !important; border: 1px solid {t['border']} !important;
            border-radius: 12px;
          }}

          /* number-input steppers */
          [data-testid="stNumberInputStepUp"], [data-testid="stNumberInputStepDown"] {{
            background-color: {t['soft']} !important; color: {t['fg']} !important;
            border-color: {t['border']} !important;
          }}

          /* progress bar + slider follow the pastel accent */
          [data-testid="stProgress"] div[role="progressbar"] > div {{
            background-color: {t['accent']} !important;
          }}
          [data-testid="stSlider"] [data-baseweb="slider"] div[role="slider"] {{
            background-color: {t['accent']} !important;
          }}
          [data-testid="stSliderThumbValue"], [data-testid="stSliderTickBar"] {{ color: {t['muted']} !important; }}

          /* theme toggle: borderless icon, pinned right */
          .st-key-theme_toggle {{ display: flex; justify-content: flex-end; }}
          .st-key-theme_toggle button {{
            background: transparent !important; border: none !important; box-shadow: none !important;
            color: {t['fg']} !important; padding: 2px 6px; font-size: 1.3rem;
          }}
          .st-key-theme_toggle button:hover {{ color: {t['accent']} !important; background: transparent !important; }}

          /* custom HTML data tables (theme-controlled, scrollable, RTL-aware) */
          .kdx-twrap {{
            overflow: auto; border: 1px solid {t['border']}; border-radius: 10px;
            background: {t['card']};
          }}
          .kdx-table {{ width: 100%; border-collapse: collapse; font-size: 0.86rem; }}
          .kdx-table thead th {{
            position: sticky; top: 0; z-index: 1; text-align: left; font-weight: 600;
            background: {t['th']}; color: {t['fg']}; padding: 9px 12px;
            border-bottom: 1px solid {t['border']}; white-space: nowrap;
          }}
          .kdx-table td {{
            padding: 8px 12px; color: {t['fg']}; border-bottom: 1px solid {t['soft']};
            vertical-align: top; line-height: 1.45;
          }}
          .kdx-table tbody tr:nth-child(even) {{ background: {t['zebra']}; }}
          .kdx-table tbody tr:hover {{ background: {t['hover']}; }}
          .kdx-twrap::-webkit-scrollbar {{ width: 9px; height: 9px; }}
          .kdx-twrap::-webkit-scrollbar-thumb {{ background: {t['border']}; border-radius: 8px; }}
          .kdx-twrap::-webkit-scrollbar-track {{ background: transparent; }}
        </style>
        """,
        unsafe_allow_html=True,
    )


def themed(fig, height: int | None = None):
    """Match a Plotly figure to the chosen Light/Dark theme.

    Uses a transparent background so the chart blends with the page, and sets
    every text element (title, axes, legend, colorbar, hover) explicitly so
    nothing falls back to a template color that only works in one theme.
    """
    t = THEMES["Dark" if current_theme() == "Dark" else "Light"]
    fig.update_layout(
        template="plotly_dark" if current_theme() == "Dark" else "plotly_white",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color=t["fg"]),
        colorway=[t["accent"], *_CAT_PALETTE],  # single-series bars take the pastel accent
        xaxis=dict(gridcolor=t["soft"], title_font=dict(color=t["muted"]),
                   tickfont=dict(color=t["muted"]), zerolinecolor=t["border"]),
        yaxis=dict(gridcolor=t["soft"], title_font=dict(color=t["muted"]),
                   tickfont=dict(color=t["muted"]), zerolinecolor=t["border"]),
        legend=dict(font=dict(color=t["fg"]), title_font=dict(color=t["muted"])),
        hoverlabel=dict(bgcolor=t["card"], bordercolor=t["border"],
                        font=dict(color=t["fg"])),
    )
    # Only style the title when one exists: setting title_font on a titleless
    # figure makes Streamlit's plotly frontend render a literal "undefined".
    if fig.layout.title and fig.layout.title.text:
        fig.update_layout(title_font=dict(color=t["fg"]))
    # Continuous-color charts (the topic x category heatmap): theme the colorbar.
    if fig.layout.coloraxis and fig.layout.coloraxis.colorscale:
        fig.update_layout(coloraxis_colorbar=dict(
            tickfont=dict(color=t["muted"]), title_font=dict(color=t["muted"]),
            outlinewidth=0,
        ))
    if height is not None:
        fig.update_layout(height=height)
    return fig


def accent_seq() -> list[str]:
    """Single-color sequence so px bar charts take the theme accent at build time
    (px assigns trace colors at construction; a later ``colorway`` can't recolor them)."""
    return [THEMES[current_theme()]["accent"]]


def heat_scale() -> list[list]:
    """Sequential scale for density heatmaps that starts at the page surface color,
    so sparse cells fade into the background instead of glowing white in dark mode."""
    t = THEMES[current_theme()]
    if current_theme() == "Dark":
        return [[0.0, t["card"]], [0.5, "#3b5a86"], [1.0, "#9ec2f0"]]
    return [[0.0, "#f2f6fc"], [0.5, "#8fb8e8"], [1.0, "#31629e"]]


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
    # Header: title on the left, theme icon pinned to the top-right corner.
    title_col, toggle_col = st.columns([0.9, 0.1], vertical_alignment="center")
    with title_col:
        st.title("Kurdish Data Explorer")
    with toggle_col:
        render_theme_toggle()
    apply_theme(current_theme())

    st.caption("Topic modeling and exploratory analysis for Central Kurdish (Sorani) text. "
               "Explore one source at a time, drill into topics, or upload your own text.")

    runs_by_source = pipeline.runs_by_source()
    page = st.sidebar.radio("Mode", ["Explore a source", "Upload & explore"], index=0)

    if page == "Upload & explore":
        from upload_page import render_upload  # local module
        render_upload()
        return

    all_runs = tuple(pipeline.list_runs())
    if not runs_by_source:
        st.warning(
            "No precomputed runs found. Generate model artifacts first, e.g.:\n\n"
            "`python scripts/run_pipeline.py --source kndh --all-models --no-baselines`\n\n"
            "or use **Upload & explore** in the sidebar."
        )
        st.stop()

    with st.spinner("Loading precomputed model artifacts…"):
        loaded_runs = _load_all(all_runs)

    # ---- Source-first navigation (never mixes sources) ----
    st.sidebar.markdown("### 1 · Source")
    sources = sorted(runs_by_source)
    source = st.sidebar.selectbox(
        "Corpus to explore", sources,
        format_func=lambda s: source_meta(s)["name"],
    )
    sinfo = source_meta(source)

    st.sidebar.markdown("### 2 · Embedding model")
    model_options = pipeline.fitted_model_options(source, runs_by_source)
    missing_models = [
        key for key in config.EMBEDDING_MODELS
        if key not in set(runs_by_source.get(source, []))
    ]
    if missing_models:
        st.sidebar.info(
            f"{len(missing_models)} registered model(s) are not precomputed for this source. "
            f"Run `python scripts/run_pipeline.py --source {source} --all-models` "
            "before launching the app to make every model switchable."
        )
    if not model_options:
        st.warning(
            "This source has no artifacts for the currently registered embedding models. "
            f"Run `python scripts/run_pipeline.py --source {source} --all-models` and rerun the app."
        )
        st.stop()
    model_labels = [label for label, _ in model_options]
    selected_label = st.sidebar.selectbox("Embedding model", model_labels)
    model = next(key for label, key in model_options if label == selected_label)
    run = f"{source}__{model}"

    art = loaded_runs[run]
    meta, docs = art["meta"], art["documents"]
    topic_info, topic_words = art["topic_info"], art["topic_words"]
    hierarchy = art.get("hierarchy", [])

    # ---- Source banner (provenance shown once, here) ----
    st.info(f"**Source:** {sinfo['name']}  \n{sinfo['desc']}")

    # ---- Header metrics ----
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Documents", f"{meta['n_docs']:,}")
    c2.metric("Topics", meta["n_topics"])
    c3.metric("Outliers", f"{meta.get('n_outliers', 0):,}")
    bt_npmi = meta.get("coherence_npmi", {}).get("BERTopic")
    c4.metric("BERTopic NPMI", f"{bt_npmi:.3f}" if bt_npmi is not None else "n/a")
    friendly = config.EMBEDDING_MODEL_LABELS.get(meta.get("model_key"), meta["model_name"])
    st.caption(f"Embedding model: **{friendly}** (`{Path(str(meta['model_name'])).name}`), "
               f"fit in {meta.get('seconds', '?')}s")

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
        lcol, dcol = st.columns([2, 1], vertical_alignment="center")
        with lcol:
            layout = st.radio("Layout", ["Icicle", "Treemap", "Sunburst"], horizontal=True,
                              label_visibility="collapsed")
        with dcol:
            # BERTopic's merge tree is deep (binary), so rendering every level at
            # once is unreadable; show a few levels and drill in by clicking.
            depth_label = st.select_slider(
                "Visible depth", options=["2 levels", "3 levels", "4 levels", "All"],
                value="3 levels", help="How many hierarchy levels to show at once; "
                "click a cluster to drill deeper regardless.",
            )
        maxdepth = {"2 levels": 2, "3 levels": 3, "4 levels": 4, "All": -1}[depth_label]

        if has_labels:
            cmap = category_color_map(tree["category"].unique())
            color_col = "category"
        else:
            cmap = {"group": _group_color(), "topic": _leaf_color()}
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
        if maxdepth > 0:
            fig.update_traces(maxdepth=maxdepth)
        if layout in ("Icicle", "Treemap"):
            # The pathbar renders an "undefined" chip for our string root ids;
            # clicking the top-level box already navigates back up, so hide it.
            fig.update_traces(pathbar_visible=False)
        fig.update_layout(margin=dict(l=0, r=0, t=10, b=0))
        st.plotly_chart(themed(fig, height=560), width="stretch")

        with st.expander("All topics (table)"):
            named = topic_info[topic_info["Topic"] != -1]
            render_table(named[["Topic", "Count", "Name"]].reset_index(drop=True),
                         height=320, rename={"Name": "Keywords"})

        # ---- Leaf inspector: how many docs, and what they look like ----
        st.markdown("#### Inspect a topic (leaf)")
        leaves = sorted((n for n in hierarchy if n["is_leaf"]),
                        key=lambda n: n["count"], reverse=True)
        # ‎ (LTR mark) keeps the count readable after RTL Sorani keywords.
        opts = {f"{n['label']}‎  ·  {n['count']:,} docs": int(n["topic_id"]) for n in leaves}
        pick = st.selectbox("Topic", list(opts), key="tree_leaf")
        tid = opts[pick]

        left, right = st.columns([1, 1])
        with left:
            words = topic_words.get(str(tid), [])
            if words:
                wdf = pd.DataFrame(words, columns=["word", "score"]).iloc[::-1]
                fig = px.bar(wdf, x="score", y="word", orientation="h",
                             title=f"Topic {tid} keywords",
                             color_discrete_sequence=accent_seq())
                fig.update_layout(margin=dict(l=10, r=10, t=40, b=10))
                st.plotly_chart(themed(fig, height=340), width="stretch")
        with right:
            sub = view[view["topic"] == tid]
            st.metric("Documents in this topic (current filter)", f"{len(sub):,}")
            cols = [c for c in ["text", "text_en", "label"] if c in sub.columns]
            render_table(sub[cols].head(12).reset_index(drop=True), height=280,
                         rename={"text": "Text (Sorani)", "text_en": "English", "label": "Category"})

        # ---- Distribution, below the tree ----
        st.divider()
        st.subheader("Distribution")
        if has_labels:
            ct = (docs[docs["topic"] != -1]
                  .groupby(["topic", "label"]).size().reset_index(name="n"))
            ct["topic"] = ct["topic"].astype(str)
            fig2 = px.density_heatmap(ct, x="label", y="topic", z="n",
                                      color_continuous_scale=heat_scale(),
                                      labels={"n": "docs"},
                                      title="Documents per (topic, category)")
            fig2.update_layout(margin=dict(l=10, r=10, t=40, b=10),
                               coloraxis_colorbar_title_text="docs")
            st.plotly_chart(themed(fig2, height=520), width="stretch")
            st.caption("Where each discovered topic's documents fall across the human categories.")
        else:
            sizes = (docs[docs["topic"] != -1].groupby("topic").size()
                     .reset_index(name="count").nlargest(25, "count"))
            sizes["topic"] = sizes["topic"].astype(str)
            fig2 = px.bar(sizes, x="count", y="topic", orientation="h",
                          title="Largest topics by document count",
                          color_discrete_sequence=accent_seq())
            fig2.update_layout(margin=dict(l=10, r=10, t=40, b=10),
                               yaxis=dict(categoryorder="total ascending"))
            st.plotly_chart(themed(fig2, height=520), width="stretch")


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
            # Same pastel-per-category mapping the topic tree uses.
            color_kw = dict(color_discrete_map=category_color_map(plot_df["label"].unique()))
        else:
            color_col, legend = "topic_str", False
            # px assigns trace colors at construction, so `themed()`'s colorway
            # can't recolor them later — pass the pastel sequence here instead.
            color_kw = dict(color_discrete_sequence=_CAT_PALETTE)

        fig = px.scatter(
            plot_df, x="x", y="y", color=color_col, opacity=0.7,
            custom_data=["topic_str", "keywords", "snippet"],
            labels={"topic_str": "topic", "label": "category"},
            **color_kw,
        )
        fig.update_traces(
            marker=dict(size=6, line=dict(width=0)),
            hovertemplate=("<b>topic %{customdata[0]}</b>: %{customdata[1]}"
                           "<br>%{customdata[2]}<extra></extra>"),
        )
        fig.update_layout(showlegend=legend, margin=dict(l=0, r=0, t=10, b=0),
                          xaxis=dict(visible=False), yaxis=dict(visible=False),
                          legend_title_text="category")
        st.plotly_chart(themed(fig, height=640), width="stretch")
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
                         title="BERTopic vs LDA vs NMF",
                         color_discrete_sequence=accent_seq())
            st.plotly_chart(themed(fig, height=380), width="stretch")
        else:
            st.info("No coherence scores stored for this run.")

        if art["baseline_topics"]:
            st.subheader("Baseline topic keywords")
            which = st.radio("Baseline", list(art["baseline_topics"]), horizontal=True)
            bt = art["baseline_topics"][which]
            tidy = pd.DataFrame({
                "Topic": [f"topic {i}" for i in range(len(bt))],
                "Keywords": [", ".join(t) for t in bt],
            })
            render_table(tidy, height=380)
        else:
            st.caption("Baselines were not computed for this run.")


if __name__ == "__main__":
    main()
