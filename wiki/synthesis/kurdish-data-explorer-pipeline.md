---
title: "Kurdish Data Explorer Pipeline"
type: synthesis
created: 2026-06-26
updated: 2026-07-24
status: stable
tags: [synthesis, project, pipeline, topic-modeling, fastapi, react, sorani]
sources: ["raw/sources/KLPT – Kurdish Language Processing Toolkit.pdf", "raw/sources/Kurdish News Dataset Headlines (KNDH) through multiclass classification.pdf", "raw/sources/Toward Kurdish language processing: Experiments in collecting and processing the AsoSoft text corpus.pdf", "raw/sources/THE KURDISH LANGUAGE CORPUS: STATE OF THE ART.pdf", "raw/sources/Multilingual transformer and BERTopic for short text topic modeling: The case of Serbian.pdf", "raw/sources/Idiom Detection in Sorani Kurdish Texts.pdf", "raw/sources/A Transformer-based Neural Network Machine Translation Model for the Kurdish Sorani Dialect.pdf", "raw/sources/Morphological Feature Extraction for Fine-Grained Sorani Kurdish Dialect.pdf"]
---

# Kurdish Data Explorer Pipeline

## Summary

This page synthesizes the eight ingested sources into the design rationale for the
Kurdish Data Explorer: an interactive [[Topic Modeling]] and exploratory analysis
tool for [[Central Kurdish (Sorani)]] text. The project does not build a new model
from scratch; it assembles established, citable components to make latent thematic
structure in existing Kurdish text legible to non-specialist readers. Each design
choice below is grounded in a specific source.

## Key claims

- **The problem is accessibility, not data shortage.** Usable corpora exist but are
  hard to inspect, and Kurdish lacks unified orthography — so an accessible explorer
  addresses an acknowledged need.
- **Two complementary data assets.** Short labelled headlines plus longer running
  text broaden genre coverage and give a label baseline for discovered topics.
- **Normalization is a prerequisite stage**, handled by an established toolkit
  rather than bespoke code.
- **Transformer-based topic modeling is the primary method**, compared against
  classical baselines using coherence — mirroring prior work on a morphologically
  rich, low-resource language.

## Evidence (pipeline stages)

1. **Data** — [[Kurdish News Dataset Headlines (KNDH)]] (50k labelled Sorani
   headlines) for short text; [[AsoSoft Text Corpus]] (188M tokens) for longer
   running text. Motivation reinforced by
   [[The Kurdish Language Corpus: State of the Art (Azzat et al. 2023)]].
2. **Normalization / tokenization** — [[KLPT]] handles
   [[Text Normalization]] and morphology-aware tokenization; KNDH itself was
   already preprocessed with KLPT.
3. **Embedding + modeling** — multilingual sentence-transformers feed [[BERTopic]]
   (UMAP → HDBSCAN → c-TF-IDF), following
   [[Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et al. 2024)]].
4. **Baselines + evaluation** — LDA and NMF compared via topic coherence (NPMI).
5. **Deployment** — FastAPI serves the artifact API and production Vite/React
   bundle as one application. The controlled Fly demo exposes one
   `corpus-unreviewed` sample with separate completed OpenAI and NVIDIA runs.

Transformer choices are backstopped by Kurdish-specific evidence that attention
models transfer to low-resource settings:
[[Idiom Detection in Sorani Kurdish Texts (Omer & Hassani 2025)]] (KuBERT ~99%),
[[A Transformer-based NMT Model for Sorani (Badawi 2023)]] (BLEU 0.45), and
[[Morphological Feature Extraction for Sorani Dialect Identification (Bharati et al. 2026)]]
(XLM-R + morphology, 91.91%).

## Connections

- Concepts: [[Topic Modeling]], [[Text Normalization]], [[Morphological Richness]],
  [[Transformer Models]], [[Text Classification]], [[Low-Resource Languages]],
  [[Central Kurdish (Sorani)]].
- Entities: [[KLPT]], [[Kurdish News Dataset Headlines (KNDH)]],
  [[AsoSoft Text Corpus]], [[BERTopic]], [[KuBERT]], [[Soran Badawi]],
  [[KDX-MiniLM-TSDAE (fine-tuned embedder)]].
- **As-built record (how it was actually implemented and trained):**
  [[Implementation and Methodology]].

## Open questions / risks

- **Source-grounded caution:** the BLEU 0.45 in the NMT paper and the near-99% idiom
  accuracy are strong claims on small data; cite them as encouraging, not decisive.
- **Data availability — resolved:** both KNDH and AsoSoft (Small) were ingested
  successfully; see provenance in [[Implementation and Methodology]]. AsoSoft Large
  (75M tokens) is extracted locally for upload-path testing but is not a built-in
  shipped source; the topic-annotated subset remains optional/not yet ingested.
- **Topic–label alignment — answered empirically:** unsupervised BERTopic on full
  KNDH reaches NMI 0.232 against the 5 human categories (base MiniLM), vs 0.212 for
  the anisotropy-aware TSDAE-adapted embedder — topics partially but not fully recover the human
  labels; full sweep in [[Implementation and Methodology]].
- **Embedding backbone — narrowed, not fully closed:** the active registry contains
  base MiniLM, domain-adapted [[KDX-MiniLM-TSDAE (fine-tuned embedder)]], OpenAI
  `text-embedding-3-small`, and NVIDIA `nemotron-3-embed-1b`. New interactive fits
  offer the two hosted providers; local models support existing artifacts and
  keyless research. DistilUSE, MPNet, and E5-base were unregistered after weaker
  results. Kurdish-specific [[KuBERT]] was never wired into the embedding stage,
  so comparison against a Kurdish-specific encoder remains untested.

## Change log

- 2026-06-26: Created after initial ingest of all eight sources.
- 2026-07-04: Reconciled open questions against the finished implementation —
  data acquisition and topic–label alignment questions answered, embedding-backbone
  question narrowed. Full as-built detail lives in
  [[Implementation and Methodology]]; this page stays the literature-grounded
  design rationale.
- 2026-07-24: Updated the deployment and embedding stages for the sole
  FastAPI/React application, active four-model registry, and controlled
  OpenAI/NVIDIA `corpus-unreviewed` demo.
