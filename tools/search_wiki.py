#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
WIKI = ROOT / "wiki"


def main():
    if len(sys.argv) < 2:
        print("Usage: tools/search_wiki.py <query>")
        sys.exit(1)

    query = " ".join(sys.argv[1:]).lower()
    matches = []

    for path in WIKI.rglob("*.md"):
        text = path.read_text(encoding="utf-8", errors="ignore")
        lines = text.splitlines()
        for i, line in enumerate(lines, start=1):
            if query in line.lower():
                matches.append((path.relative_to(ROOT), i, line.strip()))

    for path, line_no, line in matches[:80]:
        print(f"{path}:{line_no}: {line}")


if __name__ == "__main__":
    main()
