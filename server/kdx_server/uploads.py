"""Upload parsing helpers shared by routes and fit jobs."""
from __future__ import annotations

from pathlib import Path
import pandas as pd

TEXT_EXT = {".txt", ".text"}
TABLE_EXT = {".csv", ".tsv", ".xlsx", ".xls", ".parquet"}
SUPPORTED_EXT = TEXT_EXT | TABLE_EXT


def peek_columns(path: Path) -> list[str]:
    suffix = path.suffix.lower()
    if suffix in {".xlsx", ".xls"}:
        return [str(value) for value in pd.read_excel(path, nrows=5).columns]
    if suffix == ".parquet":
        import pyarrow.parquet as pq
        return list(pq.read_schema(path).names)
    if suffix not in {".csv", ".tsv"}:
        return []
    return [str(value) for value in pd.read_csv(path, sep="\t" if suffix == ".tsv" else ",", nrows=5).columns]


def read_text(path: Path, split: str, min_words: int) -> list[str]:
    documents: list[str] = []
    with path.open("r", encoding="utf-8", errors="ignore") as handle:
        if split == "Line":
            for line in handle:
                value = line.strip()
                if len(value.split()) >= min_words:
                    documents.append(value)
        else:
            buffer: list[str] = []
            for line in handle:
                if line.strip():
                    buffer.append(line.strip())
                elif buffer:
                    value = " ".join(buffer)
                    if len(value.split()) >= min_words:
                        documents.append(value)
                    buffer = []
            if buffer:
                value = " ".join(buffer)
                if len(value.split()) >= min_words:
                    documents.append(value)
    return documents


def read_table(path: Path, text_col: str, label_col: str | None, min_words: int) -> tuple[list[str], list[str] | None]:
    usecols = list(dict.fromkeys([text_col] + ([label_col] if label_col and label_col != "(none)" else [])))
    suffix = path.suffix.lower()
    if suffix in {".xlsx", ".xls"}:
        frame = pd.read_excel(path, usecols=usecols)
    elif suffix == ".parquet":
        frame = pd.read_parquet(path, columns=usecols)
    else:
        frame = pd.read_csv(path, sep="\t" if suffix == ".tsv" else ",", usecols=usecols)
    frame = frame.dropna(subset=[text_col])
    texts = frame[text_col].astype(str).tolist()
    labels = frame[label_col].astype(str).tolist() if label_col and label_col != "(none)" else None
    keep = [index for index, text in enumerate(texts) if len(text.split()) >= min_words]
    return [texts[index] for index in keep], ([labels[index] for index in keep] if labels is not None else None)
