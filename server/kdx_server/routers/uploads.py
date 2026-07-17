from __future__ import annotations

from pathlib import Path
import re

from fastapi import APIRouter, File, HTTPException, UploadFile

from kurdish_explorer import config
from ..schemas import PeekRequest
from ..uploads import SUPPORTED_EXT, peek_columns

router = APIRouter(prefix="/uploads", tags=["uploads"])
MAX_UPLOAD_BYTES = 2_000 * 1024 * 1024
CHUNK_BYTES = 1024 * 1024


def _safe_name(name: str) -> str:
    value = Path(name).name
    value = re.sub(r"[^\w .()\-]+", "_", value, flags=re.UNICODE).strip(". ")
    return value or "upload.txt"


@router.post("")
def upload(file: UploadFile = File(...)) -> dict:
    name = _safe_name(file.filename or "upload.txt")
    if Path(name).suffix.lower() not in SUPPORTED_EXT:
        raise HTTPException(415, "Unsupported file type")
    directory = config.ARTIFACTS_DIR / "uploads"
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / name
    size = 0
    try:
        with destination.open("wb") as handle:
            while chunk := file.file.read(CHUNK_BYTES):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(413, "Upload exceeds the 2000 MB limit")
                handle.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        file.file.close()
    return {"path": str(destination), "name": name, "size": size, "columns": peek_columns(destination)}


@router.post("/peek")
def peek(request: PeekRequest) -> dict:
    path = Path(request.path).expanduser()
    if not path.is_file():
        raise HTTPException(404, f"File not found: {path}")
    if path.suffix.lower() not in SUPPORTED_EXT:
        raise HTTPException(415, "Unsupported file type")
    return {
        "path": str(path.resolve()),
        "name": path.name,
        "size": path.stat().st_size,
        "columns": peek_columns(path),
        "kind": "text" if path.suffix.lower() in {".txt", ".text"} else "table",
    }
