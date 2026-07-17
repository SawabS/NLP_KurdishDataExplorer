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


class FitRunRequest(BaseModel):
    source: str
    model: str
    reference_model: str | None = None


class FitUploadRequest(BaseModel):
    path: str
    display_name: str | None = None
    split: Literal["Line", "Paragraph"] = "Line"
    min_words: int = Field(3, ge=1, le=50)
    text_col: str | None = None
    label_col: str | None = None
    model: str
    normalize: bool = True
    max_docs: int = Field(20_000, ge=500, le=200_000)
    auto_mcs: bool = True
    min_cluster_size: int | None = Field(None, ge=10, le=500)
    with_baselines: bool = False
