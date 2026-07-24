"""Single-worker in-process fit job registry."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from threading import RLock
from typing import Any, Callable
from uuid import uuid4

from .progress import fraction_for


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class Job:
    id: str
    kind: str
    status: str = "queued"
    message: str = "Queued"
    fraction: float = 0.0
    created_at: str = field(default_factory=_now)
    updated_at: str = field(default_factory=_now)
    result: dict[str, Any] | None = None
    error: str | None = None


_jobs: dict[str, Job] = {}
_lock = RLock()
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="kdx-fit")


def submit(kind: str, work: Callable[[Callable[[str], None]], dict[str, Any]]) -> Job:
    job = Job(id=uuid4().hex, kind=kind)
    with _lock:
        _jobs[job.id] = job

    def run() -> None:
        update(job.id, status="running", message="Starting", fraction=0.02)

        def progress(message: str) -> None:
            update(job.id, message=message, fraction=fraction_for(message))

        try:
            result = work(progress)
        except Exception as exc:
            update(job.id, status="error", message="Fit failed", error=f"{type(exc).__name__}: {exc}")
        else:
            update(job.id, status="done", message="Done", fraction=1.0, result=result)

    _executor.submit(run)
    return job


def update(job_id: str, **changes: Any) -> None:
    with _lock:
        job = _jobs[job_id]
        for key, value in changes.items():
            setattr(job, key, value)
        job.updated_at = _now()


def get(job_id: str) -> dict[str, Any] | None:
    with _lock:
        job = _jobs.get(job_id)
        return asdict(job) if job else None


def list_all() -> list[dict[str, Any]]:
    with _lock:
        return [asdict(job) for job in sorted(_jobs.values(), key=lambda value: value.created_at, reverse=True)]


def reset_for_tests() -> None:
    with _lock:
        _jobs.clear()
