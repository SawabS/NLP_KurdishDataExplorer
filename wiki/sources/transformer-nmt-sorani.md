---
title: "A Transformer-based NMT Model for Sorani (Badawi 2023)"
type: source
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [kurdish, sorani, machine-translation, transformers, bleu, parallel-corpus]
sources: ["raw/sources/A Transformer-based Neural Network Machine Translation Model for the Kurdish Sorani Dialect.pdf"]
---

# A Transformer-based NMT Model for Sorani (Badawi 2023)

## Summary

[[Soran Badawi]] presents what the paper describes as the first transformer-based
neural machine translation (NMT) model for [[Central Kurdish (Sorani)]]. By merging
existing Kurdish–English parallel corpora into one larger corpus with a shared
vocabulary, the study shows that attention-based [[Transformer Models]] can be
trained productively on aggregated Kurdish data. Published in the *UHD Journal of
Science and Technology*, 7(1), 15–21 (2023).

## Key claims

- First transformer-based NMT model reported for the Kurdish language.
- Combining all available Kurdish–English parallel corpora into one large corpus,
  with a shared vocabulary dictionary, makes transformer training viable.
- Demonstrates that attention mechanisms outperform earlier sequence-to-sequence
  approaches for this [[Low-Resource Languages]] setting.

## Evidence

- Reported **BLEU score of 0.45**, which the author reads as high-quality
  translation by the BLEU standard.
- Open-access article; DOI 10.21928/uhdjst.v7n1y2023.pp15-21.

## Connections

- Author: [[Soran Badawi]] (also released [[Kurdish News Dataset Headlines (KNDH)]])
- Concepts: [[Transformer Models]], [[Central Kurdish (Sorani)]],
  [[Low-Resource Languages]]
- Secondary evidence (alongside [[Idiom Detection in Sorani Kurdish Texts (Omer & Hassani 2025)]])
  that transformers train productively on aggregated Kurdish data, informing the
  [[Kurdish Data Explorer Pipeline]].

## Open questions

- A BLEU of 0.45 is unusually high for low-resource NMT; what evaluation split and
  corpus overlap produced it? (Worth caution before over-generalizing.)
- Which parallel corpora were merged, and are they reusable?

## Change log

- 2026-06-26: Initial ingest from raw PDF.
