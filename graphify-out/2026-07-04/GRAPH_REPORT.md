# Graph Report - NLP_KurdishDataExplorer  (2026-07-04)

## Corpus Check
- 64 files · ~26,339 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 495 nodes · 605 edges · 49 communities (47 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a52f0545`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_index|index.md]]
- [[_COMMUNITY_streamlit_app.py|streamlit_app.py]]
- [[_COMMUNITY_preprocess.py|preprocess.py]]
- [[_COMMUNITY_AsoSoft Text Corpus|AsoSoft Text Corpus]]
- [[_COMMUNITY_pipeline.py|pipeline.py]]
- [[_COMMUNITY_LaTeX Document Generation Reference|LaTeX Document Generation Reference]]
- [[_COMMUNITY_Implementation and Methodology|Implementation and Methodology]]
- [[_COMMUNITY_Title|Title]]
- [[_COMMUNITY_Toward Kurdish Language Processing The AsoSoft Text Corpus (Veisi et al. 2019)|Toward Kurdish Language Processing: The AsoSoft Text Corpus (Veisi et al. 2019)]]
- [[_COMMUNITY_Text Classification|Text Classification]]
- [[_COMMUNITY_data.py|data.py]]
- [[_COMMUNITY_embed.py|embed.py]]
- [[_COMMUNITY_evaluate.py|evaluate.py]]
- [[_COMMUNITY_upload_page.py|upload_page.py]]
- [[_COMMUNITY__PrecomputedUMAP|_PrecomputedUMAP]]
- [[_COMMUNITY_Concept Name|Concept Name]]
- [[_COMMUNITY_Entity Name|Entity Name]]
- [[_COMMUNITY_Question|Question]]
- [[_COMMUNITY_Title|Title]]
- [[_COMMUNITY_Title|Title]]
- [[_COMMUNITY_KuBERT|KuBERT]]
- [[_COMMUNITY_Multilingual Transformer and BERTopic for Short Text Serbian (Medvecki et al. 2024)|Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et al. 2024)]]
- [[_COMMUNITY_Idiom Detection in Sorani Kurdish Texts (Omer & Hassani 2025)|Idiom Detection in Sorani Kurdish Texts (Omer & Hassani 2025)]]
- [[_COMMUNITY_KLPT – Kurdish Language Processing Toolkit (Ahmadi 2020)|KLPT – Kurdish Language Processing Toolkit (Ahmadi 2020)]]
- [[_COMMUNITY_Kurdish News Dataset Headlines (KNDH) — Multiclass Classification (Badawi et al. 2023)|Kurdish News Dataset Headlines (KNDH) — Multiclass Classification (Badawi et al. 2023)]]
- [[_COMMUNITY_Morphological Feature Extraction for Sorani Dialect Identification (Bharati et al. 2026)|Morphological Feature Extraction for Sorani Dialect Identification (Bharati et al. 2026)]]
- [[_COMMUNITY_A Transformer-based NMT Model for Sorani (Badawi 2023)|A Transformer-based NMT Model for Sorani (Badawi 2023)]]
- [[_COMMUNITY_Low-Resource Languages|Low-Resource Languages]]
- [[_COMMUNITY_Topic Modeling|Topic Modeling]]
- [[_COMMUNITY_BERTopic|BERTopic]]
- [[_COMMUNITY_KLPT|KLPT]]
- [[_COMMUNITY_Soran Badawi|Soran Badawi]]
- [[_COMMUNITY_Wiki Log|Wiki Log]]
- [[_COMMUNITY_Architecture & Scaling Plan|Architecture & Scaling Plan]]
- [[_COMMUNITY_Kurdish Data Explorer|Kurdish Data Explorer]]
- [[_COMMUNITY_lint_wiki.py|lint_wiki.py]]
- [[_COMMUNITY_finetune_tsdae.py|finetune_tsdae.py]]
- [[_COMMUNITY_CLAUDE|CLAUDE.md]]
- [[_COMMUNITY_Morphological Richness|Morphological Richness]]
- [[_COMMUNITY_Transformer Models|Transformer Models]]
- [[_COMMUNITY_KDX-MiniLM-TSDAE (fine-tuned embedder)|KDX-MiniLM-TSDAE (fine-tuned embedder)]]
- [[_COMMUNITY_Kurdish Data Explorer Pipeline|Kurdish Data Explorer Pipeline]]
- [[_COMMUNITY_The Kurdish Language Corpus State of the Art (Azzat et al. 2023)|The Kurdish Language Corpus: State of the Art (Azzat et al. 2023)]]
- [[_COMMUNITY_Wiki Index|Wiki Index]]

## God Nodes (most connected - your core abstractions)
1. `LaTeX Document Generation Reference` - 21 edges
2. `Implementation and Methodology` - 17 edges
3. `Title` - 13 edges
4. `Project Presentation Overview` - 12 edges
5. `main()` - 11 edges
6. `render_tree_tab()` - 11 edges
7. `build_vectorizer()` - 11 edges
8. `current_theme()` - 9 edges
9. `_PrecomputedUMAP` - 7 edges
10. `Concept Name` - 7 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `build_vectorizer()`  [INFERRED]
  scripts/tune_bertopic.py → src/kurdish_explorer/preprocess.py
- `test_available_model_options_includes_all_configured_models()` --calls--> `available_model_options()`  [INFERRED]
  tests/test_pipeline_model_options.py → src/kurdish_explorer/pipeline.py
- `test_fitted_model_options_only_includes_precomputed_runs()` --calls--> `fitted_model_options()`  [INFERRED]
  tests/test_pipeline_model_options.py → src/kurdish_explorer/pipeline.py
- `main()` --calls--> `render_upload()`  [INFERRED]
  app/streamlit_app.py → app/upload_page.py
- `fit_lda()` --calls--> `build_vectorizer()`  [EXTRACTED]
  src/kurdish_explorer/baselines.py → src/kurdish_explorer/preprocess.py

## Import Cycles
- None detected.

## Communities (49 total, 2 thin omitted)

### Community 0 - "index.md"
Cohesion: 0.10
Nodes (14): Change log, Connections, Evidence, Key claims, Open questions, Summary, Text Normalization, Change log (+6 more)

### Community 1 - "streamlit_app.py"
Cohesion: 0.10
Nodes (38): accent_seq(), apply_theme(), build_tree_frame(), category_color_map(), current_theme(), dominant_categories(), _first_run_for(), _flip_theme() (+30 more)

### Community 2 - "preprocess.py"
Cohesion: 0.09
Nodes (30): CountVectorizer, BaselineResult, fit_lda(), fit_nmf(), ndarray, Classical topic-model baselines: LDA and NMF.  Both use the same Kurdish CountVe, _top_words(), Central configuration: paths, model registry, and default parameters.  All paths (+22 more)

### Community 3 - "AsoSoft Text Corpus"
Cohesion: 0.29
Nodes (7): AsoSoft Text Corpus, Change log, Connections, Evidence, Key claims, Open questions, Summary

### Community 4 - "pipeline.py"
Cohesion: 0.11
Nodes (25): artifact_dir(), available_model_options(), fitted_model_options(), list_runs(), load_run(), PipelineResult, End-to-end pipeline: load -> normalize -> embed -> BERTopic + baselines -> evalu, Fit the pipeline on an arbitrary list of texts (uploads / any source).      This (+17 more)

### Community 5 - "LaTeX Document Generation Reference"
Cohesion: 0.09
Nodes (22): Callout Boxes, Careful Claiming, Color Palette, Core Role, Document Style, Figures And Diagrams, Fixed Full-Document Preamble, Heading Hierarchy (+14 more)

### Community 6 - "Implementation and Methodology"
Cohesion: 0.11
Nodes (19): Application, Baselines and evaluation, Change log, Connections, Data acquisition and provenance, Embedding, Embedding fine-tuning, Environment (+11 more)

### Community 7 - "Title"
Cohesion: 0.11
Nodes (16): Change log, Connections, Core rule, Directory structure, Evidence, graphify, Ingest workflow, Key claims (+8 more)

### Community 8 - "Toward Kurdish Language Processing: The AsoSoft Text Corpus (Veisi et al. 2019)"
Cohesion: 0.29
Nodes (7): Change log, Connections, Evidence, Key claims, Open questions, Summary, Toward Kurdish Language Processing: The AsoSoft Text Corpus (Veisi et al. 2019)

### Community 9 - "Text Classification"
Cohesion: 0.29
Nodes (7): Change log, Connections, Evidence, Key claims, Open questions, Summary, Text Classification

### Community 10 - "data.py"
Cohesion: 0.29
Nodes (9): load_asosoft(), load_corpus(), load_kndh(), DataFrame, Dataset loading.  Reads the prepared Parquet tables produced by ``scripts/prepar, KNDH headlines as unified documents (labeled)., AsoSoft running text as unified documents (unlabeled)., Load a corpus by name: ``"kndh"`` or ``"asosoft"``. (+1 more)

### Community 11 - "embed.py"
Cohesion: 0.27
Nodes (9): _cache_path(), embed_documents(), get_embedder(), project_2d(), ndarray, Document embedding with on-disk caching.  Embeddings are the most expensive reus, Load (and cache) a SentenceTransformer by registry key, on GPU if available., Project embeddings to 2D with UMAP for the document map (CPU, seeded). (+1 more)

### Community 12 - "evaluate.py"
Cohesion: 0.24
Nodes (9): evaluate_models(), npmi_coherence(), Topic-quality evaluation via NPMI coherence.  Uses gensim's CoherenceModel (``c_, Fraction of unique words across all topics' keyword lists (1.0 = all distinct)., Lightweight tokenization matching the vectorizer's token pattern., Mean NPMI coherence for a set of topics (list of word lists)., Return {model_name: mean_npmi} for each model's topic-word lists., tokenize() (+1 more)

### Community 13 - "upload_page.py"
Cohesion: 0.44
Nodes (8): _iter_lines(), _peek_columns(), Upload & explore: the generic engine front-end.  Lets a user point the explorer, Split a plain-text file into documents (streamed)., read_table_documents(), read_text_documents(), render_upload(), Path

### Community 14 - "_PrecomputedUMAP"
Cohesion: 0.28
Nodes (4): main(), _PrecomputedUMAP, ndarray, Passthrough 'reducer' that returns a precomputed UMAP embedding.      Lets us ru

### Community 15 - "Concept Name"
Cohesion: 0.25
Nodes (7): Change log, Concept Name, Connections, Evidence, Key claims, Open questions, Summary

### Community 16 - "Entity Name"
Cohesion: 0.25
Nodes (7): Change log, Connections, Entity Name, Evidence, Key claims, Open questions, Summary

### Community 17 - "Question"
Cohesion: 0.25
Nodes (7): Answer, Change log, Connections, Evidence, Open questions, Question, Summary

### Community 18 - "Title"
Cohesion: 0.25
Nodes (7): Change log, Connections, Evidence, Key claims, Open questions, Summary, Title

### Community 19 - "Title"
Cohesion: 0.25
Nodes (7): Change log, Connections, Evidence, Key claims, Open questions, Summary, Title

### Community 20 - "KuBERT"
Cohesion: 0.25
Nodes (7): Change log, Connections, Evidence, Key claims, KuBERT, Open questions, Summary

### Community 21 - "Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et al. 2024)"
Cohesion: 0.25
Nodes (7): Change log, Connections, Evidence, Key claims, Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et al. 2024), Open questions, Summary

### Community 22 - "Idiom Detection in Sorani Kurdish Texts (Omer & Hassani 2025)"
Cohesion: 0.25
Nodes (7): Change log, Connections, Evidence, Idiom Detection in Sorani Kurdish Texts (Omer & Hassani 2025), Key claims, Open questions, Summary

### Community 23 - "KLPT – Kurdish Language Processing Toolkit (Ahmadi 2020)"
Cohesion: 0.25
Nodes (7): Change log, Connections, Evidence, Key claims, KLPT – Kurdish Language Processing Toolkit (Ahmadi 2020), Open questions, Summary

### Community 24 - "Kurdish News Dataset Headlines (KNDH) — Multiclass Classification (Badawi et al. 2023)"
Cohesion: 0.25
Nodes (7): Change log, Connections, Evidence, Key claims, Kurdish News Dataset Headlines (KNDH) — Multiclass Classification (Badawi et al. 2023), Open questions, Summary

### Community 25 - "Morphological Feature Extraction for Sorani Dialect Identification (Bharati et al. 2026)"
Cohesion: 0.25
Nodes (7): Change log, Connections, Evidence, Key claims, Morphological Feature Extraction for Sorani Dialect Identification (Bharati et al. 2026), Open questions, Summary

### Community 26 - "A Transformer-based NMT Model for Sorani (Badawi 2023)"
Cohesion: 0.25
Nodes (7): A Transformer-based NMT Model for Sorani (Badawi 2023), Change log, Connections, Evidence, Key claims, Open questions, Summary

### Community 27 - "Low-Resource Languages"
Cohesion: 0.29
Nodes (7): Change log, Connections, Evidence, Key claims, Low-Resource Languages, Open questions, Summary

### Community 28 - "Topic Modeling"
Cohesion: 0.29
Nodes (7): Central Kurdish (Sorani), Change log, Connections, Evidence, Key claims, Open questions, Summary

### Community 29 - "BERTopic"
Cohesion: 0.29
Nodes (7): BERTopic, Change log, Connections, Evidence, Key claims, Open questions, Summary

### Community 30 - "KLPT"
Cohesion: 0.09
Nodes (21): Change log, Connections, Evidence, Key claims, KLPT, Open questions, Summary, Change log (+13 more)

### Community 31 - "Soran Badawi"
Cohesion: 0.17
Nodes (12): 1. The problem, 2. The objective, 3. Literature review — why each piece was chosen, 4. Methodology — how the pipeline actually works, 5. Tuning — finding the right cluster granularity, 6. Results — BERTopic vs. classical baselines, and the fine-tuning trade-off, 7. The application, 8. Honest limitations and open questions (+4 more)

### Community 32 - "Wiki Log"
Cohesion: 0.25
Nodes (7): [2026-06-26] build | Drill-down topic tree, source isolation, and upload engine, [2026-06-26] build | Pipeline implementation, BERTopic tuning, and TSDAE fine-tuning, [2026-06-26] eval | TSDAE fine-tuning comparison completed, [2026-06-26] ingest | Bootstrap wiki from 8 Kurdish NLP sources, [2026-07-03] build | Streamlit UI polish, upload-read efficiency, and verification, [2026-07-04] lint+ingest | Pre-presentation wiki review and consolidated overview, Wiki Log

### Community 33 - "Architecture & Scaling Plan"
Cohesion: 0.33
Nodes (5): Architecture & Scaling Plan, Open decisions, Pipeline stages (current → scalable), Storage layout (per run), Why the current clustering won't scale

### Community 34 - "Kurdish Data Explorer"
Cohesion: 0.33
Nodes (5): Embedding models, Kurdish Data Explorer, Layout, Quickstart, Research wiki

### Community 35 - "lint_wiki.py"
Cohesion: 0.60
Nodes (5): main(), page_title(), parse_frontmatter(), slug(), wiki_pages()

### Community 41 - "Morphological Richness"
Cohesion: 0.29
Nodes (7): Change log, Connections, Evidence, Key claims, Morphological Richness, Open questions, Summary

### Community 42 - "Transformer Models"
Cohesion: 0.29
Nodes (7): Change log, Connections, Evidence, Key claims, Open questions, Summary, Transformer Models

### Community 43 - "KDX-MiniLM-TSDAE (fine-tuned embedder)"
Cohesion: 0.29
Nodes (7): Change log, Connections, Evidence / evaluation, How it was trained (full transparency), KDX-MiniLM-TSDAE (fine-tuned embedder), Open questions, Summary

### Community 44 - "Kurdish Data Explorer Pipeline"
Cohesion: 0.29
Nodes (7): Change log, Connections, Evidence (pipeline stages), Key claims, Kurdish Data Explorer Pipeline, Open questions / risks, Summary

### Community 47 - "The Kurdish Language Corpus: State of the Art (Azzat et al. 2023)"
Cohesion: 0.29
Nodes (7): Change log, Connections, Evidence, Key claims, Open questions, Summary, The Kurdish Language Corpus: State of the Art (Azzat et al. 2023)

### Community 48 - "Wiki Index"
Cohesion: 0.33
Nodes (6): Concepts, Entities, Questions, Sources, Synthesis, Wiki Index

## Knowledge Gaps
- **250 isolated node(s):** `Core rule`, `Directory structure`, `Page format`, `Summary`, `Key claims` (+245 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Implementation and Methodology` connect `Implementation and Methodology` to `index.md`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `Project Presentation Overview` connect `Soran Badawi` to `index.md`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `Central Kurdish (Sorani)` connect `Topic Modeling` to `index.md`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `main()` (e.g. with `render_upload()` and `Path`) actually correct?**
  _`main()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Kurdish Data Explorer: interactive Streamlit app.  Reads precomputed artifacts f`, `Pastel blue for unlabeled leaves, tuned per theme.`, `Neutral grey for internal (non-leaf) tree nodes, tuned per theme.` to the rest of the system?**
  _304 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.md` be split into smaller, more focused modules?**
  _Cohesion score 0.10227272727272728 - nodes in this community are weakly interconnected._
- **Should `streamlit_app.py` be split into smaller, more focused modules?**
  _Cohesion score 0.1039136302294197 - nodes in this community are weakly interconnected._