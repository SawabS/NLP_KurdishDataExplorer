---
title: "Morphological Richness"
type: concept
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [morphology, clitics, affixes, tokenization, sorani]
sources:
  - raw/sources/KLPT – Kurdish Language Processing Toolkit.pdf
  - raw/sources/Morphological Feature Extraction for Fine-Grained Sorani Kurdish Dialect.pdf
---

# Morphological Richness

## Summary

Sorani is morphologically rich: words combine stems with many affixes and clitics,
and the Arabic-based script often concatenates them without spaces. This complicates
tokenization and inflates vocabulary, and it is a recurring obstacle and signal
across the sources.

## Key claims

- Word boundaries do not map cleanly to tokens in Sorani; a single written form can
  contain several tokens (noun + endoclitic + enclitic + copula).
- Morphological features carry useful signal — they can regularize models on
  closely related dialects.

## Evidence

- [[KLPT – Kurdish Language Processing Toolkit (Ahmadi 2020)]] gives the example
  *hîwaşyane* decomposing into four tokens, motivating a lexicon-plus-analyzer
  tokenizer.
- [[Morphological Feature Extraction for Sorani Dialect Identification (Bharati et al. 2026)]]
  concatenates 24 morphological features (verb prefixes, clitics, markers) with
  XLM-RoBERTa embeddings, improving sub-dialect classification.

## Connections

- Entities: [[KLPT]]. Related concepts: [[Central Kurdish (Sorani)]],
  [[Text Normalization]], [[Transformer Models]], [[Low-Resource Languages]].
- Motivates pairing linguistic preprocessing with neural embeddings in the
  [[Kurdish Data Explorer Pipeline]].

## Open questions

- How much does imperfect morphological tokenization degrade topic keywords?

## Change log

- 2026-06-26: Created during initial source ingest.
