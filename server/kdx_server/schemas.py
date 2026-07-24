"""Public API models."""
from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class ModelOption(BaseModel):
    key: str
    label: str
    fitted: bool


class SourceSummary(BaseModel):
    source: str
    title: str
    has_labels: bool = False
    categories: list[str] = Field(default_factory=list)
    n_docs: int = 0
    models: list[ModelOption] = Field(default_factory=list)


class JobView(BaseModel):
    id: str
    kind: str
    status: Literal["queued", "running", "done", "error"]
    message: str
    fraction: float
    created_at: str
    updated_at: str
    result: dict[str, Any] | None = None
    error: str | None = None


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)


class PeekRequest(BaseModel):
    path: str


class AnnotationPatch(BaseModel):
    """A human correction to one document's derived data. Every field is
    optional; only the fields actually sent are applied (PATCH semantics), so a
    reviewer can, e.g., set a status without disturbing an existing note."""

    status: Literal["pending", "draft", "reviewed", "discarded"] | None = None
    topic_label: str | None = None
    language: str | None = None
    quality: list[str] | None = None
    note: str | None = None


class FitRunRequest(BaseModel):
    source: str
    model: str
    reference_model: str | None = None


class FitUploadRequest(BaseModel):
    """Only ``path`` is required. Every other field is an override of the plan
    the server derives from the file itself (see ``uploads.profile``)."""

    path: str
    display_name: str | None = None
    split: Literal["Line", "Paragraph"] | None = None
    min_words: int | None = Field(None, ge=1, le=50)
    text_col: str | None = None
    label_col: str | None = None
    model: str | None = None
    normalize: bool | None = None
    max_docs: int | None = Field(None, ge=100)
    min_cluster_size: int | None = Field(None, ge=10, le=500)
    with_baselines: bool = False
