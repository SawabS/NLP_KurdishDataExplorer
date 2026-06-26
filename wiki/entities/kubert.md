---
title: "KuBERT"
type: entity
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [model, bert, transformers, kurdish, sorani]
sources:
  - raw/sources/Idiom Detection in Sorani Kurdish Texts.pdf
---

# KuBERT

## Summary

KuBERT is a Kurdish variant of BERT — a bidirectional [[Transformer Models]]
encoder adapted for Kurdish text. It is the strongest model in the Sorani idiom
detection study and is evidence that pretrained transformers transfer to
[[Low-Resource Languages]] Kurdish tasks.

## Key claims

- A BERT variant developed for Kurdish that captures bidirectional context.
- Fine-tuned for sequence classification, it outperformed recurrent baselines on
  Sorani idiom detection.

## Evidence

- In [[Idiom Detection in Sorani Kurdish Texts (Omer & Hassani 2025)]], a fine-tuned
  KuBERT transformer reached ~99% accuracy, vs RCNN 96.5% and BiLSTM 80%.

## Connections

- Used in [[Idiom Detection in Sorani Kurdish Texts (Omer & Hassani 2025)]].
- Concepts: [[Transformer Models]], [[Central Kurdish (Sorani)]],
  [[Text Classification]], [[Low-Resource Languages]].
- A candidate Kurdish-specific embedding backbone to weigh against multilingual
  sentence-transformers in the [[Kurdish Data Explorer Pipeline]].

## Open questions

- Is KuBERT publicly available as a reusable checkpoint, and on what pretraining
  data?

## Change log

- 2026-06-26: Created during initial source ingest.
