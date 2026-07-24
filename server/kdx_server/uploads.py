"""Upload parsing helpers shared by routes and fit jobs.

The app accepts a file with no questions asked: `profile()` reads a bounded
sample of it, describes the structure it found, and derives the full ingestion
plan (what counts as a document, which column holds the text, how many
documents get embedded). The UI shows that description instead of asking the
user for parameters they cannot know yet.
"""
from __future__ import annotations

from pathlib import Path
import pandas as pd

TEXT_EXT = {".txt", ".text"}
TABLE_EXT = {".csv", ".tsv", ".xlsx", ".xls", ".parquet"}
SUPPORTED_EXT = TEXT_EXT | TABLE_EXT

# Profiling never reads a whole file: a head sample answers every structural
# question, and totals are extrapolated from the bytes actually read.
SAMPLE_BYTES = 8 * 1024 * 1024
SAMPLE_ROWS = 5_000
PREVIEW_DOCS = 5
# Above this, a seeded random subset is embedded instead of the whole corpus.
# The plan says so explicitly, and the choice is recorded in the run's meta.
LARGE_CORPUS_DOCS = 100_000


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


# --- Profiling -------------------------------------------------------------

def _median(values: list[int]) -> int:
    if not values:
        return 0
    ordered = sorted(values)
    middle = len(ordered) // 2
    return ordered[middle] if len(ordered) % 2 else (ordered[middle - 1] + ordered[middle]) // 2


def _scripts(texts: list[str]) -> dict[str, float]:
    """Share of writing systems in the sample — how a Sorani corpus announces itself."""
    arabic = latin = digit = other = 0
    for text in texts[:2_000]:
        for char in text:
            if char.isspace():
                continue
            point = ord(char)
            if 0x0600 <= point <= 0x06FF or 0x0750 <= point <= 0x077F or 0xFB50 <= point <= 0xFEFF:
                arabic += 1
            elif char.isdigit():
                digit += 1
            elif char.isascii() and char.isalpha():
                latin += 1
            else:
                other += 1
    total = arabic + latin + digit + other or 1
    return {
        "arabic": round(arabic / total, 4),
        "latin": round(latin / total, 4),
        "digit": round(digit / total, 4),
        "other": round(other / total, 4),
    }


def _scan_lines(path: Path) -> tuple[list[str], int, bool]:
    """Decode a head sample; return its lines, the estimated total, and whether that is exact."""
    total_bytes = path.stat().st_size
    with path.open("rb") as handle:
        blob = handle.read(SAMPLE_BYTES)
    exact = len(blob) >= total_bytes
    if not exact:
        cut = blob.rfind(b"\n")
        blob = blob[: cut + 1] if cut > 0 else blob
    lines = blob.decode("utf-8", errors="ignore").splitlines()
    estimated = len(lines) if exact else round(len(lines) * total_bytes / max(len(blob), 1))
    return lines, estimated, exact


def _paragraphs(lines: list[str]) -> list[str]:
    blocks: list[str] = []
    buffer: list[str] = []
    for line in lines:
        if line:
            buffer.append(line)
        elif buffer:
            blocks.append(" ".join(buffer))
            buffer = []
    if buffer:
        blocks.append(" ".join(buffer))
    return blocks


def _auto_min_words(median_words: int) -> int:
    """Drop navigational noise without deleting a short-document corpus."""
    if median_words >= 8:
        return 3
    return 2 if median_words >= 4 else 1


