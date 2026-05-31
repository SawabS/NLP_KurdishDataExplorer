---
title: "Karpathy LLM Wiki"
type: source
created: 2026-05-31
updated: 2026-05-31
status: stable
tags: [llm-wiki, knowledge-base, markdown]
sources: ["raw/sources/karpathy-llm-wiki.md"]
---

# Karpathy LLM Wiki

## Summary

Karpathy's LLM Wiki note describes a pattern for using an LLM agent to maintain a persistent Markdown wiki between immutable raw sources and future user questions. The source argues that this is different from ordinary [[Retrieval Augmented Generation]] because knowledge is compiled into linked pages once, kept current, and reused across future questions.

The note is intentionally abstract. It defines the pattern, not a finished implementation. This repository instantiates it as a plain Markdown wiki with raw sources, wiki pages, `AGENTS.md`, local Python scripts, and git.

## Key claims

- An [[LLM Wiki]] is a persistent, compounding artifact maintained by an LLM rather than a temporary retrieval context. Evidence: raw/sources/karpathy-llm-wiki.md:11-15.
- The architecture has three layers: [[Raw Source Layer]], [[Persistent Wiki Layer]], and [[Wiki Schema]]. Evidence: raw/sources/karpathy-llm-wiki.md:25-33.
- The core operations are [[Wiki Ingest Workflow]], [[Wiki Query Workflow]], and [[Wiki Lint Workflow]]. Evidence: raw/sources/karpathy-llm-wiki.md:35-41.
- [[Wiki Index and Log]] files make the wiki navigable and auditable with simple tools. Evidence: raw/sources/karpathy-llm-wiki.md:43-49.
- Lightweight [[Wiki Tooling]] can be added later, but the source frames advanced tools as optional. Evidence: raw/sources/karpathy-llm-wiki.md:51-53 and raw/sources/karpathy-llm-wiki.md:73-75.

## Evidence

- raw/sources/karpathy-llm-wiki.md:9 contrasts common RAG-style use with compounding knowledge.
- raw/sources/karpathy-llm-wiki.md:11-13 defines the persistent wiki behavior.
- raw/sources/karpathy-llm-wiki.md:29-33 defines raw sources, wiki, and schema.
- raw/sources/karpathy-llm-wiki.md:37-41 defines ingest, query, and lint.
- raw/sources/karpathy-llm-wiki.md:47-49 explains `index.md` and `log.md`.
- raw/sources/karpathy-llm-wiki.md:75 says the document is abstract and implementation-specific.

## Connections

- Author/entity: [[Andrej Karpathy]]
- Architecture: [[Raw Source Layer]], [[Persistent Wiki Layer]], [[Wiki Schema]]
- Workflows: [[Wiki Ingest Workflow]], [[Wiki Query Workflow]], [[Wiki Lint Workflow]]
- Operations files: [[Wiki Index and Log]]
- Tooling stance: [[Wiki Tooling]]
- Contrast class: [[Retrieval Augmented Generation]]

## Open questions

- The source does not prescribe a specific filename policy, page taxonomy, or frontmatter schema.
- The source does not define a threshold for when a query answer should become a durable wiki page.
- The source mentions optional tools such as qmd, MCP, Marp, and Dataview, but does not require them for the first implementation.

## Change log

- 2026-05-31: Ingested from `raw/sources/karpathy-llm-wiki.md`.
