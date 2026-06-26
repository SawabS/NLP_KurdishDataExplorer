---
title: "Transformer Models"
type: concept
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [transformers, attention, bert, embeddings, deep-learning]
sources:
  - raw/sources/A Transformer-based Neural Network Machine Translation Model for the Kurdish Sorani Dialect.pdf
  - raw/sources/Idiom Detection in Sorani Kurdish Texts.pdf
  - raw/sources/Morphological Feature Extraction for Fine-Grained Sorani Kurdish Dialect.pdf
  - raw/sources/Multilingual transformer and BERTopic for short text topic modeling: The case of Serbian.pdf
---

# Transformer Models

## Summary

Transformer models use the attention mechanism to build contextual representations
of text. Across the ingested Kurdish sources they consistently outperform earlier
sequence-to-sequence and recurrent approaches, and they supply the embeddings that
the project's [[Topic Modeling]] depends on.

## Key claims

- Attention-based architectures transfer effectively to [[Low-Resource Languages]],
  including Kurdish, even with limited data.
- Pretrained multilingual sentence-transformers can serve as embedding backbones,
  reducing the need for task-specific preprocessing.
- Adding explicit linguistic features to transformer embeddings can help on hard,
  closely related classes.

## Evidence

- [[A Transformer-based NMT Model for Sorani (Badawi 2023)]]: first Kurdish
  transformer NMT, BLEU 0.45.
- [[Idiom Detection in Sorani Kurdish Texts (Omer & Hassani 2025)]]: fine-tuned
  [[KuBERT]] ~99% vs RCNN 96.5% vs BiLSTM 80%.
- [[Morphological Feature Extraction for Sorani Dialect Identification (Bharati et al. 2026)]]:
  XLM-RoBERTa + 24 morphological features, 91.91% accuracy.
- [[Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et al. 2024)]]:
  multilingual sentence-transformer embeddings power [[BERTopic]].

## Connections

- Entities: [[KuBERT]], [[BERTopic]]. Related concepts: [[Topic Modeling]],
  [[Text Classification]], [[Morphological Richness]], [[Low-Resource Languages]].
- Supplies embeddings for the [[Kurdish Data Explorer Pipeline]].

## Open questions

- Kurdish-specific (KuBERT) vs multilingual sentence-transformers — which embeds
  Sorani headlines best for clustering?

## Change log

- 2026-06-26: Created during initial source ingest.
