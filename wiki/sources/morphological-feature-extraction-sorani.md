---
title: "Morphological Feature Extraction for Sorani Dialect Identification (Bharati et al. 2026)"
type: source
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [kurdish, sorani, dialect-identification, morphology, transformers, xlm-roberta, hybrid]
sources: ["raw/sources/Morphological Feature Extraction for Fine-Grained Sorani Kurdish Dialect.pdf"]
---

# Morphological Feature Extraction for Sorani Dialect Identification (Bharati et al. 2026)

## Summary

Soumedhik Bharati and colleagues (Sister Nivedita University) build the first
fine-grained sub-dialect identification system for [[Central Kurdish (Sorani)]],
using a hybrid approach that injects explicit morphological features into a
transformer. The work underscores both the [[Morphological Richness]] of Sorani and
the value of pairing neural representations with linguistic preprocessing — exactly
the combination the project adopts via [[KLPT]] plus transformer embeddings.
Published at the 2nd Workshop on NLP for Languages Using Arabic Script (AbjadNLP),
2026.

## Key claims

- Presents the first **six-way** Sorani sub-dialect classifier, covering
  Sulaymaniyah, Erbil, Iranian Sorani, Ardalani, Babani, and Mukriani varieties.
- A hybrid architecture combining XLM-RoBERTa embeddings with morphological
  features outperforms both pure transformers and classical ML baselines.
- Morphological features act as effective regularizers for geographically
  proximate, easily confused dialects.

## Evidence

- Unified dataset of **16,409 sentences** from metadata-rich corpora.
- Morphology vector of **24 linguistically motivated features** (verb prefixes,
  clitics, markers) concatenated with XLM-RoBERTa embeddings.
- Accuracy: **morphology-augmented XLM-R 91.91%** vs **pure transformer 91.79%**
  vs **SVM 86.41%**.
- ~6 million Sorani speakers across Iraq and Iran (paper's framing).
- DOI 10.18653/v1/2026.abjadnlp-1.24.

## Connections

- Concepts: [[Morphological Richness]], [[Central Kurdish (Sorani)]],
  [[Transformer Models]], [[Text Classification]], [[Low-Resource Languages]]
- Justifies pairing linguistic preprocessing ([[KLPT]]) with neural embeddings in
  the [[Kurdish Data Explorer Pipeline]].

## Open questions

- The morphology gain over a pure transformer is small (0.12 points) — is it
  robust across runs, or within noise?
- Could the 24 morphological features improve topic-keyword quality, not just
  dialect classification?

## Change log

- 2026-06-26: Initial ingest from raw PDF.
