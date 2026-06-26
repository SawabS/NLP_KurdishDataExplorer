---
title: "Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et al. 2024)"
type: source
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [bertopic, topic-modeling, short-text, transformers, low-resource, serbian, baselines]
sources: ["raw/sources/Multilingual transformer and BERTopic for short text topic modeling: The case of Serbian.pdf"]
---

# Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et al. 2024)

## Summary

Darija Medvecki, Bojana Bašaragin, Adela Ljajić, and Nikola Milošević (Institute
for AI Research and Development of Serbia) present the first application of
[[BERTopic]] to short text in a morphologically rich language. They evaluate three
multilingual embedding models at two preprocessing levels and compare against LDA
and NMF baselines. This paper is the **methodological blueprint** for the Kurdish
Data Explorer's [[Topic Modeling]] approach.

## Key claims

- With adequate parameter settings, BERTopic yields informative topics even on
  **partially preprocessed** short text.
- The performance drop from full to partial preprocessing is **minimal** when the
  same parameters are used — important because exhaustive preprocessing is hard in
  [[Low-Resource Languages]].
- Judged by keywords, BERTopic offers more informative topics and novel insights
  than LDA and NMF when the number of topics is not limited.
- The authors explicitly state their findings can inform work on other
  morphologically rich, low-resource languages and short text.

## Evidence

- Dataset: tweets expressing COVID-19 vaccine hesitancy (short, noisy text).
- Three embedding models compared: `distiluse-base-multilingual-cased-v2`,
  `paraphrase-multilingual-MiniLM-L12-v2` (384-dim), and
  `paraphrase-multilingual-mpnet-base-v2` (largest, ~970 MB).
- Pipeline: sentence-transformer embeddings → UMAP dimensionality reduction →
  HDBSCAN clustering → class-based TF-IDF (c-TF-IDF) topic representation.
- Evaluation: topic coherence via **NPMI** plus topic diversity; UMAP
  `random_state=42` for repeatability.
- arXiv:2402.03067 (2024).

## Connections

- Method entity: [[BERTopic]]
- Concepts: [[Topic Modeling]], [[Transformer Models]], [[Low-Resource Languages]],
  [[Morphological Richness]]
- Direct justification for the modeling/evaluation design of the
  [[Kurdish Data Explorer Pipeline]] (multilingual embeddings; LDA/NMF as baselines).

## Open questions

- Do the Serbian findings transfer to Sorani news headlines, which are even
  shorter and from a different script?
- Which of the three embedding models gives the best NPMI coherence on Kurdish
  text?

## Change log

- 2026-06-26: Initial ingest from raw PDF.
