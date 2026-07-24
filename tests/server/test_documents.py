from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException

from kdx_server import annotations
from kdx_server.routers import documents
from kdx_server.schemas import AnnotationPatch


def test_list_documents_paginates_and_reports_total(fake_artifacts):
    page = documents.list_documents("demo", "minilm", offset=0, limit=3)
    assert page["total"] == 8
    assert page["limit"] == 3
    assert [row["doc_id"] for row in page["rows"]] == [0, 1, 2]
    # doc 7 is the outlier (topic −1); its category still comes through.
    tail = documents.list_documents("demo", "minilm", offset=6, limit=10)
    assert [row["doc_id"] for row in tail["rows"]] == [6, 7]
    outlier = tail["rows"][1]
    assert outlier["outlier"] is True and outlier["topic_label"] is None


def test_document_rows_carry_derived_metadata(fake_artifacts):
    row = documents.list_documents("demo", "minilm", limit=1)["rows"][0]
    assert row["topic"] == 0
    assert row["category"] == "news"
    assert row["words"] == len("Sorani document 0".split())
    assert row["annotation"] is None


def test_filters_compose(fake_artifacts):
    by_topic = documents.list_documents("demo", "minilm", topic=1)
    assert by_topic["total"] == 4 and {r["topic"] for r in by_topic["rows"]} == {1}
    by_category = documents.list_documents("demo", "minilm", category="sport")
    assert by_category["total"] == 4 and {r["category"] for r in by_category["rows"]} == {"sport"}
    by_text = documents.list_documents("demo", "minilm", q="document 4")
    assert [r["doc_id"] for r in by_text["rows"]] == [4]
    combined = documents.list_documents("demo", "minilm", topic=1, category="sport")
    assert {r["doc_id"] for r in combined["rows"]} == {3, 5}


def test_sort_by_topic_desc(fake_artifacts):
    page = documents.list_documents("demo", "minilm", sort="topic", order="desc", limit=2)
    assert [r["topic"] for r in page["rows"]] == [1, 1]


def test_document_detail_and_404(fake_artifacts):
    detail = documents.document_detail("demo", "minilm", 3)
    assert detail["doc_id"] == 3 and detail["category"] == "sport"
    assert detail["neighbors"] == []  # no cached embeddings in the fixture
    with pytest.raises(HTTPException) as exc:
        documents.document_detail("demo", "minilm", 999)
    assert exc.value.status_code == 404


def test_annotation_roundtrip_and_patch_semantics(fake_artifacts):
    saved = documents.save_annotation("demo", "minilm", 2, AnnotationPatch(status="draft", note="check dialect"))
    assert saved["annotation"]["status"] == "draft"
    assert saved["annotation"]["note"] == "check dialect"
    assert "updated_at" in saved["annotation"]

    # PATCH semantics: sending only status must not wipe the existing note.
    merged = documents.save_annotation("demo", "minilm", 2, AnnotationPatch(status="reviewed"))
    assert merged["annotation"]["status"] == "reviewed"
    assert merged["annotation"]["note"] == "check dialect"

    # It shows up on the row and in the status filter + summary.
    row = documents.list_documents("demo", "minilm", topic=0, limit=10)["rows"]
    assert next(r for r in row if r["doc_id"] == 2)["annotation"]["status"] == "reviewed"
    only_reviewed = documents.list_documents("demo", "minilm", status="reviewed")
    assert [r["doc_id"] for r in only_reviewed["rows"]] == [2]
    unreviewed = documents.list_documents("demo", "minilm", status="unreviewed")
    assert 2 not in {r["doc_id"] for r in unreviewed["rows"]} and unreviewed["total"] == 7
    assert documents.annotations_summary("demo", "minilm") == {"annotated": 1, "by_status": {"reviewed": 1}}

    documents.delete_annotation("demo", "minilm", 2)
    assert annotations.load_all("demo", "minilm") == {}


def test_save_annotation_rejects_unknown_doc_and_empty_patch(fake_artifacts):
    with pytest.raises(HTTPException) as missing:
        documents.save_annotation("demo", "minilm", 999, AnnotationPatch(status="draft"))
    assert missing.value.status_code == 404
    with pytest.raises(HTTPException) as empty:
        documents.save_annotation("demo", "minilm", 0, AnnotationPatch())
    assert empty.value.status_code == 422


def test_export_streams_filtered_csv(fake_artifacts):
    documents.save_annotation("demo", "minilm", 1, AnnotationPatch(status="reviewed", note="ok"))
    response = documents.export_documents("demo", "minilm", topic=0)

    async def collect() -> str:
        return "".join([chunk async for chunk in response.body_iterator])

    body = asyncio.run(collect())
    lines = [line for line in body.splitlines() if line]
    assert lines[0].startswith("doc_id,topic,topic_label,category,words,outlier")
    assert len(lines) == 1 + 3  # header + 3 docs in topic 0
    assert "reviewed" in body and "ok" in body
