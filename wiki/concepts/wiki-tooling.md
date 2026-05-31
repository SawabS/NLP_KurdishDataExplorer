---
title: "Wiki Tooling"
type: concept
created: 2026-05-31
updated: 2026-05-31
status: stable
tags: [tools, search, markdown]
sources: ["raw/sources/karpathy-llm-wiki.md"]
---

# Wiki Tooling

## Summary

Wiki tooling means small local utilities that help the LLM inspect and maintain the Markdown wiki. The first version should stay simple: local scripts, Markdown, and git. Advanced search, MCP, slide decks, and UI layers are optional later additions.

## Key claims

- A basic search tool is useful as the wiki grows. Evidence: raw/sources/karpathy-llm-wiki.md:51-53.
- Advanced tools such as qmd, MCP, Marp, and Dataview are optional, not prerequisites. Evidence: raw/sources/karpathy-llm-wiki.md:53 and raw/sources/karpathy-llm-wiki.md:57-61.
- The source supports starting with a plain git repository of Markdown files. Evidence: raw/sources/karpathy-llm-wiki.md:62 and raw/sources/karpathy-llm-wiki.md:75.

## Evidence

- raw/sources/karpathy-llm-wiki.md:53 discusses local search tooling.
- raw/sources/karpathy-llm-wiki.md:62 frames the wiki as a git repository.
- raw/sources/karpathy-llm-wiki.md:75 says optional modules can be ignored if unnecessary.

## Connections

- [[Karpathy LLM Wiki]]
- [[LLM Wiki]]
- [[Wiki Query Workflow]]
- [[Wiki Lint Workflow]]
- [[Persistent Wiki Layer]]

## Open questions

- When will the wiki be large enough to justify qmd or embedding-based search?

## Change log

- 2026-05-31: Created during ingest of [[Karpathy LLM Wiki]].
