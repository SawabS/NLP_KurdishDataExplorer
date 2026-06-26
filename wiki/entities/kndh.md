---
title: "Kurdish News Dataset Headlines (KNDH)"
type: entity
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [dataset, sorani, news, headlines, text-classification, short-text]
sources:
  - raw/sources/Kurdish News Dataset Headlines (KNDH) through multiclass classification.pdf
---

# Kurdish News Dataset Headlines (KNDH)

## Summary

KNDH is an openly published, balanced multiclass dataset of 50,000
[[Central Kurdish (Sorani)]] news headlines, released by [[Soran Badawi]] and
colleagues. It is the primary **short-text** data asset for the Kurdish Data
Explorer and provides human-interpretable category labels for checking discovered
topics.

## Key claims

- 50,000 headlines, **five balanced categories** of 10,000 each.
- Categories (confirmed from the data file's `labels` column): economic, health,
  science & technology, social, sport.
- Scraped from 34 news channels; preprocessed with [[KLPT]].

## Evidence

- Released in *Data in Brief* 48 (2023), article 109120
  (DOI 10.1016/j.dib.2023.109120); dataset DOI 10.17632/kb7vvkg2th.2.
- Collection used ParsHub and the BeautifulSoup Python library.
- Channel breakdown: 8 economics, 14 health, 18 science, 15 social, 5 sport.

## Connections

- Described by
  [[Kurdish News Dataset Headlines (KNDH) — Multiclass Classification (Badawi et al. 2023)]].
- Author: [[Soran Badawi]]. Preprocessing: [[KLPT]].
- Concepts: [[Text Classification]], [[Topic Modeling]],
  [[Central Kurdish (Sorani)]].
- Pairs with [[AsoSoft Text Corpus]] as the two data assets of the
  [[Kurdish Data Explorer Pipeline]].

## Open questions

- What is the exact license and redistribution status for the headlines?

## Change log

- 2026-06-26: Created during initial source ingest.
