---
title: "Retrieval Augmented Generation"
type: concept
created: 2026-05-31
updated: 2026-05-31
status: draft
tags: [rag, retrieval]
sources: ["raw/sources/karpathy-llm-wiki.md"]
---

# Retrieval Augmented Generation

## Summary

Retrieval Augmented Generation is used in [[Karpathy LLM Wiki]] as the contrast case for an [[LLM Wiki]]. In the source's framing, RAG retrieves source chunks at question time, while an LLM Wiki maintains a persistent derived knowledge layer.

## Key claims

- The source claims common RAG-like workflows can require rediscovering and resynthesizing knowledge for each question. Evidence: raw/sources/karpathy-llm-wiki.md:9.
- The source does not reject retrieval; it argues that persistent wiki maintenance adds accumulation that retrieval-only workflows lack. Evidence: raw/sources/karpathy-llm-wiki.md:9-13.

## Evidence

- raw/sources/karpathy-llm-wiki.md:9 contrasts RAG-style retrieval with accumulated knowledge.
- raw/sources/karpathy-llm-wiki.md:47 says the index can work at moderate scale before embedding-based RAG infrastructure is needed.

## Connections

- [[Karpathy LLM Wiki]]
- [[LLM Wiki]]
- [[Persistent Wiki Layer]]
- [[Wiki Tooling]]

## Open questions

- Future sources may refine this page with a more formal definition of RAG.

## Change log

- 2026-05-31: Created during ingest of [[Karpathy LLM Wiki]].
