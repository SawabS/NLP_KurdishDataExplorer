---
title: "Project Presentation Overview"
type: synthesis
created: 2026-07-04
updated: 2026-07-04
status: stable
tags: [presentation, overview, narrative, bertopic, kurdish, sorani, podcast-source]
sources: ["raw/sources/KLPT – Kurdish Language Processing Toolkit.pdf", "raw/sources/Kurdish News Dataset Headlines (KNDH) through multiclass classification.pdf", "raw/sources/Toward Kurdish language processing: Experiments in collecting and processing the AsoSoft text corpus.pdf", "raw/sources/THE KURDISH LANGUAGE CORPUS: STATE OF THE ART.pdf", "raw/sources/Multilingual transformer and BERTopic for short text topic modeling: The case of Serbian.pdf", "raw/sources/Idiom Detection in Sorani Kurdish Texts.pdf", "raw/sources/A Transformer-based Neural Network Machine Translation Model for the Kurdish Sorani Dialect.pdf", "raw/sources/Morphological Feature Extraction for Fine-Grained Sorani Kurdish Dialect.pdf"]
---

# Project Presentation Overview

A single, linear, self-contained narrative of the whole Kurdish Data Explorer
project — written to be read start to finish, not as a reference page. It exists
so that a presentation (or an AI-generated podcast) can be built from one document
instead of stitching together fragments. Every other wiki page is more precise on
its own topic; this page's job is to connect them into one story.

## 1. The problem

Central Kurdish (Sorani) is a morphologically rich, low-resource language written
in a modified Arabic script with unsettled orthography — the same word can be
spelled multiple ways, and standard NLP tooling built for English or other
high-resource languages does not transfer cleanly. [[The Kurdish Language Corpus:
State of the Art (Azzat et al. 2023)]] surveys existing Kurdish corpora and finds
that the core issue is **not a total absence of data** — corpora like KNDH and
AsoSoft exist — but that this data is **hard to explore and make sense of**: no
accessible tools let a non-specialist look inside a Kurdish text collection and
see what it's actually about.

That gap — usable Kurdish text data that nobody can easily explore — is the
problem this project addresses.

## 2. The objective

Build an interactive topic-modeling explorer for Sorani Kurdish text that:

1. Takes a labelled short-text dataset (news headlines) and an unlabelled
   long-text corpus (running text), and surfaces the latent themes in each.
2. Uses transformer-based topic modeling ([[BERTopic]]) as the primary method,
   compared honestly against classical baselines (LDA, NMF) rather than assumed
   superior.
3. Ships as a live, explorable Streamlit app — not a static report — so a user
   can drill from broad topic clusters down to individual example documents.
4. Generalizes beyond Kurdish: the long-term architecture goal is a **language-
   and source-agnostic, size-unbounded text-exploration engine**, with Kurdish/KNDH
   as the first concrete proving ground (see [[Implementation and Methodology]] and
   `docs/ARCHITECTURE.md`).

This project does not train a new language model from scratch. It assembles
established, citable components — a preprocessing toolkit, multilingual sentence
embeddings, a topic-modeling framework — into a coherent, evaluated pipeline. The
contribution is the assembly, the tuning, and the honest evaluation, not a novel
algorithm.

## 3. Literature review — why each piece was chosen

Eight sources ground the project's design decisions (full detail in
[[Kurdish Data Explorer Pipeline]] and each `wiki/sources/` page):

- **[[KLPT]]** ([[KLPT – Kurdish Language Processing Toolkit (Ahmadi 2020)]]) —
  an open-source Kurdish preprocessing toolkit (stemming, transliteration,
  tokenization, stopwords). Chosen over bespoke preprocessing because Kurdish
  orthographic normalization is a solved-enough problem that reinventing it would
  waste effort and introduce untested bugs.
- **[[Kurdish News Dataset Headlines (KNDH)]]** — 50,000 Sorani news headlines,
  perfectly balanced across 5 categories (economic, health, science & technology,
  social, sport). This is the project's primary dataset: labelled, so topic
  quality can be checked against known ground-truth categories via NMI.
