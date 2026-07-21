from __future__ import annotations

from io import BytesIO
from pathlib import Path
import time

import pytest
from fastapi import HTTPException, UploadFile

from kurdish_explorer import pipeline
from kdx_server import jobs
from kdx_server.progress import fraction_for
from kdx_server.routers import jobs as job_routes, uploads as upload_routes
from kdx_server.schemas import FitUploadRequest, PeekRequest


def wait_for(job_id: str):
    for _ in range(100):
        value = jobs.get(job_id)
        if value and value["status"] in {"done", "error"}:
            return value
        time.sleep(0.01)
    raise AssertionError("job did not finish")


def test_progress_stage_and_chunk_interpolation():
    assert fraction_for("Embedding documents") == pytest.approx(0.1)
    assert fraction_for("Embedding documents (2/4 API chunks)") == pytest.approx(0.25)
    assert fraction_for("Projecting documents") == pytest.approx(0.7)


def test_job_lifecycle_and_error_capture():
    jobs.reset_for_tests()
    job = jobs.submit("test", lambda progress: (progress("Scoring topic coherence"), {"ok": True})[1])
    done = wait_for(job.id)
    assert done["status"] == "done" and done["fraction"] == 1
    failed = jobs.submit("test", lambda progress: (_ for _ in ()).throw(ValueError("broken")))
    error = wait_for(failed.id)
    assert error["status"] == "error" and "broken" in error["error"]


def test_upload_accepts_any_size_and_rejects_unknown_types(fake_artifacts):
    body = b"\n".join(f"belge jimare {index} le kurdi".encode() for index in range(200))
    saved = upload_routes.upload(UploadFile(filename="corpus.txt", file=BytesIO(body)))
    assert saved["size"] == len(body) and saved["kind"] == "text"
    with pytest.raises(HTTPException) as exc:
        upload_routes.upload(UploadFile(filename="notes.pdf", file=BytesIO(b"x")))
    assert exc.value.status_code == 415


def test_peek_profiles_a_table_and_plans_the_ingest(fake_artifacts):
    csv_path = fake_artifacts / "sample.csv"
    rows = "\n".join(
        f"this is headline number {index} about things,{'news' if index % 2 else 'sport'}"
        for index in range(50)
    )
    csv_path.write_text(f"text,label\n{rows}\n", encoding="utf-8")
    peeked = upload_routes.peek(PeekRequest(path=str(csv_path)))
    assert peeked["kind"] == "table" and peeked["columns"] == ["text", "label"]
    assert [field["name"] for field in peeked["fields"]] == ["text", "label"]
    # The wordiest text column is the documents; the low-cardinality one is the label.
    assert peeked["plan"]["text_col"] == "text" and peeked["plan"]["label_col"] == "label"
    assert peeked["plan"]["max_docs"] is None and peeked["plan"]["estimated_docs"] == 50


def test_fit_upload_needs_only_a_path_and_records_provenance(fake_artifacts, monkeypatch):
    """The UI sends no parameters; the server derives them and writes down what it did."""
    jobs.reset_for_tests()
    path = fake_artifacts / "corpus.csv"
    rows = "\n".join(f"kurdish headline number {index} about things,{'news' if index % 2 else 'sport'}" for index in range(30))
    path.write_text(f"text,label\n{rows}\n", encoding="utf-8")
    captured: dict = {}

    def fake_run_on_texts(texts, **kwargs):
        captured.update(texts=texts, **kwargs)
        return pipeline.PipelineResult("corpus", kwargs["model_key"], len(texts), 2, {"BERTopic": 0.1}, str(fake_artifacts))

    monkeypatch.setattr(job_routes.pipeline, "run_on_texts", fake_run_on_texts)
    monkeypatch.setenv("KDX_EMBEDDING_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    job = job_routes.fit_upload(FitUploadRequest(path=str(path)))
    assert wait_for(job["job_id"])["status"] == "done"

    assert len(captured["texts"]) == 30
    ingest = captured["ingest"]
    assert ingest["text_col"] == "text" and ingest["label_col"] == "label"
    assert ingest["documents_embedded"] == 30 and ingest["sampled"] is False
    assert ingest["embedding"]["key"] == "openai" and ingest["embedding"]["hosted"] is True


def test_text_profile_detects_paragraph_documents(fake_artifacts):
    path = fake_artifacts / "prose.txt"
    block = " ".join(["wushe"] * 40)
    path.write_text("\n".join(f"{block}\n{block}\n" for _ in range(20)), encoding="utf-8")
    profiled = upload_routes.peek(PeekRequest(path=str(path)))
    assert profiled["kind"] == "text" and profiled["plan"]["split"] == "Paragraph"
    assert profiled["text_stats"]["unit"] == "paragraph" and profiled["preview"]
