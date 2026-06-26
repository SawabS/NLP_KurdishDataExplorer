---
title: "KLPT – Kurdish Language Processing Toolkit (Ahmadi 2020)"
type: source
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [kurdish, nlp, toolkit, preprocessing, tokenization, sorani, kurmanji]
sources: ["raw/sources/KLPT – Kurdish Language Processing Toolkit.pdf"]
---

# KLPT – Kurdish Language Processing Toolkit (Ahmadi 2020)

## Summary

Sina Ahmadi introduces [[KLPT]], an open-source Python toolkit that packages
fundamental [[Central Kurdish (Sorani)]] and Kurmanji language-processing tasks
behind a documented, dialect- and script-aware interface. The paper argues that
progress on [[Low-Resource Languages]] like Kurdish is hindered less by
algorithms than by the absence of reusable, openly licensed basic tooling, and
positions KLPT as a reproducible foundation for downstream work. Published at the
Second Workshop for NLP Open Source Software (NLP-OSS), ACL 2020.

## Key claims

- Many earlier Kurdish spell-checking and stemming tools were never released
  under an open licence, blocking reuse; KLPT is published openly on PyPI
  (`pip install klpt`) and GitHub.
- KLPT is implemented in pure Python with **four core modules**: Preprocess,
  Stem, Transliterate, and Tokenize, plus an internal Configuration module.
- Dialect/script variation is handled through external data files (JSON, Hunspell
  `.aff`/`.dic`, lexicons) rather than hard-coding, so the toolkit is extensible.
- Kurdish [[Text Normalization]] is a first-class problem: visually similar
  graphemes carry different encodings, and the toolkit unifies them.

## Evidence

- **Preprocess** module: `normalize()` unifies grapheme encodings,
  `standardize()` applies orthographic conventions, `unify_numeral()` converts
  Farsi/Eastern-Arabic/Western-Arabic numerals. Driven by `preprocess.json`
  regular expressions per dialect/script.
- **Stem** module: `Stem` and `Spellcheck` classes built on Hunspell. Functions
  include `stem()`, `lemmatize()`, `analyze()` (returns POS and suffix flags),
  `suffix_suggest()`, `check_spelling()`, `correct_spelling()`.
- **Transliterate** module: uses the Wergor rule-based transliterator between
  Arabic-based and Latin-based scripts; resolving double-usage characters و and
  ی is hard, and detecting the unwritten vowel *i* (Bizroke) reached only ~39%
  accuracy.
- **Tokenize** module: lexicon + morphological analyzer for `word_tokenize()`,
  `mwe_tokenize()`, `sent_tokenize()`; handles concatenated clitics/affixes
  common in the Arabic-based script.
- Corpus survey within the paper notes ~90% of Kurdish processing studies target
  Sorani; Kurmanji is comparatively underserved.

## Connections

- Tool entity: [[KLPT]]
- Concepts: [[Central Kurdish (Sorani)]], [[Low-Resource Languages]],
  [[Text Normalization]], [[Morphological Richness]]
- The [[Kurdish News Dataset Headlines (KNDH)]] dataset is preprocessed with KLPT.
- Anchors the preprocessing stage of the [[Kurdish Data Explorer Pipeline]].

## Open questions

- Which KLPT module versions and configuration options best fit short news
  headlines versus longer running text?
- How does the low (39%) Bizroke-detection accuracy affect downstream
  tokenization quality on real Sorani news text?

## Change log

- 2026-06-26: Initial ingest from raw PDF.
