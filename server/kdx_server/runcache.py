"""Small self-invalidating cache for artifact runs."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException
from kurdish_explorer import config, pipeline


def run_key(source: str, model: str) -> str:
    return pipeline.run_key(source, model)


def run_dir(source: str, model: str) -> Path:
    path = config.ARTIFACTS_DIR / run_key(source, model)
    if not path.is_dir() or not (path / "meta.json").exists():
        raise HTTPException(404, f"Run {source}/{model} was not found")
    return path


@lru_cache(maxsize=8)
def _load(run: str, meta_mtime_ns: int) -> dict:
    del meta_mtime_ns
    return pipeline.load_run(run)


def load(source: str, model: str) -> dict:
    path = run_dir(source, model)
    return _load(run_key(source, model), (path / "meta.json").stat().st_mtime_ns)


def clear() -> None:
    _load.cache_clear()
