---
title: "Wiki Index and Log"
type: concept
created: 2026-05-31
updated: 2026-05-31
status: stable
tags: [workflow, navigation, audit]
sources: ["raw/sources/karpathy-llm-wiki.md"]
---

# Wiki Index and Log

## Summary

`wiki/index.md` is the navigational catalog of important pages. `wiki/log.md` is the chronological activity record. Together they help both the user and the LLM understand what exists and what changed recently.

## Key claims

- The index is content-oriented and should list pages with short descriptions. Evidence: raw/sources/karpathy-llm-wiki.md:47.
- The log is chronological and append-only, with consistent headings that can be queried by simple Unix tools. Evidence: raw/sources/karpathy-llm-wiki.md:49.
- The LLM should read the index first when answering questions. Evidence: raw/sources/karpathy-llm-wiki.md:47.

## Evidence

- raw/sources/karpathy-llm-wiki.md:43-49 defines the special role of index and log files.

## Connections

- [[Karpathy LLM Wiki]]
- [[LLM Wiki]]
- [[Wiki Ingest Workflow]]
- [[Wiki Query Workflow]]
- [[Wiki Lint Workflow]]

## Open questions

- Should the index include source counts and status metadata once the wiki grows?

## Change log

- 2026-05-31: Created during ingest of [[Karpathy LLM Wiki]].
