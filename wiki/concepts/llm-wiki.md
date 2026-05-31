---
title: "LLM Wiki"
type: concept
created: 2026-05-31
updated: 2026-05-31
status: stable
tags: [knowledge-base, markdown, llm]
sources: ["raw/sources/karpathy-llm-wiki.md"]
---

# LLM Wiki

## Summary

An LLM Wiki is a Markdown knowledge base maintained by an LLM agent from immutable raw sources. It sits between source documents and future questions so that summaries, links, contradictions, and synthesis accumulate over time.

## Key claims

- The wiki is meant to compound: each ingest or useful query can improve the durable knowledge layer. Evidence: raw/sources/karpathy-llm-wiki.md:11-15 and raw/sources/karpathy-llm-wiki.md:39.
- The user curates sources and directs questions; the LLM performs the maintenance work of summarizing, linking, filing, and updating. Evidence: raw/sources/karpathy-llm-wiki.md:15 and raw/sources/karpathy-llm-wiki.md:68.
- The first implementation should be domain-specific and simple because the source is a pattern, not a fixed product spec. Evidence: raw/sources/karpathy-llm-wiki.md:73-75.

## Evidence

- raw/sources/karpathy-llm-wiki.md:11 defines the persistent wiki between raw sources and questions.
- raw/sources/karpathy-llm-wiki.md:13 says cross-references, contradictions, and synthesis can be pre-maintained.
- raw/sources/karpathy-llm-wiki.md:66-70 explains why maintenance is the central burden being shifted to the LLM.

## Connections

- [[Karpathy LLM Wiki]]
- [[Raw Source Layer]]
- [[Persistent Wiki Layer]]
- [[Wiki Schema]]
- [[Wiki Index and Log]]
- [[Retrieval Augmented Generation]]

## Open questions

- What page granularity should this wiki use as it grows into Kurdish ASR research?
- Which query answers should be filed permanently rather than left in chat?

## Change log

- 2026-05-31: Created during ingest of [[Karpathy LLM Wiki]].
