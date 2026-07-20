from fastapi import APIRouter
import pandas as pd

from kurdish_explorer import config, pipeline
from ..schemas import SourceSummary

router = APIRouter(tags=["sources"])


@router.get("/sources", response_model=list[SourceSummary])
def list_sources() -> list[dict]:
    grouped = pipeline.runs_by_source()
    sources = []
    for source, fitted_models in grouped.items():
        # Serve one "best available" run per source; the model choice is no
        # longer surfaced in the UI (the app is about exploring the data).
        best = config.best_available_model(fitted_models)
        meta = pipeline.run_meta(pipeline.run_key(source, best))
        categories = meta.get("categories") or []
        if meta.get("has_labels") and not categories:
            documents = config.ARTIFACTS_DIR / pipeline.run_key(source, best) / "documents.parquet"
            labels = pd.read_parquet(documents, columns=["label"])["label"]
            unique = labels.dropna().astype(str).drop_duplicates().head(101).tolist()
            categories = sorted(unique) if len(unique) <= 100 else []
        models = [
            {"key": best, "label": config.EMBEDDING_MODEL_LABELS.get(best, best), "fitted": True}
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
