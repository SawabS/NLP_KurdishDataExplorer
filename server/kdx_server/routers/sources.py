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
        first_model = next((model for model in fitted_models if model in config.EMBEDDING_MODELS), fitted_models[0])
        meta = pipeline.run_meta(pipeline.run_key(source, first_model))
        categories = meta.get("categories") or []
        if meta.get("has_labels") and not categories:
            documents = config.ARTIFACTS_DIR / pipeline.run_key(source, first_model) / "documents.parquet"
            labels = pd.read_parquet(documents, columns=["label"])["label"]
            unique = labels.dropna().astype(str).drop_duplicates().head(101).tolist()
            categories = sorted(unique) if len(unique) <= 100 else []
        models = [
            {"key": key, "label": config.EMBEDDING_MODEL_LABELS.get(key, key), "fitted": key in fitted_models}
            for key in config.EMBEDDING_MODELS
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
