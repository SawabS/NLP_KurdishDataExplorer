from __future__ import annotations

from pathlib import Path
import random

from fastapi import APIRouter, HTTPException

from kurdish_explorer import config, pipeline
from .. import jobs
from ..runcache import clear, load
from ..schemas import FitRunRequest, FitUploadRequest, JobView
from ..uploads import SUPPORTED_EXT, TEXT_EXT, profile, read_table, read_text
from .models import auto_model_key, model_card

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _result_payload(result) -> dict:
    return {
        "source": result.source,
        "model": result.model_key,
        "n_docs": result.n_docs,
        "n_topics": result.n_topics,
        "coherence": result.coherence,
        "artifact_dir": result.artifact_dir,
    }


@router.post("/fit-run", response_model=dict)
def fit_run(request: FitRunRequest) -> dict:
    if request.model not in config.EMBEDDING_MODELS:
        raise HTTPException(400, f"Unknown model: {request.model}")
    fitted = pipeline.runs_by_source().get(request.source, [])
    reference_model = request.reference_model or next((key for key in fitted if key in config.EMBEDDING_MODELS), None)
    if not reference_model:
        raise HTTPException(404, f"No fitted reference run exists for {request.source}")
    reference = load(request.source, reference_model)
    documents = reference["documents"].copy()
    meta = reference["meta"]

    def work(progress):
        minimum = None
        if request.source not in {"kndh", "asosoft"}:
            minimum = max(15, min(250, len(documents) // 100))
        result = pipeline.run_on_dataframe(
            documents,
            source=request.source,
            model_key=request.model,
            with_baselines=False,
            min_cluster_size=minimum,
            normalized=bool(meta.get("normalized")),
            title=meta.get("title"),
            progress=progress,
            # Same documents, new embedding backend — carry the origin forward.
            ingest={**(meta.get("ingest") or {}), "embedding": model_card(request.model),
                    "documents_embedded": len(documents)},
        )
        clear()
        return _result_payload(result)

    job = jobs.submit("fit-run", work)
    return {"job_id": job.id}


@router.post("/fit-upload", response_model=dict)
def fit_upload(request: FitUploadRequest) -> dict:
    """Fit an uploaded file. The request may carry nothing but the path: the
    ingestion plan comes from the file's own profile, and every choice the
    server makes is written into the run's meta so the UI can report it."""
    path = Path(request.path).expanduser()
    if not path.is_file():
        raise HTTPException(404, f"File not found: {path}")
    if path.suffix.lower() not in SUPPORTED_EXT:
        raise HTTPException(415, "Unsupported file type")
    model = request.model or auto_model_key()
    if model not in config.EMBEDDING_MODELS:
        raise HTTPException(400, f"Unknown model: {model}")

    is_text = path.suffix.lower() in TEXT_EXT
    plan = profile(path)["plan"]
    split = request.split or plan["split"]
    min_words = request.min_words if request.min_words is not None else plan["min_words"]
    text_col = request.text_col or plan["text_col"]
    label_col = request.label_col if request.label_col is not None else plan["label_col"]
    normalize = request.normalize if request.normalize is not None else plan["normalize"]
    max_docs = request.max_docs if request.max_docs is not None else plan["max_docs"]
    if not is_text and not text_col:
        raise HTTPException(422, "No text column could be detected — choose one for this file")

    def work(progress):
        progress("Reading documents…")
        if is_text:
            texts = read_text(path, split, min_words)
            labels = None
        else:
            texts, labels = read_table(path, text_col or "", label_col, min_words)
        if not texts:
            raise ValueError("No documents passed the length filter")
        available = len(texts)
        if max_docs and available > max_docs:
            indices = sorted(random.Random(config.SEED).sample(range(available), max_docs))
            texts = [texts[index] for index in indices]
            labels = [labels[index] for index in indices] if labels is not None else None
        minimum = request.min_cluster_size or max(15, min(250, len(texts) // 100))
        display_name = request.display_name or path.name
        run_id = pipeline._slugify(Path(display_name).stem)[:40] or "upload"
        result = pipeline.run_on_texts(
            texts,
            title=f"Upload · {display_name}",
            run_id=run_id,
            labels=labels,
            model_key=model,
            normalize=normalize,
            with_baselines=request.with_baselines,
            min_cluster_size=minimum,
            progress=progress,
            ingest={
                "file": display_name,
                "format": path.suffix.lower().lstrip(".") or "txt",
                "bytes": path.stat().st_size,
                "kind": "text" if is_text else "table",
                "unit": "paragraph" if (is_text and split == "Paragraph") else "line" if is_text else "row",
                "text_col": text_col,
                "label_col": label_col if label_col and label_col != "(none)" else None,
                "min_words": min_words,
                "normalized": normalize,
                "documents_available": available,
                "documents_embedded": len(texts),
                "sampled": bool(max_docs and available > max_docs),
                "embedding": model_card(model),
            },
        )
        clear()
        return _result_payload(result)

    job = jobs.submit("fit-upload", work)
    return {"job_id": job.id}


@router.get("", response_model=list[JobView])
def list_jobs() -> list[dict]:
    return jobs.list_all()


@router.get("/{job_id}", response_model=JobView)
def get_job(job_id: str) -> dict:
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} was not found")
    return job
