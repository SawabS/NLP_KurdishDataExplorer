---
title: "Text Normalization"
type: concept
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [normalization, orthography, encoding, preprocessing, kurdish]
sources:
  - raw/sources/KLPT – Kurdish Language Processing Toolkit.pdf
  - raw/sources/Toward Kurdish language processing: Experiments in collecting and processing the AsoSoft text corpus.pdf
  - raw/sources/THE KURDISH LANGUAGE CORPUS: STATE OF THE ART.pdf
---

# Text Normalization

## Summary

Text normalization unifies inconsistent character encodings, orthography, and
numerals so that downstream tasks see consistent input. For Kurdish it is a
prerequisite, not an optional cleanup step: visually similar graphemes carry
different Unicode encodings, and there is no unified orthography.

## Key claims

- Multiple Unicode code points represent the same Kurdish grapheme (e.g. the î/y
  character), so normalization must map them to one canonical form.
- Normalization should precede tokenization, stemming, and modeling.
- The absence of a standard orthography makes this a field-wide obstacle, not a
  one-off engineering chore.

## Evidence

- [[KLPT – Kurdish Language Processing Toolkit (Ahmadi 2020)]] provides
  `normalize()`, `standardize()`, and `unify_numeral()` driven by per-dialect/script
  regex rules.
- [[Toward Kurdish Language Processing: The AsoSoft Text Corpus (Veisi et al. 2019)]]
  documents encoding conversions and mixed-script handling as central challenges.
- [[The Kurdish Language Corpus: State of the Art (Azzat et al. 2023)]] names the
  lack of unified orthography as a core problem.

## Connections

- Entities: [[KLPT]], [[AsoSoft Text Corpus]]. Related concepts:
  [[Central Kurdish (Sorani)]], [[Morphological Richness]],
  [[Low-Resource Languages]].
- First stage of the [[Kurdish Data Explorer Pipeline]].

## Open questions

- What residual normalization errors survive KLPT on real KNDH headlines?

## Change log

- 2026-06-26: Created during initial source ingest.
