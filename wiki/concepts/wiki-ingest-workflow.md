---
title: "Wiki Ingest Workflow"
type: concept
created: 2026-05-31
updated: 2026-05-31
status: stable
tags: [workflow, ingest]
sources: ["raw/sources/karpathy-llm-wiki.md"]
---

# Wiki Ingest Workflow

## Summary

The wiki ingest workflow processes one raw source into the [[Persistent Wiki Layer]] by creating a source page, extracting important entities and concepts, updating linked pages, updating [[Wiki Index and Log]], and recording unresolved issues.

## Key claims

- Ingest is more than indexing; it integrates source content into existing wiki pages. Evidence: raw/sources/karpathy-llm-wiki.md:11 and raw/sources/karpathy-llm-wiki.md:37.
- One-source-at-a-time ingest supports human review and steering. Evidence: raw/sources/karpathy-llm-wiki.md:37.
- Contradictions should be marked when a new source challenges older claims. Evidence: raw/sources/karpathy-llm-wiki.md:11 and raw/sources/karpathy-llm-wiki.md:41.

## Evidence

- raw/sources/karpathy-llm-wiki.md:37 describes reading a source, writing a summary, updating index, updating related pages, and appending to log.

## Connections

- [[Karpathy LLM Wiki]]
- [[LLM Wiki]]
- [[Raw Source Layer]]
- [[Persistent Wiki Layer]]
- [[Wiki Index and Log]]

## Open questions

- Should batch ingest be allowed only after source-specific pages are reviewed?

## Change log

- 2026-05-31: Created during ingest of [[Karpathy LLM Wiki]].
