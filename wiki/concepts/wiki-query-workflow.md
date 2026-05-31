---
title: "Wiki Query Workflow"
type: concept
created: 2026-05-31
updated: 2026-05-31
status: stable
tags: [workflow, query]
sources: ["raw/sources/karpathy-llm-wiki.md"]
---

# Wiki Query Workflow

## Summary

The wiki query workflow answers questions by searching the maintained wiki first, reading relevant pages, verifying against raw sources when needed, and optionally preserving valuable answers as new wiki pages.

## Key claims

- Queries should use the wiki as the primary working context rather than rediscovering everything from raw documents. Evidence: raw/sources/karpathy-llm-wiki.md:39 and raw/sources/karpathy-llm-wiki.md:47.
- Valuable answers can be filed back into the wiki, allowing exploration to compound. Evidence: raw/sources/karpathy-llm-wiki.md:39.
- The answer format can vary, but this repository starts with Markdown pages only. Evidence: raw/sources/karpathy-llm-wiki.md:39 and raw/sources/karpathy-llm-wiki.md:75.

## Evidence

- raw/sources/karpathy-llm-wiki.md:39 describes query handling and preserving good answers.

## Connections

- [[Karpathy LLM Wiki]]
- [[LLM Wiki]]
- [[Persistent Wiki Layer]]
- [[Wiki Index and Log]]
- [[Wiki Tooling]]

## Open questions

- What makes a query answer durable enough to save under `wiki/questions/`?

## Change log

- 2026-05-31: Created during ingest of [[Karpathy LLM Wiki]].
