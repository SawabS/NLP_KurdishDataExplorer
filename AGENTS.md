# AGENTS.md

You are maintaining an LLM Wiki.

## Core rule

The raw source layer is immutable. Never modify files inside raw/.
The wiki layer is editable. You may create and update files inside wiki/.
The tools layer is editable. You may create and update scripts inside tools/.

## Directory structure

raw/sources/
- Original source documents.
- Never edit these files.
- Use them as evidence.

raw/assets/
- Images, PDFs, screenshots, audio transcripts, and other attachments.
- Never edit these files unless explicitly asked.

wiki/index.md
- Main navigation file.
- Must list every important wiki page with a one-line description.
- Must be updated after every ingest, query write-up, or lint pass.

wiki/log.md
- Append-only chronological activity log.
- Every entry must start with:
  ## [YYYY-MM-DD] <operation> | <title>

wiki/sources/
- One page per ingested source.
- Source summaries, claims, key evidence, and links to entity/concept pages.

wiki/entities/
- People, organizations, products, projects, places, datasets, models, papers.

wiki/concepts/
- Abstract topics, themes, technical ideas, methods, debates.

wiki/questions/
- Answers to user questions that are valuable enough to preserve.

wiki/synthesis/
- Higher-level analysis across multiple sources.

## Page format

Every wiki page must start with YAML frontmatter:

---
title: ""
type: source | entity | concept | question | synthesis
created: YYYY-MM-DD
updated: YYYY-MM-DD
status: draft | stable | needs-review
tags: []
sources: []
---

Then use this structure when applicable:

# Title

## Summary

## Key claims

## Evidence

## Connections

## Open questions

## Change log

## Link rules

Use Obsidian-style links:
- [[Concept Name]]
- [[Entity Name]]
- [[Source Title]]

When a source introduces a new entity or concept, create or update the relevant page.

## Ingest workflow

When asked to ingest a source:

1. Read the source from raw/sources/.
2. Create a source summary page in wiki/sources/.
3. Extract important entities and concepts.
4. Create or update pages in wiki/entities/ and wiki/concepts/.
5. Add links between related pages.
6. Update wiki/index.md.
7. Append an entry to wiki/log.md.
8. Report changed files and unresolved issues.

Do not overwrite existing synthesis blindly. If a new source contradicts older material, mark the contradiction explicitly.

## Query workflow

When asked a question:

1. Read wiki/index.md first.
2. Search relevant wiki pages.
3. Read raw sources only when verification is needed.
4. Answer with wiki citations using file paths.
5. If the answer is useful long-term, create a page in wiki/questions/ or wiki/synthesis/.
6. Update wiki/index.md and wiki/log.md if a page was created.

## Lint workflow

When asked to lint the wiki:

Check for:
- orphan pages
- missing backlinks
- contradictions
- stale claims
- pages without sources
- concepts mentioned repeatedly but lacking pages
- duplicated pages
- weak summaries
- broken links

Create a lint report in wiki/synthesis/.
Update wiki/index.md and wiki/log.md.

## Style

Use concise technical writing.
Prefer explicit claims over vague summaries.
Do not invent facts.
Preserve uncertainty.
Mark unsupported claims as unsupported.
