---
title: "Kurdish News Dataset Headlines (KNDH) — Multiclass Classification (Badawi et al. 2023)"
type: source
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [kurdish, sorani, dataset, news, text-classification, headlines]
sources: ["raw/sources/Kurdish News Dataset Headlines (KNDH) through multiclass classification.pdf"]
---

# Kurdish News Dataset Headlines (KNDH) — Multiclass Classification (Badawi et al. 2023)

## Summary

A data-descriptor paper (Data in Brief) by [[Soran Badawi]], Ari M. Saeed, Sara A.
Ahmed, Peshraw Ahmed Abdalla, and Diyari A. Hassan releasing the
[[Kurdish News Dataset Headlines (KNDH)]]: a balanced, multiclass collection of
Sorani news headlines built to support [[Text Classification]] research in a
[[Low-Resource Languages]] setting. The dataset is the short-text data asset
underlying the Kurdish Data Explorer project.

## Key claims

- KNDH contains **50,000 Sorani headlines**, equally distributed across **five
  categories** with 10,000 headlines each.
- Headlines were scraped from **34 distinct news channels** and preprocessed with
  [[KLPT]] for tokenization, spell-checking, stemming, and normalization.
- Headlines are deliberately challenging short text: terse, elliptical, low
  redundancy — a realistic testbed for short-text methods.

## Evidence

- The five balanced categories, **confirmed from the released data file** (the
  paper prose is inconsistent, but the `labels` column is authoritative), are:
  **economic, health, science & technology, social, sport** — 10,000 rows each.
- Channel breakdown: 8 economics, 14 health, 18 science, 15 social, 5 sport.
- Collection tooling: ParsHub scraper plus the BeautifulSoup Python library.
- Published in *Data in Brief* 48 (2023), article 109120;
  DOI 10.1016/j.dib.2023.109120. Dataset DOI 10.17632/kb7vvkg2th.2.
- Authors are affiliated with Charmo University, University of Halabja, Komar
  University, and Qaiwan International University (Kurdistan Region, Iraq).

## Connections

- Dataset entity: [[Kurdish News Dataset Headlines (KNDH)]]
- Author: [[Soran Badawi]] (also authored the Sorani [[Transformer Models]] NMT work)
- Preprocessing: [[KLPT]]
- Concepts: [[Central Kurdish (Sorani)]], [[Text Classification]],
  [[Low-Resource Languages]]
- Primary short-text input to the [[Kurdish Data Explorer Pipeline]].

## Open questions

- Do the five human-assigned categories align with unsupervised topics discovered
  by [[Topic Modeling]] over the same headlines?
- How clean is the KLPT preprocessing on these headlines in practice, given
  remaining orthographic variation across 34 channels?

## Change log

- 2026-06-26: Initial ingest from raw PDF.
