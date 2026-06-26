---
title: "Idiom Detection in Sorani Kurdish Texts (Omer & Hassani 2025)"
type: source
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [kurdish, sorani, idiom-detection, text-classification, transformers, kubert, deep-learning]
sources: ["raw/sources/Idiom Detection in Sorani Kurdish Texts.pdf"]
---

# Idiom Detection in Sorani Kurdish Texts (Omer & Hassani 2025)

## Summary

Skala Kamaran Omer and Hossein Hassani (University of Kurdistan Hewlêr) frame idiom
detection in [[Central Kurdish (Sorani)]] as a [[Text Classification]] problem and
compare a fine-tuned [[KuBERT]] transformer against recurrent baselines. The result
— a transformer reaching near-99% accuracy — is cited in the project as evidence
that [[Transformer Models]] transfer effectively to [[Low-Resource Languages]].

## Key claims

- A new dataset of **10,580 sentences** embedding **101 Sorani idioms** across
  diverse contexts was manually constructed.
- Three models were trained: a KuBERT-based transformer sequence classifier, an
  RCNN, and a BiLSTM with attention.
- The fine-tuned transformer consistently outperformed the recurrent baselines,
  supporting transformer use in low-resource Kurdish.

## Evidence

- Reported accuracy: **transformer ≈ 99%**, RCNN **96.5%**, BiLSTM **80%**.
- Sorani idioms span word-form, phrase-form, and sentence-form, where metaphor and
  context are crucial — a hard test of contextual modeling.
- Stated limitation: the dataset's restricted size.
- arXiv:2501.14528 (2025).

## Connections

- Model entity: [[KuBERT]]
- Concepts: [[Central Kurdish (Sorani)]], [[Text Classification]],
  [[Transformer Models]], [[Low-Resource Languages]]
- Supports the choice of transformer-based embeddings in the
  [[Kurdish Data Explorer Pipeline]].

## Open questions

- Would KuBERT also be a strong embedding backbone for [[Topic Modeling]] of
  Kurdish text, versus the multilingual sentence-transformers used by BERTopic?
- How well does the near-99% figure generalize beyond the 101 curated idioms?

## Change log

- 2026-06-26: Initial ingest from raw PDF.
