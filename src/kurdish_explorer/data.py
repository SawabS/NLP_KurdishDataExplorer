"""Dataset loading.

Reads the prepared Parquet tables produced by ``scripts/prepare_data.py`` and
exposes them under a unified document schema:

    doc_id, source, text, label   (label is NA for unlabeled corpora)

``text`` is the KLPT-preprocessed Kurdish text when available, else the raw text.
"""
from __future__ import annotations

import pandas as pd

from . import config


def _require(path) -> None:
    if not path.exists():
        raise FileNotFoundError(
            f"{path} not found. Run `python scripts/prepare_data.py` first."
        )


def load_kndh() -> pd.DataFrame:
    """KNDH headlines as unified documents (labeled)."""
    _require(config.KNDH_PARQUET)
    df = pd.read_parquet(config.KNDH_PARQUET)
    text = df["text_ku_pp"].fillna(df["text_ku"])
    out = pd.DataFrame(
        {
            "doc_id": range(len(df)),
            "source": "kndh",
            "text": text.astype("string"),
            "label": df["label"].astype("string"),
            "text_en": df["text_en"].astype("string"),
        }
    )
    return out.dropna(subset=["text"]).reset_index(drop=True)


def load_asosoft() -> pd.DataFrame:
    """AsoSoft running text as unified documents (unlabeled)."""
    _require(config.ASOSOFT_PARQUET)
    df = pd.read_parquet(config.ASOSOFT_PARQUET)
    out = pd.DataFrame(
        {
            "doc_id": range(len(df)),
            "source": "asosoft",
            "text": df["text"].astype("string"),
            "label": pd.NA,
            "text_en": pd.NA,
        }
    )
    return out.dropna(subset=["text"]).reset_index(drop=True)


def load_corpus(source: str) -> pd.DataFrame:
    """Load a corpus by name: ``"kndh"`` or ``"asosoft"``."""
    source = source.lower()
    if source == "kndh":
        return load_kndh()
    if source == "asosoft":
        return load_asosoft()
    raise ValueError(f"Unknown source {source!r}. Expected 'kndh' or 'asosoft'.")


def available_sources() -> list[str]:
    sources = []
    if config.KNDH_PARQUET.exists():
        sources.append("kndh")
    if config.ASOSOFT_PARQUET.exists():
        sources.append("asosoft")
    return sources
