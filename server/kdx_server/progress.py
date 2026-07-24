"""Translate pipeline stage messages into stable job progress."""
from __future__ import annotations

import re

STAGES = {
    "Embedding": 0.10,
    "Clustering": 0.40,
    "Projecting": 0.70,
    "Building": 0.85,
    "Fitting": 0.90,
    "Scoring": 0.95,
}
_CHUNKS = re.compile(r"\(([\d,]+)\s*/\s*([\d,]+)\s+API chunks\)")


def fraction_for(message: str) -> float:
    if message.startswith("Embedding"):
        match = _CHUNKS.search(message)
        if match:
            done, total = (int(value.replace(",", "")) for value in match.groups())
            return 0.10 + 0.30 * min(1.0, done / max(total, 1))
    return next((fraction for prefix, fraction in STAGES.items() if message.startswith(prefix)), 0.5)
