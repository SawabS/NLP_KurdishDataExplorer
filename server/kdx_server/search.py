"""Semantic topic search using cached document centroids, plus RAG:
per-document nearest-neighbor retrieval feeding an LLM-synthesized answer."""
from __future__ import annotations

from functools import lru_cache
import numpy as np
import pandas as pd

from kurdish_explorer import config, embed, llm
from .runcache import load, run_dir


@lru_cache(maxsize=8)
def _topic_vectors(source: str, model: str, mtime_ns: int) -> tuple[list[int], np.ndarray]:
    del mtime_ns
    artifact = load(source, model)
    docs = artifact["documents"]
    texts = docs["text"].astype(str).tolist()
    topics = docs["topic"].to_numpy()
    topic_ids = sorted(int(value) for value in np.unique(topics) if int(value) != -1)
    if embed._cache_path(model, texts).exists():
        vectors = embed.embed_documents(texts, model_key=model)
        centroids = np.vstack([vectors[topics == topic].mean(axis=0) for topic in topic_ids])
        centroids /= np.maximum(np.linalg.norm(centroids, axis=1, keepdims=True), 1e-12)
        return topic_ids, centroids
    words = artifact["topic_words"]
    representatives = [" ".join(word for word, _ in words.get(str(topic), [])[:10]) for topic in topic_ids]
    vectors = embed.get_embedder(model).encode(
        representatives, convert_to_numpy=True, normalize_embeddings=True
    )
    return topic_ids, np.asarray(vectors)


def rank(source: str, model: str, query: str, limit: int = 3) -> dict:
    if model not in config.EMBEDDING_MODELS:
        raise ValueError(f"Unregistered embedding model: {model}")
    path = run_dir(source, model) / "meta.json"
    topic_ids, vectors = _topic_vectors(source, model, path.stat().st_mtime_ns)
    query_vector = embed.get_embedder(model).encode(
        [query], convert_to_numpy=True, normalize_embeddings=True
    )[0]
    similarities = vectors @ query_vector
    spread = (similarities - similarities.min()) / (np.ptp(similarities) + 1e-9)
    order = np.argsort(similarities)[::-1][:limit]
    artifact = load(source, model)
    docs = artifact["documents"]
    words = artifact["topic_words"]
    results = []
    for rank_index, vector_index in enumerate(order, 1):
        topic_id = topic_ids[int(vector_index)]
        subset = docs[docs["topic"] == topic_id]
        sample_columns = [name for name in ("text", "text_en", "label") if name in subset]
        sample_frame = subset[sample_columns].head(3)
        samples = sample_frame.where(sample_frame.notna(), None).to_dict("records")
        results.append({
            "rank": rank_index,
            "topic_id": topic_id,
            "count": int(len(subset)),
            "match": float(spread[int(vector_index)] * 100),
            "similarity": float(similarities[int(vector_index)]),
            "keywords": [word for word, _ in words.get(str(topic_id), [])[:8]],
            "samples": samples,
        })
    return {"query": query, "best_topic_id": results[0]["topic_id"] if results else None, "results": results}


@lru_cache(maxsize=1)
def _document_vectors(source: str, model: str, mtime_ns: int) -> np.ndarray:
    del mtime_ns
    artifact = load(source, model)
    texts = artifact["documents"]["text"].astype(str).tolist()
    if not embed._cache_path(model, texts).exists():
        raise RuntimeError(
            "Document embeddings are not cached for this run — re-fit it to enable RAG search."
        )
    return embed.embed_documents(texts, model_key=model)