def _profile_text(path: Path) -> dict:
    lines, estimated_lines, exact = _scan_lines(path)
    stripped = [line.strip() for line in lines]
    non_empty = [line for line in stripped if line]
    blank_share = (len(stripped) - len(non_empty)) / max(len(stripped), 1)
    paragraphs = _paragraphs(stripped)
    line_words = [len(line.split()) for line in non_empty]
    para_words = [len(block.split()) for block in paragraphs]

    # Blank lines that actually group content mean the author wrote paragraphs;
    # a blank-free or one-record-per-line file is line-oriented.
    paragraph_mode = blank_share > 0.02 and _median(para_words) >= max(2, int(_median(line_words) * 1.5))
    split = "Paragraph" if paragraph_mode else "Line"
    documents = paragraphs if paragraph_mode else non_empty
    words = para_words if paragraph_mode else line_words
    min_words = _auto_min_words(_median(words))
    kept = [document for document, count in zip(documents, words) if count >= min_words]
    ratio = len(documents) / max(len(non_empty), 1) if paragraph_mode else 1.0
    keep_share = len(kept) / max(len(documents), 1)
    estimated_docs = round(estimated_lines * (1 - blank_share) * ratio * keep_share)

    return {
        "kind": "text",
        "columns": [],
        "fields": [],
        "n_rows": estimated_lines,
        "exact_counts": exact,
        "sampled_units": len(documents),
        "text_stats": {
            "unit": "line" if split == "Line" else "paragraph",
            "blank_line_pct": round(blank_share * 100, 1),
            "median_words": _median(words),
            "avg_words": round(sum(words) / max(len(words), 1), 1),
            "max_words": max(words, default=0),
            "duplicate_pct": round((1 - len(set(documents)) / max(len(documents), 1)) * 100, 1),
            "scripts": _scripts(documents),
        },
        "preview": [document[:400] for document in kept[:PREVIEW_DOCS]],
        "plan": _plan(
            split=split,
            min_words=min_words,
            text_col=None,
            label_col=None,
            estimated_docs=estimated_docs,
            exact=exact,
            notes=[
                _note(
                    f"Each {'paragraph' if paragraph_mode else 'non-empty line'} becomes one document"
                    + (f" ({round(blank_share * 100)}% of lines are blank separators)" if paragraph_mode else "")
                ),
                _note(f"Documents shorter than {min_words} word{'s' if min_words > 1 else ''} are dropped"),
            ],
        ),
    }


def _friendly_dtype(series: pd.Series) -> str:
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_numeric_dtype(series):
        return "number"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "date"
    return "text"


def _estimate_rows(path: Path, frame: pd.DataFrame) -> tuple[int, bool]:
    suffix = path.suffix.lower()
    if suffix == ".parquet":
        import pyarrow.parquet as pq
        return int(pq.ParquetFile(path).metadata.num_rows), True
    if suffix in {".csv", ".tsv"}:
        _, estimated_lines, exact = _scan_lines(path)
        return max(estimated_lines - 1, len(frame)), exact and estimated_lines - 1 == len(frame)
    return len(frame), len(frame) < SAMPLE_ROWS


