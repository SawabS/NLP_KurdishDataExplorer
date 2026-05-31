# LLM Wiki

A Codex-maintained Markdown knowledge base.

- `raw/` contains immutable source material.
- `wiki/` contains LLM-maintained knowledge pages.
- `tools/` contains local helper scripts.
- `AGENTS.md` defines the operating rules for Codex.

## Workflow

1. Drop source files into `raw/sources/`.
2. Ask Codex to ingest one source at a time.
3. Review changed wiki files.
4. Commit the changes.
5. Ask questions against the wiki.
6. Save valuable answers into `wiki/questions/` or `wiki/synthesis/`.
7. Run a wiki lint pass after every 5-10 sources.

## Useful Commands

```bash
./tools/search_wiki.py "dataset"
./tools/lint_wiki.py
grep "^## \\[" wiki/log.md | tail -10
```

## Rules

Do not edit files inside `raw/` during wiki maintenance. Use raw files only as evidence for source-grounded Markdown pages.
