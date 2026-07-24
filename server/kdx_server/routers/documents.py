"""Documents workspace: a paginated, filterable, sortable view over a run's
per-document records, plus the persistence-backed Review workflow that lets a
human correct derived annotations.

Never returns the whole corpus by default — every read is server-side paginated
(``limit`` ≤ 200); a full dump happens only through the explicit CSV export.
"""
from __future__ import annotations

import csv
import io
from typing import Any, Iterator, Literal

import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from .. import annotations, search
from ..runcache import load
from ..schemas import AnnotationPatch

router = APIRouter(prefix="/runs/{source}/{model}", tags=["documents"])


def _category(value: Any) -> str | None:
    return None if value is None or pd.isna(value) else str(value)


def _query(
    docs: pd.DataFrame,
    anns: dict[str, dict],
    topic: int | None,
    category: str | None,
    q: str | None,
    status: str | None,
    sort: str,
    order: str,
) -> pd.DataFrame:
    """Apply the workspace's filters + sort and return the matching rows.

    Filters compose (topic AND category AND text AND review-status), mirroring the
    removable filter tokens in the UI and the same semantics the Map/Structure
    views use for ``topic`` / ``category`` so a selection is shareable across them.
    """
    frame = docs
    if topic is not None:
        frame = frame[frame["topic"] == topic]
    if category and category != "(all)" and "label" in frame:
        frame = frame[frame["label"] == category]
    if q:
        frame = frame[frame["text"].astype(str).str.contains(q, case=False, na=False, regex=False)]
    if status:
        if status == "unreviewed":
            reviewed_ids = {int(key) for key, rec in anns.items() if rec.get("status")}
            frame = frame[~frame["doc_id"].isin(reviewed_ids)]
        else:
            wanted = {int(key) for key, rec in anns.items() if rec.get("status") == status}
            frame = frame[frame["doc_id"].isin(wanted)]

    ascending = order != "desc"
    if sort == "words":
        frame = frame.assign(_words=frame["text"].astype(str).str.split().str.len())
        frame = frame.sort_values("_words", ascending=ascending, kind="stable").drop(columns="_words")
    elif sort == "topic":
        frame = frame.sort_values("topic", ascending=ascending, kind="stable")
    else:
        frame = frame.sort_values("doc_id", ascending=ascending, kind="stable")
    return frame


def _row(record: pd.Series, has_label: bool, topic_labels: dict, anns: dict[str, dict]) -> dict:
    topic_id = int(record["topic"])
    text = str(record["text"])
    return {
        "doc_id": int(record["doc_id"]),
        "text": text,
        "words": len(text.split()),
        "topic": topic_id,
        "topic_label": topic_labels.get(str(topic_id)) if topic_id != -1 else None,
        "category": _category(record.get("label")) if has_label else None,
        "outlier": topic_id == -1,
        "x": float(record["x"]) if "x" in record and pd.notna(record["x"]) else None,
        "y": float(record["y"]) if "y" in record and pd.notna(record["y"]) else None,
        "annotation": anns.get(str(int(record["doc_id"]))),
    }


StatusFilter = Literal["pending", "draft", "reviewed", "discarded", "unreviewed"]


@router.get("/documents")
def list_documents(
    source: str,
    model: str,
    offset: int = 0,
    limit: int = 50,
    topic: int | None = None,
    category: str | None = None,
    q: str | None = None,
    status: StatusFilter | None = None,
    sort: Literal["doc_id", "topic", "words"] = "doc_id",
    order: Literal["asc", "desc"] = "asc",
) -> dict:
    offset = max(0, offset)
    limit = min(max(1, limit), 200)
    artifact = load(source, model)
    docs = artifact["documents"]
    anns = annotations.load_all(source, model)
    topic_labels = artifact.get("topic_labels") or {}
    has_label = "label" in docs.columns
    frame = _query(docs, anns, topic, category, q, status, sort, order)
    total = int(len(frame))
    page = frame.iloc[offset : offset + limit]
    return {
        "rows": [_row(record, has_label, topic_labels, anns) for _, record in page.iterrows()],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/documents/export.csv")
def export_documents(
    source: str,
    model: str,
    topic: int | None = None,
    category: str | None = None,
    q: str | None = None,
    status: StatusFilter | None = None,
    sort: Literal["doc_id", "topic", "words"] = "doc_id",
    order: Literal["asc", "desc"] = "asc",
) -> StreamingResponse:
    """Explicit, user-triggered export of the *filtered* set (not paginated).
    Streamed so a large corpus never materializes as one string in memory."""
    artifact = load(source, model)
    docs = artifact["documents"]
    anns = annotations.load_all(source, model)
    topic_labels = artifact.get("topic_labels") or {}
    has_label = "label" in docs.columns
    frame = _query(docs, anns, topic, category, q, status, sort, order)
    columns = ["doc_id", "topic", "topic_label", "category", "words", "outlier",
               "review_status", "review_label", "language", "quality", "note", "text"]

    def rows() -> Iterator[str]:
        buffer = io.StringIO()
        writer = csv.writer(buffer)

        def flush() -> str:
            value = buffer.getvalue()
            buffer.seek(0)
            buffer.truncate(0)
            return value

        writer.writerow(columns)
        yield flush()
        for _, record in frame.iterrows():
            row = _row(record, has_label, topic_labels, anns)
            ann = row["annotation"] or {}
            writer.writerow([
                row["doc_id"], row["topic"], row["topic_label"] or "", row["category"] or "",
                row["words"], row["outlier"], ann.get("status", ""), ann.get("topic_label", ""),
                ann.get("language", ""), " ".join(ann.get("quality") or []), ann.get("note", ""),
                row["text"],
            ])
            yield flush()

    filename = f"{source}__{model}-documents.csv"
    return StreamingResponse(
        rows(), media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/documents/{doc_id}")
def document_detail(source: str, model: str, doc_id: int) -> dict:
    artifact = load(source, model)
    docs = artifact["documents"]
    match = docs[docs["doc_id"] == doc_id]
    if match.empty:
        raise HTTPException(404, f"Document {doc_id} was not found in this run")
    record = match.iloc[0]
    anns = annotations.load_all(source, model)
    detail = _row(record, "label" in docs.columns, artifact.get("topic_labels") or {}, anns)
    if "text_en" in docs.columns and pd.notna(record.get("text_en")):
        detail["text_en"] = str(record["text_en"])
    detail["neighbors"] = search.neighbors(source, model, doc_id)
    return detail


@router.get("/annotations")
def list_annotations(source: str, model: str) -> dict:
    return {"annotations": annotations.load_all(source, model)}


@router.get("/annotations/summary")
def annotations_summary(source: str, model: str) -> dict:
    return annotations.summary(source, model)


@router.put("/annotations/{doc_id}")
def save_annotation(source: str, model: str, doc_id: int, patch: AnnotationPatch) -> dict:
    docs = load(source, model)["documents"]
    if not (docs["doc_id"] == doc_id).any():
        raise HTTPException(404, f"Document {doc_id} was not found in this run")
    fields = patch.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(422, "No annotation fields were provided")
    return {"doc_id": doc_id, "annotation": annotations.upsert(source, model, doc_id, fields)}


@router.delete("/annotations/{doc_id}")
def delete_annotation(source: str, model: str, doc_id: int) -> dict:
    annotations.remove(source, model, doc_id)
    return {"doc_id": doc_id, "annotation": None}
