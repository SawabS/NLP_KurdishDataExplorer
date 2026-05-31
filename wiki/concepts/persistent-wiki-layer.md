---
title: "Persistent Wiki Layer"
type: concept
created: 2026-05-31
updated: 2026-05-31
status: stable
tags: [architecture, markdown]
sources: ["raw/sources/karpathy-llm-wiki.md"]
---

# Persistent Wiki Layer

## Summary

The persistent wiki layer is the editable Markdown layer where the LLM writes summaries, entity pages, concept pages, comparisons, questions, and synthesis. It is derived from the [[Raw Source Layer]] but kept as a durable artifact.

## Key claims

- The LLM owns maintenance of the wiki layer: creating pages, updating pages when sources arrive, preserving links, and maintaining consistency. Evidence: raw/sources/karpathy-llm-wiki.md:31.
- The wiki layer is useful because it prevents repeated rediscovery of source material during every question. Evidence: raw/sources/karpathy-llm-wiki.md:9-13.
- Git and Markdown are sufficient for the first version of the layer. Evidence: raw/sources/karpathy-llm-wiki.md:62 and raw/sources/karpathy-llm-wiki.md:75.

## Evidence

- raw/sources/karpathy-llm-wiki.md:31 defines the wiki as the LLM-generated Markdown layer.
- raw/sources/karpathy-llm-wiki.md:47 says an index works well at moderate scale before embedding infrastructure is needed.
- raw/sources/karpathy-llm-wiki.md:62 notes the wiki can be a git repo of Markdown files.

## Connections

- [[Karpathy LLM Wiki]]
- [[LLM Wiki]]
- [[Raw Source Layer]]
- [[Wiki Schema]]
- [[Wiki Index and Log]]

## Open questions

- What status convention should distinguish draft pages from stable pages after human review?

## Change log

- 2026-05-31: Created during ingest of [[Karpathy LLM Wiki]].