def retrieve(source: str, model: str, query: str, k: int = 8) -> list[dict]:
    """Real per-document nearest-neighbor retrieval (not the topic-centroid
    approximation ``rank`` uses above) — the grounding passages for RAG."""
    if model not in config.EMBEDDING_MODELS:
        raise ValueError(f"Unregistered embedding model: {model}")
    path = run_dir(source, model) / "meta.json"
    vectors = _document_vectors(source, model, path.stat().st_mtime_ns)
    query_vector = embed.get_embedder(model).encode(
        [query], convert_to_numpy=True, normalize_embeddings=True
    )[0]
    similarities = vectors @ query_vector
    order = np.argsort(similarities)[::-1][:k]

    artifact = load(source, model)
    docs = artifact["documents"]
    topic_labels = artifact.get("topic_labels") or {}
    words = artifact["topic_words"]
    results = []
    for rank_index, index in enumerate(order, 1):
        row = docs.iloc[int(index)]
        raw_topic = int(row["topic"])
        topic_id = raw_topic if raw_topic != -1 else None
        label_value = row.get("label") if "label" in docs.columns else None
        results.append({
            "rank": rank_index,
            "doc_index": int(index),
            "similarity": float(similarities[int(index)]),
            "text": str(row["text"]),
            "topic_id": topic_id,
            "topic_label": topic_labels.get(str(topic_id)) if topic_id is not None else None,
            "keywords": [w for w, _ in words.get(str(topic_id), [])[:6]] if topic_id is not None else [],
            "category": None if pd.isna(label_value) else str(label_value),
        })
    return results


def neighbors(source: str, model: str, doc_id: int, k: int = 6) -> list[dict]:
    """Nearest documents to a given record (by ``doc_id``) in embedding space —
    best-effort: returns ``[]`` if this run's document embeddings aren't cached
    rather than forcing a re-embed on an inspector open."""
    if model not in config.EMBEDDING_MODELS:
        return []
    try:
        path = run_dir(source, model) / "meta.json"
        vectors = _document_vectors(source, model, path.stat().st_mtime_ns)
    except Exception:  # not cached / unregistered — neighbors are an enrichment, never required
        return []
    docs = load(source, model)["documents"].reset_index(drop=True)
    topic_labels = load(source, model).get("topic_labels") or {}
    positions = np.where(docs["doc_id"].to_numpy() == doc_id)[0]
    if len(positions) == 0:
        return []
    pos = int(positions[0])
    similarities = vectors @ vectors[pos]
    order = [int(i) for i in np.argsort(similarities)[::-1] if int(i) != pos][:k]
    out = []
    for index in order:
        row = docs.iloc[index]
        raw_topic = int(row["topic"])
        topic_id = raw_topic if raw_topic != -1 else None
        out.append({
            "doc_id": int(row["doc_id"]),
            "similarity": float(similarities[index]),
            "text": str(row["text"])[:280],
            "topic": raw_topic,
            "topic_label": topic_labels.get(str(topic_id)) if topic_id is not None else None,
        })
    return out


def answer(source: str, model: str, query: str, k: int = 8) -> dict:
    """Retrieve grounding passages, then ask the chat LLM to synthesize an
    answer strictly from them — a real RAG loop, not just topic matching."""
    passages = retrieve(source, model, query, k)
    if not passages:
        return {"query": query, "answer": "", "citations": [], "error": None}

    context = "\n\n".join(
        f'[{p["rank"]}] ({p["topic_label"] or (", ".join(p["keywords"]) or "uncategorized")}) {p["text"][:600]}'
        for p in passages
    )
    prompt = (
        "Answer the question using ONLY the numbered passages below, which come from a document "
        "corpus. Cite the passages you rely on inline like [1] or [2][3]. If the passages don't "
        "contain enough information to answer, say so plainly instead of guessing or using outside "
        "knowledge. Reply in the SAME language as the question.\n\n"
        f"Question: {query}\n\nPassages:\n{context}"
    )
    try:
        text = llm.chat_complete([{"role": "user", "content": prompt}], temperature=0.2)
        error = None
    except Exception as exc:  # the chat provider may be unreachable/misconfigured
        text = ""
        error = f"{type(exc).__name__}: {exc}"
    return {"query": query, "answer": text, "citations": passages, "error": error}