- **[[AsoSoft Text Corpus]]** — a large (188M-token; ~4.9M-token "Small" version
  used here) unlabelled running-text Sorani corpus. Chosen to broaden genre
  coverage beyond short headlines and test the pipeline on longer, unlabelled text.
- **[[Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et
  al. 2024)]]** — the **methodological blueprint**. This paper applies BERTopic
  with multilingual embeddings to short text in Serbian — another morphologically
  rich, low-resource language — and shows BERTopic beats LDA/NMF on topic
  informativeness, and tolerates partial preprocessing with minimal quality loss.
  That robustness claim directly justifies using BERTopic on imperfectly
  normalized Kurdish headlines rather than requiring exhaustive preprocessing.
- **[[Idiom Detection in Sorani Kurdish Texts (Omer & Hassani 2025)]]**,
  **[[A Transformer-based NMT Model for Sorani (Badawi 2023)]]**, and
  **[[Morphological Feature Extraction for Sorani Dialect Identification (Bharati
  et al. 2026)]]** — three Kurdish-specific results (KuBERT ~99% idiom-detection
  accuracy, BLEU 0.45 machine translation, 91.91% dialect ID with morphology-aware
  features) that collectively support the claim that transformer architectures
  transfer effectively to Sorani despite limited data. These are read as
  *encouraging*, not decisive, since all three report strong numbers on
  comparatively small evaluation sets.

The throughline: every non-trivial design choice (which toolkit, which model
family, which evaluation) traces back to a specific cited source, not intuition.

## 4. Methodology — how the pipeline actually works

Concretely (config in `src/kurdish_explorer/config.py`, code in
`src/kurdish_explorer/`):

1. **Ingest.** KNDH xlsx and AsoSoft text are converted to Parquet
   (`scripts/prepare_data.py`).
2. **Normalize.** KLPT handles Sorani/Arabic-script normalization and
   tokenization; Sorani stopwords are stripped for the vectorizer stage.
3. **Embed.** Sentence-transformer models turn each document into a dense vector.
   Five are registered: MiniLM (`paraphrase-multilingual-MiniLM-L12-v2`, 384-dim,
   default), DistilUSE (512-dim), MPNet (768-dim), multilingual-E5-base, and a
   project-specific fine-tuned model, **KDX-MiniLM-TSDAE** (see §6). Embeddings
   are GPU-encoded once and cached on disk keyed by (model, content hash).
4. **Reduce + cluster (BERTopic).** UMAP reduces embedding dimensionality
   (`n_neighbors=15, n_components=5, min_dist=0.0, metric=cosine`), then HDBSCAN
   clusters the reduced space (`min_cluster_size=250, min_samples=10`, tuned — see
   §5). Class-based TF-IDF (c-TF-IDF) with Maximal Marginal Relevance keyword
   diversification turns each cluster into a labelled topic. HDBSCAN's native
   outliers (documents that fit no cluster) are reassigned to their nearest topic
   by c-TF-IDF distance, because a large "uncategorized" bucket is bad UX in an
   explorer.
5. **Baselines.** The same document set is also modeled with classical LDA
   (scikit-learn, online variant) and NMF (TF-IDF input), 20 topics each, as a
   point of comparison — never presented as the primary method.
6. **Evaluate.** Topic quality is scored three ways: NPMI coherence (gensim
   `CoherenceModel`, `c_npmi` — the same metric the Serbian BERTopic paper uses),
   topic diversity (fraction of unique words across topic keyword lists), and NMI
   against the 5 KNDH ground-truth categories (only possible because KNDH is
   labelled).
7. **Serve.** A Streamlit app reads precomputed artifacts per run
   (`artifacts/<source>__<model>/`) — it never re-fits a model on page load, so it
   stays responsive even though fitting itself is expensive.

