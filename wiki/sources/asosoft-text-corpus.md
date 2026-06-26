---
title: "Toward Kurdish Language Processing: The AsoSoft Text Corpus (Veisi et al. 2019)"
type: source
created: 2026-06-26
updated: 2026-06-26
status: stable
tags: [kurdish, sorani, corpus, normalization, language-model, topic-annotation]
sources: ["raw/sources/Toward Kurdish language processing: Experiments in collecting and processing the AsoSoft text corpus.pdf"]
---

# Toward Kurdish Language Processing: The AsoSoft Text Corpus (Veisi et al. 2019)

## Summary

Hadi Veisi, Mohammad MohammadAmini, and Hawre Hosseini report the construction of
the [[AsoSoft Text Corpus]], described as the first large [[Central Kurdish (Sorani)]]
text corpus. The paper is valuable as a procedural account: it documents the
encoding conversions, character normalization, and filtering decisions that any
real Kurdish pipeline must confront. Published in *Digital Scholarship in the
Humanities* (2019).

## Key claims

- AsoSoft is the first Kurdish text corpus for the Central Kurdish (Sorani) branch,
  sized at **188 million tokens**, collected mostly from websites, published
  books, and magazines.
- The corpus is normalized and converted into Text Encoding Initiative (TEI) XML.
- About **22% of the corpus is topic-annotated with six topic tags**, and a topic
  identification task was used to validate the annotation.
- Inconsistent character encodings and non-standard orthography are the central
  obstacles to building usable Kurdish text resources.

## Evidence

- Reported tri-gram language-model **perplexity of 276** for Central Kurdish.
- Kurdish is spoken by more than 30 million people; Central Kurdish is the formal
  literary dialect.
- Prior corpora cited as smaller: Pewan (~18M Sorani / ~4M Kurmanji words),
  a 590,568-token Roj TV blog corpus, and a 214,000-word Kurmanji newspaper corpus.
- The paper frames normalization (encoding unification, mixed-script handling) as
  a prerequisite before any statistical modeling can be trusted.

## Connections

- Corpus entity: [[AsoSoft Text Corpus]]
- Concepts: [[Central Kurdish (Sorani)]], [[Text Normalization]],
  [[Low-Resource Languages]], [[Topic Modeling]]
- Provides the longer-running-text data asset for the
  [[Kurdish Data Explorer Pipeline]], complementing [[Kurdish News Dataset Headlines (KNDH)]].
- The normalization challenges here motivate use of [[KLPT]].

## Open questions

- Is the AsoSoft corpus accessible in a form that can be ingested directly, and
  under what licence?
- How do the six existing topic tags relate to topics induced by modern
  [[Topic Modeling]] over the same text?

## Change log

- 2026-06-26: Initial ingest from raw PDF.
