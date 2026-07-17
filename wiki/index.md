# Wiki Index

Main navigation for the LLM Wiki. Update this file after every ingest, query write-up, or lint pass.

This wiki supports the **Kurdish Data Explorer** project — an interactive
topic-modeling and exploratory analysis tool for Central Kurdish (Sorani) text. See
the synthesis page for how the sources fit together.

## Sources

- [KLPT – Kurdish Language Processing Toolkit (Ahmadi 2020)](sources/klpt-kurdish-language-processing-toolkit.md) — open-source Python toolkit for Kurdish preprocessing, stemming, transliteration, tokenization.
- [Kurdish News Dataset Headlines (KNDH) (Badawi et al. 2023)](sources/kndh-kurdish-news-dataset-headlines.md) — 50k balanced Sorani news headlines across five categories.
- [Toward Kurdish Language Processing: The AsoSoft Text Corpus (Veisi et al. 2019)](sources/asosoft-text-corpus.md) — first large (188M-token) Central Kurdish corpus, normalized to TEI XML.
- [The Kurdish Language Corpus: State of the Art (Azzat et al. 2023)](sources/kurdish-language-corpus-state-of-the-art.md) — survey of Kurdish corpora; orthography and annotation gaps.
- [Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et al. 2024)](sources/bertopic-short-text-serbian.md) — methodological blueprint: BERTopic vs LDA/NMF on short morphologically rich text.
- [Idiom Detection in Sorani Kurdish Texts (Omer & Hassani 2025)](sources/idiom-detection-sorani.md) — KuBERT transformer reaches ~99% vs recurrent baselines.
- [A Transformer-based NMT Model for Sorani (Badawi 2023)](sources/transformer-nmt-sorani.md) — first Kurdish transformer NMT, BLEU 0.45.
- [Morphological Feature Extraction for Sorani Dialect Identification (Bharati et al. 2026)](sources/morphological-feature-extraction-sorani.md) — hybrid XLM-RoBERTa + morphology, six-way sub-dialect ID.

## Entities

- [KLPT](entities/klpt.md) — Kurdish Language Processing Toolkit (Python).
- [Kurdish News Dataset Headlines (KNDH)](entities/kndh.md) — labelled short-text dataset (primary project data).
- [AsoSoft Text Corpus](entities/asosoft-text-corpus.md) — large Sorani running-text corpus.
- [BERTopic](entities/bertopic.md) — transformer-based topic modeling method (primary modeling tool).
- [KuBERT](entities/kubert.md) — Kurdish BERT variant.
- [Soran Badawi](entities/soran-badawi.md) — author of KNDH and the Sorani NMT model.
- [KDX-MiniLM-TSDAE (fine-tuned embedder)](entities/kdx-minilm-tsdae-model.md) — our domain-adapted Kurdish embedder with anisotropy-aware leaf clustering; the default local model, selectable alongside base MiniLM and hosted OpenAI/NVIDIA embeddings.

## Concepts

- [Central Kurdish (Sorani)](concepts/central-kurdish-sorani.md) — target dialect of the project.
- [Low-Resource Languages](concepts/low-resource-languages.md) — the framing constraint for Kurdish NLP.
- [Topic Modeling](concepts/topic-modeling.md) — the core analysis task.
- [Morphological Richness](concepts/morphological-richness.md) — Sorani morphology and its tokenization impact.
- [Text Normalization](concepts/text-normalization.md) — encoding/orthography unification as a prerequisite.
- [Transformer Models](concepts/transformer-models.md) — attention-based models supplying embeddings.
- [Text Classification](concepts/text-classification.md) — supervised counterpart and label baseline.

## Questions

No question pages yet.

## Synthesis

- [Application Architecture and Operation](synthesis/application-architecture-and-operation.md) — how to run the React/FastAPI and Streamlit interfaces, with Mermaid system, request, and fitting-flow diagrams plus troubleshooting.
- [Kurdish Data Explorer Pipeline](synthesis/kurdish-data-explorer-pipeline.md) — how the eight sources ground each stage of the project pipeline.
- [Implementation and Methodology](synthesis/implementation-and-methodology.md) — transparent as-built record: data provenance, BERTopic tuning, OpenAI/NVIDIA embeddings, FastAPI + React behavior, retained Streamlit compatibility, and reproducibility.
- [Project Presentation Overview](synthesis/project-presentation-overview.md) — single linear narrative (problem → literature → methodology → results → limitations → conclusion), refreshed with the KDX clustering diagnosis for presentations/podcast generation.
