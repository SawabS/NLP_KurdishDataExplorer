#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
WIKI = ROOT / "wiki"
INDEX = WIKI / "index.md"
LOG = WIKI / "log.md"
VALID_TYPES = {"source", "entity", "concept", "question", "synthesis"}
LINK_RE = re.compile(r"\[\[([^\]]+)\]\]")


def wiki_pages():
    return sorted(
        path for path in WIKI.rglob("*.md")
        if path.name not in {"index.md", "log.md"} and "templates" not in path.parts
    )


def parse_frontmatter(text):
    if not text.startswith("---\n"):
        return None
    end = text.find("\n---", 4)
    if end == -1:
        return None
    raw = text[4:end].strip().splitlines()
    data = {}
    for line in raw:
        if ":" in line:
            key, value = line.split(":", 1)
            data[key.strip()] = value.strip()
    return data


def page_title(path, text, frontmatter):
    if frontmatter and frontmatter.get("title", "").strip('"'):
        return frontmatter["title"].strip('"')
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return path.stem.replace("-", " ").title()


def slug(title):
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


def main():
    issues = []
    pages = wiki_pages()
    title_to_path = {}
    slug_to_path = {}
    backlinks = {path: 0 for path in pages}

    for path in pages:
        text = path.read_text(encoding="utf-8", errors="ignore")
        fm = parse_frontmatter(text)
        rel = path.relative_to(ROOT)

        if fm is None:
            issues.append(("missing-frontmatter", rel, "Page does not start with YAML frontmatter."))
            title = page_title(path, text, fm)
        else:
            title = page_title(path, text, fm)
            if fm.get("type") not in VALID_TYPES:
                issues.append(("invalid-type", rel, f"type is {fm.get('type')!r}."))
            for field in ("title", "created", "updated", "status", "tags", "sources"):
                if field not in fm:
                    issues.append(("missing-field", rel, f"Missing frontmatter field: {field}."))
            if path.parent.name in {"sources", "questions", "synthesis"} and fm.get("sources") in {"[]", ""}:
                issues.append(("empty-sources", rel, "Source-bearing page has empty sources list."))

        if title in title_to_path:
            issues.append(("duplicate-title", rel, f"Duplicate title also used by {title_to_path[title].relative_to(ROOT)}."))
        title_to_path[title] = path
        slug_to_path[slug(title)] = path

    for path in pages:
        text = path.read_text(encoding="utf-8", errors="ignore")
        for target in LINK_RE.findall(text):
            target_path = title_to_path.get(target) or slug_to_path.get(slug(target))
            if target_path:
                backlinks[target_path] += 1
            else:
                issues.append(("broken-link", path.relative_to(ROOT), f"Unresolved link: [[{target}]]."))

    for path, count in backlinks.items():
        if count == 0:
            issues.append(("orphan-page", path.relative_to(ROOT), "No incoming Obsidian links from other wiki pages."))

    if not INDEX.exists():
        issues.append(("missing-index", INDEX.relative_to(ROOT), "wiki/index.md is missing."))
    if not LOG.exists():
        issues.append(("missing-log", LOG.relative_to(ROOT), "wiki/log.md is missing."))

    for kind, path, message in issues:
        print(f"{kind}: {path}: {message}")

    if issues:
        return 1

    print("No lint issues found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
