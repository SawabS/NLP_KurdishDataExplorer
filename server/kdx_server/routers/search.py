from fastapi import APIRouter, HTTPException

from ..schemas import SearchRequest
from ..search import answer, rank

router = APIRouter(prefix="/runs/{source}/{model}", tags=["search"])


@router.post("/search")
def search(source: str, model: str, request: SearchRequest) -> dict:
    try:
        return rank(source, model, request.query.strip())
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/ask")
def ask(source: str, model: str, request: SearchRequest) -> dict:
    try:
        return answer(source, model, request.query.strip())
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(409, str(exc)) from exc
