# Wiki Log

## [2026-05-31] setup | Initialize LLM wiki scaffold

- Created the initial Markdown wiki structure.
- Added repository operating instructions in `AGENTS.md`.
- Added local helper scripts and page templates.

## [2026-05-31] ingest | Karpathy LLM Wiki

- Added `raw/sources/karpathy-llm-wiki.md` from the provided gist URL.
- Created a source page for [[Karpathy LLM Wiki]].
- Created concept pages for the architecture, workflows, bookkeeping files, tooling stance, and RAG contrast.
- Created an author entity page for [[Andrej Karpathy]].
- No contradictions found; the source is abstract and leaves implementation-specific design choices open.

## [2026-05-31] lint | Initial wiki lint report

- Ran `./tools/lint_wiki.py`.
- Created [[Wiki Lint Report]] in `wiki/synthesis/`.
- No structural lint issues found.
- Semantic contradiction checks remain manual until more sources are available.
