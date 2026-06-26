---
title: "KLPT"
type: entity
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [toolkit, python, preprocessing, tokenization, stemming, sorani, kurmanji]
sources:
  - raw/sources/KLPT – Kurdish Language Processing Toolkit.pdf
  - raw/sources/Kurdish News Dataset Headlines (KNDH) through multiclass classification.pdf
---

# KLPT

## Summary

KLPT (Kurdish Language Processing Toolkit) is an open-source Python library by Sina
Ahmadi for processing [[Central Kurdish (Sorani)]] and Kurmanji text. It packages
[[Text Normalization]], stemming/spell-checking, transliteration, and tokenization
behind a documented, dialect- and script-aware interface, and is the project's
chosen preprocessing foundation.

## Key claims

- Installable via `pip install klpt` (PyPI, Python 3.5+); source on GitHub.
- Four core modules: **Preprocess**, **Stem**, **Transliterate**, **Tokenize**,
  plus an internal **Configuration** module.
- Behavior is data-driven through JSON/Hunspell/lexicon files, not hard-coded, so
  dialect and script variants are configurable and extensible.

## Evidence

- Module APIs documented in
  [[KLPT – Kurdish Language Processing Toolkit (Ahmadi 2020)]] (e.g. `normalize()`,
  `standardize()`, `stem()`, `lemmatize()`, `word_tokenize()`, `transliterate()`).
- Used in practice: the [[Kurdish News Dataset Headlines (KNDH)]] dataset was
  preprocessed with KLPT for tokenizing, spell-checking, stemming, and
  normalization.
- Transliteration relies on the Wergor rule-based engine; detecting the unwritten
  vowel *i* (Bizroke) is reported at only ~39% accuracy.

## Connections

- Introduced by [[KLPT – Kurdish Language Processing Toolkit (Ahmadi 2020)]].
- Applied in [[Kurdish News Dataset Headlines (KNDH) — Multiclass Classification (Badawi et al. 2023)]].
- Concepts: [[Text Normalization]], [[Morphological Richness]],
  [[Central Kurdish (Sorani)]], [[Low-Resource Languages]].
- Preprocessing stage of the [[Kurdish Data Explorer Pipeline]].

## Open questions

- Is KLPT actively maintained, and which version pins reproducible behavior for
  the project?

## Change log

- 2026-06-26: Created during initial source ingest.