One specific bug worth mentioning in a presentation: early on, a single
CountVectorizer with `min_df=5` was shared between BERTopic's c-TF-IDF stage and
the LDA/NMF baselines. BERTopic's c-TF-IDF runs over *grouped per-topic*
documents (one concatenated pseudo-document per topic), so `min_df=5` meant a
keyword had to appear in at least 5 different topics to survive — which gutted
topic keywords and crashed runs with few topics. Splitting the vectorizer
(`min_df=1` for c-TF-IDF, `min_df=5, max_df=0.5` for the baselines, which vectorize
the full document set) was, in the project's own record, "the single biggest
BERTopic quality fix."

## 5. Tuning — finding the right cluster granularity

`scripts/tune_bertopic.py` swept HDBSCAN's `min_cluster_size` over one shared UMAP
reduction of the full 50k KNDH headlines, holding embeddings fixed (MiniLM):

| min_cluster_size | topics | outliers | NPMI | diversity | NMI vs labels |
|---|---|---|---|---|---|
| 50 | 195 | 28.5% | -0.328 | 0.20 | 0.228 |
| 100 | 91 | 36.1% | -0.315 | 0.33 | 0.230 |
| 150 | 62 | 44.4% | -0.320 | 0.46 | 0.247 |
| 250 | 31 | 45.0% | -0.304 | 0.75 | 0.252 |
| 400 | 21 | 52.1% | -0.301 | 0.85 | 0.275 |

