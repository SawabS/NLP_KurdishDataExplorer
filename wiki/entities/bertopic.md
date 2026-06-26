---
title: "BERTopic"
type: entity
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [topic-modeling, transformers, embeddings, umap, hdbscan, c-tf-idf, method]
sources:
  - raw/sources/Multilingual transformer and BERTopic for short text topic modeling: The case of Serbian.pdf
---

# BERTopic

## Summary

BERTopic is a transformer-based [[Topic Modeling]] technique that replaces
bag-of-words assumptions with contextual document embeddings. It is the project's
primary modeling method, chosen because prior work shows it produces informative
topics on short, morphologically rich, low-resource text with limited
preprocessing.

## Key claims

- Pipeline: sentence-transformer embeddings → UMAP dimensionality reduction →
  HDBSCAN clustering → class-based TF-IDF (c-TF-IDF) topic representation.
- Does not require the number of topics to be fixed in advance (unlike LDA/NMF).
- Tolerates partial preprocessing with minimal performance loss.

## Evidence

- In [[Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et al. 2024)]],
  BERTopic gave more informative topics than LDA and NMF on COVID-19 vaccine
  hesitancy tweets, evaluated with NPMI coherence and topic diversity.
- Embedding models tested there: `distiluse-base-multilingual-cased-v2`,
  `paraphrase-multilingual-MiniLM-L12-v2`, `paraphrase-multilingual-mpnet-base-v2`.

## Connections

- Demonstrated by
  [[Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et al. 2024)]].
- Concepts: [[Topic Modeling]], [[Transformer Models]], [[Low-Resource Languages]].
- Core modeling stage of the [[Kurdish Data Explorer Pipeline]]; compared against
  LDA and NMF baselines.

## Open questions

- Which embedding model and UMAP/HDBSCAN parameters give the best NPMI coherence on
  Sorani headlines?

## Change log

- 2026-06-26: Created during initial source ingest.
