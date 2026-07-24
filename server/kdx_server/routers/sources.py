import json
import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException
import pandas as pd

from kurdish_explorer import config, embed, pipeline
from ..runcache import clear as clear_runcache
from ..schemas import SourceSummary

router = APIRouter(tags=["sources"])


@router.get("/sources", response_model=list[SourceSummary])
def list_sources() -> list[dict]:
    grouped = pipeline.runs_by_source()
    sources = []
    for source, fitted_models in grouped.items():
        # Use the preferred run for source-level metadata, but expose every
        # fitted registered model so the same corpus can be compared without
        # presenting irrelevant/unfitted backends.
        best = config.best_available_model(fitted_models)
        meta = pipeline.run_meta(pipeline.run_key(source, best))
        categories = meta.get("categories") or []
        if meta.get("has_labels") and not categories:
            documents = config.ARTIFACTS_DIR / pipeline.run_key(source, best) / "documents.parquet"
            labels = pd.read_parquet(documents, columns=["label"])["label"]
            unique = labels.dropna().astype(str).drop_duplicates().head(101).tolist()
            categories = sorted(unique) if len(unique) <= 100 else []
        registered = [model for model in fitted_models if model in config.EMBEDDING_MODELS]
        models = [
            {"key": model, "label": config.EMBEDDING_MODEL_LABELS.get(model, model), "fitted": True}
            for model in sorted(
                registered,
                key=lambda model: config.MODEL_PREFERENCE.index(model)
                if model in config.MODEL_PREFERENCE else len(config.MODEL_PREFERENCE),
            )
        ]
        sources.append({
            "source": source,
            "title": meta.get("title", source),
            "has_labels": bool(meta.get("has_labels")),
            "categories": categories,
            "n_docs": int(meta.get("n_docs", 0)),
            "models": models,
        })
    return sorted(sources, key=lambda item: (item["source"] not in {"kndh", "asosoft"}, item["title"].lower()))


@router.delete("/sources/{source}")
def delete_source(source: str) -> dict:
    """Permanently delete a corpus: every fitted run's artifacts, the cached
    document embeddings behind them, and the uploaded source file. Irreversible —
    the client gates this behind a typed confirmation."""
    models = pipeline.runs_by_source().get(source)
    if not models:
        raise HTTPException(404, f"Corpus {source} was not found")

    removed_runs: list[str] = []
    upload_files: set[str] = set()
    for model in models:
        run = pipeline.run_key(source, model)
        run_path = config.ARTIFACTS_DIR / run
        # Guard against path escapes: only ever delete inside ARTIFACTS_DIR.
        if run_path.resolve().parent != config.ARTIFACTS_DIR.resolve():
            continue
        try:  # best-effort: drop this run's cached embedding matrix too
            texts = pd.read_parquet(run_path / "documents.parquet", columns=["text"])["text"].astype(str).tolist()
            embed._cache_path(model, texts).unlink(missing_ok=True)
        except Exception:
            pass
        try:  # remember which uploaded raw file (if any) fed this run
            meta = json.loads((run_path / "meta.json").read_text(encoding="utf-8"))
            ingest_file = (meta.get("ingest") or {}).get("file")
            if ingest_file:
                upload_files.add(Path(ingest_file).name)
        except Exception:
            pass
        if run_path.is_dir():
            shutil.rmtree(run_path, ignore_errors=True)
            removed_runs.append(run)

    uploads_dir = config.ARTIFACTS_DIR / "uploads"
    removed_uploads: list[str] = []
    for name in upload_files:
        candidate = uploads_dir / name
        if candidate.parent.resolve() == uploads_dir.resolve() and candidate.is_file():
            candidate.unlink(missing_ok=True)
            removed_uploads.append(name)

    clear_runcache()
    return {"source": source, "removed_runs": removed_runs, "removed_uploads": removed_uploads}
