ROLE: You are a research analyst specializing in data visualization, HCI, and
NLP tooling. Produce a deep, well-cited research report — not a surface-level
listicle — that I will use to redesign the visualization layer of a working
web application.

PROJECT CONTEXT
I run the "Kurdish Data Explorer": a web app (FastAPI + React/Plotly) for
exploring large text corpora through topic modeling. Pipeline: sentence
embeddings (OpenAI/NVIDIA hosted models) -> UMAP -> HDBSCAN -> BERTopic
(c-TF-IDF keywords, now also LLM-generated human-readable topic names) ->
a hierarchical topic tree (BERTopic's pairwise merge hierarchy). Corpora run
from a few thousand to ~200,000 documents. The audience is dual: general,
non-technical users exploring "what's in this dataset," AND technical NLP
practitioners who want rigorous, inspectable detail.

Critical constraint: the target languages are Kurdish (Sorani, Arabic script,
right-to-left, low-resource), Arabic (RTL, high-resource, morphologically
rich), and English (LTR, high-resource). Any visualization technique or tool
you surface must be evaluated for how well it actually handles RTL / mixed
Arabic-script text — in labels, hover tooltips, search highlighting, word-level
techniques, and font rendering — not just whether it works for English.

WHAT WE HAVE TODAY (the baseline to beat)
- A drill-down topic hierarchy rendered as a Plotly icicle/treemap/sunburst
  (source corpus as root, branching into topic groups, down to leaf topics).
- A 2D UMAP document scatter plot (Plotly scattergl), colored by topic or by
  label/category, with a point-budget slider and a clickable topic legend.
- A handful of "insights" charts: a topic-size Pareto (bar + cumulative-share
  line), a category-balance bar chart, coverage/outlier metrics.
- A RAG-based "Ask the corpus" — semantic retrieval over per-document
  embeddings feeding an LLM-synthesized, cited answer.
I feel this is visually competent but conceptually thin — mostly generic
BI-chart types wrapped around topic-model output, not techniques specifically
designed for exploring large multilingual text corpora.

RESEARCH GOALS — please investigate and report on:

1. ACADEMIC / HCI LITERATURE: What does published visualization/HCI research
   (VIS, CHI, EMNLP/ACL demo tracks, etc.) say about effective interactive
   topic-model and text-corpus exploration? Cover both classic work (e.g.
   Termite, Serendip, TopicFlow, ThemeRiver/streamgraphs for topic evolution,
   phrase nets) and recent work on embedding-based corpus exploration.
   Critically note well-documented pitfalls (e.g., why word clouds are widely
   considered weak for analysis, why raw UMAP/t-SNE inter-cluster distances
   are often misleading, information loss in treemaps/icicles vs. dendrograms).

2. DEPLOYED TOOLS AND PRODUCTS: Survey real, currently-maintained tools people
   actually use for this — open source and commercial. Include (but don't
   limit to) things like Nomic Atlas, Bunka, Apple's embedding-atlas, Top2Vec's
   viz layer, PyLDAvis, Scattertext, Voyant Tools, Overview Docs, Cluestar,
   Cosmograph, and any others you find that are genuinely relevant. For each:
   what visualization technique(s) it centers on, what scale of corpus it's
   built for, whether/how it's been used on RTL or Arabic-script text, and
   whether it's a library we could embed vs. a standalone product.

3. TECHNIQUE CATALOG BY VIEW: Organize concrete technique options under the
   kinds of views a corpus-exploration tool needs:
   - Corpus/topic structure (alternatives or complements to icicle/treemap/
     sunburst: dendrograms, radial trees, nested bubble/circle-packing,
     indented expandable outlines, etc.)
   - Document/embedding space at scale (beyond a plain scatter: density
     contours, hexbin/heatmap aggregation, GPU point-rendering for 100k+
     points, labeled-region overlays, "landmark" term placement)
   - Topic composition / keyword representation (alternatives to raw keyword
     lists/word clouds: term-topic matrices like Termite, keyword-in-context,
     representative-sentence highlighting)
   - Comparison and change (across categories, across time if a corpus has
     dates, across labeled subgroups)
   - Search/RAG result presentation (how tools visualize semantic-search
     relevance and citation provenance beyond a ranked list)

4. LIBRARY/FRAMEWORK OPTIONS FOR A REACT WEB STACK: For techniques judged
   worth adopting, name the concrete JS/TS libraries that could implement
   them in a React app (we currently use Plotly.js). Consider D3.js,
   deck.gl / regl-scatterplot, Vega-Lite / Observable Plot, ECharts, Nivo,
   visx, Cosmograph, and WebGL-based large-point renderers. Note licensing,
   maintenance activity, and bundle-size/performance concerns for 100k+ point
   datasets.

5. MULTILINGUAL / RTL-SPECIFIC GUIDANCE: Pull together concrete, actionable
   guidance on rendering Arabic-script Kurdish/Arabic text inside data
   visualizations — label direction and truncation, tooltip/hover text
   shaping, mixed RTL/LTR layouts (e.g., an LTR chart axis with RTL labels),
   font choices proven to render Arabic script well at small sizes, and any
   documented failure modes to avoid.

OUTPUT FORMAT
- Executive summary (half a page): what's most worth changing, in priority
  order.
- A comparison table: technique/tool | what it's for | scale it handles |
  RTL/Arabic-script readiness | implementation cost in a React+D3/Plotly
  stack | source/citation.
- A short list of 3-5 concrete recommendations we could prototype next,
  each with why it beats what we have today.
- Full citation list (papers, tool docs/repos, blog posts from credible
  practitioners) so I can verify claims myself.

Be skeptical and comparative, not promotional — where a tool or technique has
known weaknesses (including ones the tool's own creators acknowledge), say so.