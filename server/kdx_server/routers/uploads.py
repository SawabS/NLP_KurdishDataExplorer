from __future__ import annotations

from pathlib import Path
import re

from fastapi import APIRouter, File, HTTPException, UploadFile

from kurdish_explorer import config
from ..schemas import PeekRequest
from ..uploads import SUPPORTED_EXT, profile

router = APIRouter(prefix="/uploads", tags=["uploads"])
CHUNK_BYTES = 4 * 1024 * 1024


def _safe_name(name: str) -> str:
    value = Path(name).name
    value = re.sub(r"[^\w .()\-]+", "_", value, flags=re.UNICODE).strip(". ")
    return value or "upload.txt"


@router.post("")
def upload(file: UploadFile = File(...)) -> dict:
    """Stream any size of file to disk, then describe what is inside it.

    There is no byte cap: the file is written in chunks (never held in memory)
    and only a bounded head sample is parsed to build the profile.
    """
    name = _safe_name(file.filename or "upload.txt")
    if Path(name).suffix.lower() not in SUPPORTED_EXT:
        raise HTTPException(415, "Unsupported file type")
    directory = config.ARTIFACTS_DIR / "uploads"
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / name
    try:
        with destination.open("wb") as handle:
            while chunk := file.file.read(CHUNK_BYTES):
                handle.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        file.file.close()
    try:
        return profile(destination)
    except Exception as exc:
        raise HTTPException(422, f"The file was saved but could not be parsed: {exc}") from exc


@router.post("/peek")
def peek(request: PeekRequest) -> dict:
    path = Path(request.path).expanduser()
    if not path.is_file():
        raise HTTPException(404, f"File not found: {path}")
    if path.suffix.lower() not in SUPPORTED_EXT:
        raise HTTPException(415, "Unsupported file type")
    try:
        return profile(path)
    except Exception as exc:
        raise HTTPException(422, f"Could not parse this file: {exc}") from exc
