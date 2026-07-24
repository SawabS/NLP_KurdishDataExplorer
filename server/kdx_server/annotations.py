"""Persistence-backed human annotations (the Review workflow).

Corrections a reviewer makes to derived data — a better topic name, a language
or dialect, data-quality flags, a review status — stored per run as
``annotations.json`` keyed by the document's stable ``doc_id``.

Deliberately a sidecar file, *not* part of the fitted artifact set: it is written
without touching ``meta.json``, so the artifact cache (keyed on ``meta.json``'s
mtime in :mod:`kdx_server.runcache`) never invalidates when a label is corrected,
and a refit never clobbers human review. Survives refresh; never re-embeds.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

from .runcache import run_dir

# Review lifecycle, mirroring Argilla's pending → draft → reviewed / discarded.
STATUSES = ("pending", "draft", "reviewed", "discarded")
# Data-quality flags a reviewer can raise on a record (non-exclusive).
QUALITY_FLAGS = ("duplicate", "noisy", "malformed", "off_topic", "low_confidence")

_lock = Lock()


def _path(source: str, model: str) -> Path:
    return run_dir(source, model) / "annotations.json"


def load_all(source: str, model: str) -> dict[str, dict]:
    """All annotations for a run, keyed by ``str(doc_id)`` (404s if the run is gone)."""
    path = _path(source, model)
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def upsert(source: str, model: str, doc_id: int, patch: dict) -> dict:
    """Merge ``patch`` (only the fields the caller actually sent) into the
    document's annotation and stamp ``updated_at``. Returns the merged record."""
    with _lock:
        data = load_all(source, model)
        current = dict(data.get(str(doc_id), {}))
        current.update(patch)
        current["updated_at"] = datetime.now(timezone.utc).isoformat()
        data[str(doc_id)] = current
        _write(source, model, data)
        return current


def remove(source: str, model: str, doc_id: int) -> None:
    """Clear a document's annotation entirely (idempotent)."""
    with _lock:
        data = load_all(source, model)
        if data.pop(str(doc_id), None) is not None:
            _write(source, model, data)


def summary(source: str, model: str) -> dict:
    """Counts driving the review-progress UI."""
    data = load_all(source, model)
    by_status: dict[str, int] = {}
    for record in data.values():
        status = record.get("status")
        if status:
            by_status[status] = by_status.get(status, 0) + 1
    return {"annotated": len(data), "by_status": by_status}


def _write(source: str, model: str, data: dict) -> None:
    # Atomic replace so a crash mid-write can't corrupt existing review work.
    path = _path(source, model)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)
