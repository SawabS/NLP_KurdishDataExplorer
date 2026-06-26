#!/usr/bin/env python3
"""Prepare raw Kurdish Data Explorer datasets into clean Parquet tables.

Inputs (already downloaded under data/raw/):
  - KNDH:    data/raw/kndh/KNDH.xlsx           (50k labelled Sorani headlines)
  - AsoSoft: data/raw/asosoft/small/*.txt      (5M-token Sorani running text)

Outputs (data/processed/):
  - kndh.parquet           columns: label, text_ku, text_en, text_ku_pp, text_en_pp
  - asosoft_small.parquet  columns: doc_id, source, text

Run:  conda run -n ai python scripts/prepare_data.py
"""
from __future__ import annotations
import glob
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)


def prepare_kndh() -> None:
    src = RAW / "kndh" / "KNDH.xlsx"
    df = pd.read_excel(src)
    df.columns = ["label", "text_ku", "text_en", "text_ku_pp", "text_en_pp"]
    df["label"] = df["label"].str.strip()
    for c in ("text_ku", "text_en", "text_ku_pp", "text_en_pp"):
        df[c] = df[c].astype("string").str.strip()
    df = df.dropna(subset=["text_ku"]).reset_index(drop=True)
    dest = OUT / "kndh.parquet"
    df.to_parquet(dest, index=False)
    print(f"[KNDH] {len(df):,} rows -> {dest.relative_to(ROOT)}")
    print("       class balance:", dict(df["label"].value_counts()))


def prepare_asosoft_small() -> None:
    files = glob.glob(str(RAW / "asosoft" / "small" / "*.txt"))
    if not files:
        print("[AsoSoft] small text not found; skipping")
        return
    rows = []
    for fp in files:
        with open(fp, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    rows.append(line)
    df = pd.DataFrame({"text": rows})
    df.insert(0, "doc_id", range(len(df)))
    df.insert(1, "source", "asosoft_small")
    dest = OUT / "asosoft_small.parquet"
    df.to_parquet(dest, index=False)
    n_tokens = df["text"].str.split().map(len).sum()
    print(f"[AsoSoft] {len(df):,} docs, ~{n_tokens:,} whitespace tokens -> {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    prepare_kndh()
    prepare_asosoft_small()
    print("Done.")