The pattern: larger minimum cluster sizes produce fewer, larger, more diverse and
more label-aligned topics, while NPMI plateaus (its bag-of-words bias caps how
much it can reward semantic clustering). `min_cluster_size=250` (with
`min_samples=10`) was selected as the production default — a middle point before
diminishing returns. Note this sweep table reports NPMI **before** outlier
reassignment; the shipped pipeline's outlier-reduction step improves the final
number substantially (see §6's production comparison).

## 6. Results — BERTopic vs. classical baselines, and the fine-tuning trade-off

**Production comparison, full 50k KNDH, post outlier-reduction:**

| Model | NPMI | Topics | Notes |
|---|---|---|---|
| **BERTopic (tuned)** | **-0.056** | 48 | 36 outliers (0.07%); beats LDA, near NMF |
| LDA | -0.149 | 20 | |
| NMF | +0.107 | 20 | NPMI structurally favors bag-of-words |

The honest interpretation, stated plainly rather than cherry-picked: NPMI
inherently rewards LDA/NMF because they directly optimize word co-occurrence,
which is exactly what NPMI measures. BERTopic still wins on topic diversity, has
near-zero outliers, produces semantically coherent clusters, and — unlike LDA/NMF
— never needed a fixed topic count chosen in advance. That combination is argued
as the "most suitable configuration within the project scope," which mirrors the
Serbian BERTopic paper's own framing: not a universal win, a defensible one.

**Fine-tuning experiment: KDX-MiniLM-TSDAE.** To test whether domain adaptation
helps, MiniLM was fine-tuned unsupervised via TSDAE (Transformer-based Sequential
Denoising Auto-Encoder) on ~110,000 Sorani sentences (all KNDH headlines +
sentence-split AsoSoft text), 1 epoch, batch 8, on a single RTX 4060 (~45
minutes). Unsupervised was a deliberate choice over supervised fine-tuning on the
5 KNDH labels — supervised fine-tuning would sharpen category alignment but bias
the embedder away from the project's generic, size-unbounded goal.

| Model (tuned) | Topics | Outliers | NPMI | Diversity | NMI vs categories |
|---|---|---|---|---|---|
| Base MiniLM (mcs=250) | 48 | 36 | -0.056 | 0.838 | **0.224** |
| KDX-MiniLM-TSDAE (mcs=50) | 45 | **2** | **+0.038** | **0.847** | 0.159 |

This is a genuine trade-off, not a clean win, and the project records it as such:
TSDAE improves every intrinsic metric (coherence flips positive, diversity rises
slightly, native HDBSCAN outliers drop from 36 to 2), but it *reduces* alignment
with the human-assigned news categories, because unsupervised reconstruction has
no reason to track those specific 5 labels. It also needs its own cluster
granularity — the same `min_cluster_size=250` that works for base MiniLM
over-merges the TSDAE embedding space, so it was re-tuned to 50. Both models ship
in the app and are user-selectable: base MiniLM for category-faithful
exploration, TSDAE for finer, more internally-coherent clusters.

## 7. The application

`app/streamlit_app.py` is a Streamlit app that reads precomputed artifacts only —
it never re-fits a model at load time, so it stays responsive. Two modes:

- **Explore a source** — pick a corpus (KNDH, AsoSoft, or a prior upload), then an
  embedding model, and browse a drill-down **topic hierarchy** (BERTopic's
  `hierarchical_topics`, rendered as an icicle/treemap/sunburst — start broad,
  click to reveal sub-topics), a sampled **2D document map**, and a
  **topic × category** comparison against LDA/NMF baselines.
- **Upload & explore** — a user supplies their own `.txt`, or a tabular file
  (CSV/TSV/Excel/Parquet) with a chosen text column, and the same pipeline runs on
  it, becoming a new selectable source. This is the generic-engine proof of
  concept: server-path input bypasses the browser upload cap, files are streamed
  rather than loaded twice, and a schema-peek step avoids reading whole tables
  before the user picks columns.

Sources are never mixed unless explicitly requested — each run key is
`<source>__<model>`, and every source shows a provenance banner (what it is, its
size, whether it's labelled, where it came from). This "source isolation and
transparency" principle was a deliberate UX decision, not an accident of the data
layout.

## 8. Honest limitations and open questions

Stated directly, for a presentation Q&A:

- **NPMI favors bag-of-words methods by construction.** BERTopic's NPMI loss to
  NMF is expected and does not mean NMF produces better topics for a human reader
  — it means NPMI is not a neutral referee between clustering-based and
  frequency-based topic models. Diversity, outlier rate, and qualitative topic
  read-out matter alongside it.
- **Domain-adapted embeddings are a trade-off, not a strict improvement**
  (§6) — better coherence and cluster confidence, worse label alignment.
- **Kurdish-specific transformer encoders (e.g. KuBERT) were never wired into the
  embedding stage** — only multilingual sentence-transformers were used and
  compared against each other. Whether a Kurdish-specific encoder would
  outperform multilingual ones for this clustering task is untested.
- **AsoSoft's Large split (75M tokens) and its topic-annotated subset are not yet
  ingested** (the annotated set ships as a RAR requiring `unrar`); only the
  ~4.9M-token "Small" version is used.
- **Scaling beyond ~150k documents needs architectural changes** not yet built:
  UMAP is roughly O(n^1.5) and HDBSCAN is memory-heavy, so the plan
  (`docs/ARCHITECTURE.md`) is GPU-accelerated cuML, or incremental/online
  clustering (`BERTopic.partial_fit`), or sample-fit-then-assign, auto-selected by
  corpus size. None of these are implemented yet — the current pipeline is proven
  correct and well-tuned up to the ~50k-document scale of KNDH.

## 9. Conclusion

The project takes a real, previously under-addressed gap in Kurdish NLP tooling
(unexplorable-despite-existing data), assembles established methods rather than
inventing new ones, and evaluates its central choice — BERTopic over classical
topic models — honestly, including the ways it does *not* win. It ships as a
working, interactive application with a labelled dataset (KNDH) as a quality
benchmark, and its architecture is explicitly designed to generalize beyond
Kurdish to arbitrary text corpora, with a stated, unimplemented scaling roadmap
that acknowledges the current ceiling rather than glossing over it.

## Connections

- Full narrative sources: [[Kurdish Data Explorer Pipeline]] (literature →
  design rationale), [[Implementation and Methodology]] (as-built record with all
  numbers), [[BERTopic]], [[KDX-MiniLM-TSDAE (fine-tuned embedder)]].
- This page is written specifically as a **podcast/presentation source** — see the
  root `CLAUDE.md`/wiki workflow for how it fits the rest of the wiki.

## Change log

- 2026-07-04: Created as a single consolidated narrative ahead of a project
  presentation, to serve as the primary NotebookLM source document.