def _read_sample(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix in {".xlsx", ".xls"}:
        return pd.read_excel(path, nrows=SAMPLE_ROWS)
    if suffix == ".parquet":
        import pyarrow.parquet as pq
        file = pq.ParquetFile(path)
        batch = next(file.iter_batches(batch_size=SAMPLE_ROWS), None)
        return batch.to_pandas() if batch is not None else pd.read_parquet(path)
    return pd.read_csv(path, sep="\t" if suffix == ".tsv" else ",", nrows=SAMPLE_ROWS)


def _profile_table(path: Path) -> dict:
    frame = _read_sample(path)
    frame.columns = [str(name) for name in frame.columns]
    n_rows, exact = _estimate_rows(path, frame)
    rows = max(len(frame), 1)

    fields: list[dict] = []
    for name in frame.columns:
        series = frame[name]
        values = series.dropna()
        text_values = values.astype(str)
        word_counts = [len(value.split()) for value in text_values.head(1_000)]
        fields.append({
            "name": name,
            "dtype": _friendly_dtype(series),
            "fill_pct": round(len(values) / rows * 100, 1),
            "unique": int(values.nunique()),
            "avg_words": round(sum(word_counts) / max(len(word_counts), 1), 1),
            "arabic_pct": round(_scripts(text_values.head(200).tolist())["arabic"] * 100, 1),
            "samples": [value[:160] for value in text_values.head(3).tolist()],
        })

    # The text column is the one carrying prose. A parallel corpus (Sorani plus
    # an English translation) has two such columns and the English one is always
    # wordier, so Arabic-script columns win before length is considered at all.
    prose = [field for field in fields if field["dtype"] == "text" and field["avg_words"] >= 2]
    sorani = [field for field in prose if field["arabic_pct"] >= 50]
    candidates = sorani or prose or [field for field in fields if field["dtype"] == "text"]
    text_field = max(candidates, key=lambda field: field["avg_words"], default=fields[0] if fields else None)
    text_col = text_field["name"] if text_field else None

    # A label is a column a modeller would treat as a class: few distinct
    # values, repeated across many rows.
    label_candidates = [
        field for field in fields
        if field["name"] != text_col and field["dtype"] in {"text", "boolean"}
        and 2 <= field["unique"] <= 50 and field["unique"] <= max(rows * 0.2, 2)
    ]
    label_field = min(label_candidates, key=lambda field: (field["dtype"] != "text", field["unique"]), default=None)
    label_col = label_field["name"] if label_field else None

    texts = frame[text_col].dropna().astype(str).tolist() if text_col else []
    words = [len(value.split()) for value in texts]
    min_words = _auto_min_words(_median(words))
    keep_share = sum(1 for count in words if count >= min_words) / rows
    estimated_docs = round(n_rows * keep_share)

    reason = (
        "the only Arabic-script text column" if len(sorani) == 1
        else f"the wordiest Arabic-script column, {text_field['avg_words']} words on average" if sorani
        else f"the wordiest text column, {text_field['avg_words']} words on average"
    ) if text_field else ""
    notes = [
        _note(f"Column “{text_col}” holds the document text — {reason}") if text_col
        else _note("No text column was detected in this file", "warn"),
        _note(f"Column “{label_col}” is used as a category label ({label_field['unique']} distinct values)")
        if label_col else _note("No column looked like a category label, so the run is unlabeled", "muted"),
        _note(f"Rows with fewer than {min_words} word{'s' if min_words > 1 else ''} of text are dropped"),
    ]
    return {
        "kind": "table",
        "columns": list(frame.columns),
        "fields": fields,
        "n_rows": n_rows,
        "exact_counts": exact,
        "sampled_units": len(frame),
        "text_stats": {
            "unit": "row",
            "blank_line_pct": 0.0,
            "median_words": _median(words),
            "avg_words": round(sum(words) / max(len(words), 1), 1),
            "max_words": max(words, default=0),
            "duplicate_pct": round((1 - len(set(texts)) / max(len(texts), 1)) * 100, 1),
            "scripts": _scripts(texts),
        },
        "preview": [value[:400] for value in texts[:PREVIEW_DOCS]],
        "plan": _plan(
            split="Line",
            min_words=min_words,
            text_col=text_col,
            label_col=label_col,
            estimated_docs=estimated_docs,
            exact=exact,
            notes=notes,
        ),
    }


def _note(text: str, tone: str = "ok") -> dict:
    """A line of the plan. ``tone`` is how it reads: a choice made (ok), an
    absence the user should know about (muted), or something to look at (warn)."""
    return {"text": text, "tone": tone}


def _plan(
    *,
    split: str,
    min_words: int,
    text_col: str | None,
    label_col: str | None,
    estimated_docs: int,
    exact: bool,
    notes: list[dict],
) -> dict:
    max_docs = None
    if estimated_docs > LARGE_CORPUS_DOCS:
        max_docs = LARGE_CORPUS_DOCS
        notes = notes + [_note(
            f"Large corpus — a seeded random sample of {LARGE_CORPUS_DOCS:,} documents is embedded "
            f"instead of all ~{estimated_docs:,}",
            "warn",
        )]
    return {
        "split": split,
        "min_words": min_words,
        "text_col": text_col,
        "label_col": label_col,
        "max_docs": max_docs,
        "normalize": True,
        "estimated_docs": min(estimated_docs, max_docs or estimated_docs),
        "estimated_total_docs": estimated_docs,
        "estimated": not exact,
        "notes": notes,
    }


def profile(path: Path) -> dict:
    """Describe an uploaded file's structure and the ingestion plan derived from it."""
    payload = _profile_text(path) if path.suffix.lower() in TEXT_EXT else _profile_table(path)
    return {
        "path": str(path.resolve()),
        "name": path.name,
        "size": path.stat().st_size,
        "format": path.suffix.lower().lstrip(".") or "txt",
        **payload,
    }
