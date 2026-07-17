from __future__ import annotations

from pathlib import Path
import random

from fastapi import APIRouter, HTTPException

from kurdish_explorer import config, pipeline
from .. import jobs
from ..runcache import clear, load
from ..schemas import FitRunRequest, FitUploadRequest, JobView
from ..uploads import SUPPORTED_EXT, TEXT_EXT, read_table, read_text

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
        )
        clear()
        return _result_payload(result)

    job = jobs.submit("fit-run", work)
    return {"job_id": job.id}


@router.post("/fit-upload", response_model=dict)
def fit_upload(request: FitUploadRequest) -> dict:
    path = Path(request.path).expanduser()
    if not path.is_file():
        raise HTTPException(404, f"File not found: {path}")
    if path.suffix.lower() not in SUPPORTED_EXT:
        raise HTTPException(415, "Unsupported file type")
    if request.model not in config.EMBEDDING_MODELS:
        raise HTTPException(400, f"Unknown model: {request.model}")
    if path.suffix.lower() not in TEXT_EXT and not request.text_col:
        raise HTTPException(422, "text_col is required for tabular files")

    def work(progress):
        progress("Reading documents…")
        if path.suffix.lower() in TEXT_EXT:
            texts = read_text(path, request.split, request.min_words)
            labels = None
        else:
            texts, labels = read_table(path, request.text_col or "", request.label_col, request.min_words)
        if not texts:
            raise ValueError("No documents passed the length filter")
        if len(texts) > request.max_docs:
            indices = sorted(random.Random(config.SEED).sample(range(len(texts)), request.max_docs))
            texts = [texts[index] for index in indices]
            labels = [labels[index] for index in indices] if labels is not None else None
        minimum = request.min_cluster_size
        if request.auto_mcs or minimum is None:
            minimum = max(15, min(250, len(texts) // 100))
        display_name = request.display_name or path.name
        run_id = pipeline._slugify(Path(display_name).stem)[:40] or "upload"
        result = pipeline.run_on_texts(
            texts,
            title=f"Upload · {display_name}",
            run_id=run_id,
            labels=labels,
            model_key=request.model,
            normalize=request.normalize,
            with_baselines=request.with_baselines,
            min_cluster_size=minimum,
            progress=progress,
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
