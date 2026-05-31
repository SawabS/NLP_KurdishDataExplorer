---
title: "Wiki Schema"
type: concept
created: 2026-05-31
updated: 2026-05-31
status: stable
tags: [architecture, agents-md, schema]
sources: ["raw/sources/karpathy-llm-wiki.md"]
---

# Wiki Schema

## Summary

The wiki schema is the instruction file that tells an LLM agent how the wiki is structured, what conventions to follow, and how to perform ingest, query, and lint operations. In this repository, that schema is `AGENTS.md`.

## Key claims

- A schema file turns the LLM from a generic chatbot into a disciplined wiki maintainer. Evidence: raw/sources/karpathy-llm-wiki.md:33.
- The schema should evolve with the user's domain and preferences. Evidence: raw/sources/karpathy-llm-wiki.md:33 and raw/sources/karpathy-llm-wiki.md:37.
- The schema should define workflows, file conventions, and page formats. Evidence: raw/sources/karpathy-llm-wiki.md:33.

## Evidence

- raw/sources/karpathy-llm-wiki.md:33 names `AGENTS.md` as a Codex-compatible schema example.
- raw/sources/karpathy-llm-wiki.md:75 says directory structure, schema conventions, and tooling are implementation-specific.

## Connections

- [[Karpathy LLM Wiki]]
- [[LLM Wiki]]
- [[Wiki Ingest Workflow]]
- [[Wiki Query Workflow]]
- [[Wiki Lint Workflow]]

## Open questions

- Which domain-specific rules should be added once Kurdish ASR sources are ingested?

## Change log

- 2026-05-31: Created during ingest of [[Karpathy LLM Wiki]].
