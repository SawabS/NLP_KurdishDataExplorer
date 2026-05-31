---
title: "Wiki Lint Report"
type: synthesis
created: 2026-05-31
updated: 2026-05-31
status: stable
tags: [lint, maintenance]
sources: ["wiki/index.md", "wiki/log.md", "tools/lint_wiki.py"]
---

# Wiki Lint Report

## Summary

The first lint pass found no structural issues in the starter wiki after ingesting [[Karpathy LLM Wiki]]. The automated helper checks frontmatter, page types, required fields, duplicate titles, broken Obsidian links, orphan pages, and required core files.

## Key claims

- All current wiki pages have frontmatter and valid page types. Evidence: `./tools/lint_wiki.py` returned no lint issues on 2026-05-31.
- Current Obsidian links resolve across the ingested source, concept, entity, and synthesis pages. Evidence: `./tools/lint_wiki.py` returned no lint issues on 2026-05-31.
- The current lint helper is structural. Semantic checks for contradictions, stale claims, and weak summaries still require source-aware review. Evidence: [[Wiki Lint Workflow]].

## Evidence

- `wiki/index.md` lists the current source, entity, concept, and synthesis pages.
- `wiki/log.md` records setup, ingest, and lint activity.
- `tools/lint_wiki.py` implements the current automated checks.

## Connections

- [[Wiki Lint Workflow]]
- [[Wiki Index and Log]]
- [[Karpathy LLM Wiki]]
- [[Wiki Tooling]]

## Open questions

- Add semantic lint checks only after there are enough domain sources to compare claims across pages.

## Change log

- 2026-05-31: Created after the first lint pass.
