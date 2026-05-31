---
title: "Wiki Lint Workflow"
type: concept
created: 2026-05-31
updated: 2026-05-31
status: stable
tags: [workflow, lint]
sources: ["raw/sources/karpathy-llm-wiki.md"]
---

# Wiki Lint Workflow

## Summary

The wiki lint workflow is a periodic maintenance pass that checks the knowledge base for structural and epistemic problems: orphan pages, stale claims, contradictions, broken links, missing concept pages, and unsupported claims.

## Key claims

- Linting keeps the wiki healthy as sources accumulate. Evidence: raw/sources/karpathy-llm-wiki.md:41.
- The source explicitly calls out contradictions, stale claims, orphan pages, missing cross-references, and missing concept pages as lint targets. Evidence: raw/sources/karpathy-llm-wiki.md:41.
- Some lint findings require human judgment; a script can catch structural issues, but contradiction and weak-summary checks require source-aware review. Evidence: raw/sources/karpathy-llm-wiki.md:41 and raw/sources/karpathy-llm-wiki.md:75.

## Evidence

- raw/sources/karpathy-llm-wiki.md:41 defines the lint operation.

## Connections

- [[Karpathy LLM Wiki]]
- [[LLM Wiki]]
- [[Wiki Schema]]
- [[Wiki Index and Log]]
- [[Wiki Tooling]]
- [[Wiki Lint Report]]

## Open questions

- How strict should automated linting be before the wiki has many pages?

## Change log

- 2026-05-31: Created during ingest of [[Karpathy LLM Wiki]].
