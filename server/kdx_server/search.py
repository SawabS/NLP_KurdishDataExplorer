"""Semantic topic search using cached document centroids."""
from __future__ import annotations

from functools import lru_cache
import numpy as np

from kurdish_explorer import config, embed
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
