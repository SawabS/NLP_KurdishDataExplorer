---
title: "Text Classification"
type: concept
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [classification, supervised, news, idioms, dialect-id, kurdish]
sources:
  - raw/sources/Kurdish News Dataset Headlines (KNDH) through multiclass classification.pdf
  - raw/sources/Idiom Detection in Sorani Kurdish Texts.pdf
  - raw/sources/Morphological Feature Extraction for Fine-Grained Sorani Kurdish Dialect.pdf
---

# Text Classification

## Summary

Text classification assigns predefined labels to text. It is the supervised
counterpart to the project's unsupervised [[Topic Modeling]]: the labelled
categories of [[Kurdish News Dataset Headlines (KNDH)]] provide a human-interpretable
reference against which discovered topics can be sanity-checked.

## Key claims

- Multiclass news classification, idiom detection, and dialect identification are
  all framed as classification tasks in the Kurdish sources.
- Labelled category structure is useful even for an unsupervised explorer: it gives
  a check on whether topics correspond to recognizable domains.

## Evidence

- [[Kurdish News Dataset Headlines (KNDH) — Multiclass Classification (Badawi et al. 2023)]]:
  five balanced news categories.
- [[Idiom Detection in Sorani Kurdish Texts (Omer & Hassani 2025)]]: idiom vs
  non-idiom classification with transformers.
- [[Morphological Feature Extraction for Sorani Dialect Identification (Bharati et al. 2026)]]:
  six-way sub-dialect classification.

## Connections

- Entities: [[Kurdish News Dataset Headlines (KNDH)]], [[KuBERT]],
  [[Soran Badawi]]. Related concepts: [[Topic Modeling]], [[Transformer Models]],
  [[Central Kurdish (Sorani)]].
- Provides the label baseline for the [[Kurdish Data Explorer Pipeline]].

## Open questions

- How closely do unsupervised topics recover the supervised KNDH categories?

## Change log

- 2026-06-26: Created during initial source ingest.
