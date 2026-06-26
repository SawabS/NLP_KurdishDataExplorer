---
title: "Central Kurdish (Sorani)"
type: concept
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [kurdish, sorani, dialect, language, arabic-script]
sources:
  - raw/sources/Toward Kurdish language processing: Experiments in collecting and processing the AsoSoft text corpus.pdf
  - raw/sources/KLPT – Kurdish Language Processing Toolkit.pdf
  - raw/sources/THE KURDISH LANGUAGE CORPUS: STATE OF THE ART.pdf
---

# Central Kurdish (Sorani)

## Summary

Central Kurdish, commonly called Sorani, is one of the two main branches of
Kurdish and the formal dialect of Kurdish literature. It is the target dialect of
this project and of most sources ingested here. It is usually written in an
Arabic-based script and is morphologically rich, which complicates tokenization and
statistical analysis.

## Key claims

- Sorani is the dominant dialect in Kurdish NLP work — roughly 90% of processing
  studies target it (per [[KLPT – Kurdish Language Processing Toolkit (Ahmadi 2020)]]).
- It is the formal literary dialect; Kurdish overall has 30+ million speakers, with
  ~6 million Sorani speakers cited for Iraq and Iran.
- Sorani exhibits substantial regional sub-dialect variation (e.g. Sulaymaniyah,
  Erbil, Mukriani).

## Evidence

- [[AsoSoft Text Corpus]] is built specifically for Central Kurdish (188M tokens).
- [[Morphological Feature Extraction for Sorani Dialect Identification (Bharati et al. 2026)]]
  enumerates six Sorani sub-dialects and reports ~6M speakers.
- The Arabic-based script lacks capitalization and omits the vowel *i*, complicating
  morphological analysis (per KLPT and the corpus survey).

## Connections

- Entities: [[KLPT]], [[Kurdish News Dataset Headlines (KNDH)]],
  [[AsoSoft Text Corpus]], [[KuBERT]], [[Soran Badawi]].
- Related concepts: [[Morphological Richness]], [[Text Normalization]],
  [[Low-Resource Languages]].
- Subject language of the [[Kurdish Data Explorer Pipeline]].

## Open questions

- Should the explorer keep Sorani sub-dialects separate, or treat Sorani as one
  variety?

## Change log

- 2026-06-26: Created during initial source ingest.
