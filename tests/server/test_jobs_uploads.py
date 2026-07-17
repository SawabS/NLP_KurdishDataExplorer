from __future__ import annotations

from io import BytesIO
from pathlib import Path
import time

import pytest
from fastapi import HTTPException, UploadFile

from kdx_server import jobs
from kdx_server.progress import fraction_for
from kdx_server.routers import uploads as upload_routes
from kdx_server.schemas import PeekRequest


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


def test_upload_stream_cap_and_peek(fake_artifacts, monkeypatch):
    monkeypatch.setattr(upload_routes, "MAX_UPLOAD_BYTES", 4)
    with pytest.raises(HTTPException) as exc:
        upload_routes.upload(UploadFile(filename="too-big.txt", file=BytesIO(b"12345")))
    assert exc.value.status_code == 413
    csv_path = fake_artifacts / "sample.csv"
    csv_path.write_text("text,label\nhello,news\n", encoding="utf-8")
    peeked = upload_routes.peek(PeekRequest(path=str(csv_path)))
    assert peeked["columns"] == ["text", "label"] and peeked["kind"] == "table"
