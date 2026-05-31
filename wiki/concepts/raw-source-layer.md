---
title: "Raw Source Layer"
type: concept
created: 2026-05-31
updated: 2026-05-31
status: stable
tags: [architecture, sources]
sources: ["raw/sources/karpathy-llm-wiki.md"]
---

# Raw Source Layer

## Summary

The raw source layer is the immutable evidence layer of an [[LLM Wiki]]. It contains source documents and assets that the LLM reads from but does not edit during wiki maintenance.

## Key claims

- Raw sources are the source of truth for the wiki. Evidence: raw/sources/karpathy-llm-wiki.md:29.
- The LLM should read raw sources and use them as evidence, but maintain derived knowledge in the [[Persistent Wiki Layer]]. Evidence: raw/sources/karpathy-llm-wiki.md:29-31.

## Evidence

- raw/sources/karpathy-llm-wiki.md:29 describes raw sources as curated, immutable source documents.
- raw/sources/karpathy-llm-wiki.md:31 contrasts raw sources with the LLM-owned wiki layer.

## Connections

- [[Karpathy LLM Wiki]]
- [[LLM Wiki]]
- [[Persistent Wiki Layer]]
- [[Wiki Ingest Workflow]]

## Open questions

- How should externally downloaded web pages be normalized before being placed in `raw/sources/`?

## Change log

- 2026-05-31: Created during ingest of [[Karpathy LLM Wiki]].
