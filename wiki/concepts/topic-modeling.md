---
title: "Topic Modeling"
type: concept
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [topic-modeling, bertopic, lda, nmf, coherence, unsupervised]
sources:
  - raw/sources/Multilingual transformer and BERTopic for short text topic modeling: The case of Serbian.pdf
  - raw/sources/Toward Kurdish language processing: Experiments in collecting and processing the AsoSoft text corpus.pdf
---

# Topic Modeling

## Summary

Topic modeling is the unsupervised task of discovering latent themes in a text
collection. The project applies it to surface coherent themes in Kurdish text and
make them legible to non-specialist readers. It contrasts modern transformer-based
[[BERTopic]] against classical LDA and NMF baselines.

## Key claims

- Classical methods (LDA, NMF) use bag-of-words representations, require the number
  of topics up front, and struggle on short text due to sparsity.
- [[BERTopic]] uses contextual embeddings and density-based clustering, does not
  require a fixed topic count, and handles short text better.
- Topic quality is assessed with coherence (e.g. NPMI) and topic diversity, not
  accuracy.

## Evidence

- [[Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et al. 2024)]]
  found BERTopic more informative than LDA/NMF on short morphologically rich text.
- [[AsoSoft Text Corpus]] already carries six topic tags over ~22% of its text and
  used a topic-identification task to validate annotation.

## Connections

- Method entity: [[BERTopic]]; data: [[Kurdish News Dataset Headlines (KNDH)]],
  [[AsoSoft Text Corpus]].
- Related concepts: [[Transformer Models]], [[Low-Resource Languages]],
  [[Text Classification]].
- Central analysis of the [[Kurdish Data Explorer Pipeline]].

## Open questions

- Will discovered topics on KNDH align with the five human category labels?
- Which coherence measure is most meaningful for Sorani?

## Change log

- 2026-06-26: Created during initial source ingest.
