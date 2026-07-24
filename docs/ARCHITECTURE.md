# Architecture & Scaling Plan

This project began as a Kurdish (KNDH/AsoSoft) topic explorer, but the target is a
**general, size-unbounded text-exploration engine**: point it at a dataset's text
column or upload a text file (potentially hundreds of MB), and get embeddings,
topics, and interactive visual exploration without running out of memory.

KNDH (50k labelled Sorani headlines) is the first concrete use case and the
quality benchmark. The engine itself must be language- and source-agnostic.

## Pipeline stages (current → scalable)

| Stage | Current (≤100k docs) | Scalable target (millions of docs) |
|---|---|---|
| **Ingest** | KNDH xlsx / AsoSoft txt → Parquet | Generic readers: text file (chunked by line/para/window), CSV/Parquet/Excel with a chosen text column; **streamed**, never fully in RAM |
| **Normalize** | KLPT (Kurdish) | Optional per-language; pluggable, default passthrough for arbitrary text |
| **Embed** | `sentence-transformers` on GPU, full matrix in RAM, cached `.npy` | Batched fp16 GPU encoding → **memory-mapped** on-disk store (`np.memmap`/Arrow); resumable with progress |
| **Reduce + cluster** | UMAP + HDBSCAN (CPU) — good ≤~150k | One of: **(a) GPU cuML** UMAP+HDBSCAN (RAPIDS); **(b) online** IncrementalPCA + MiniBatchKMeans (`BERTopic.partial_fit`); **(c) sample-fit + assign-all** |
| **Topic repr.** | c-TF-IDF over Kurdish CountVectorizer | Same; c-TF-IDF is already linear and cheap |
| **Evaluate** | NPMI (gensim) + NMI vs labels | NPMI on a sampled doc set; metrics are topic-level so they scale |
| **Visualize** | Plotly tables/bars + topic×category | Topic-level aggregates scale; the document scatter uses **sampling/aggregation** (can't render millions of points) |
| **Serve** | FastAPI serves the React SPA and artifact/search/job API; the legacy Streamlit interface has been removed | Add Arrow/DuckDB only when artifact sizes require lazy predicates; never send or load full embeddings in the browser |

## Why the current clustering won't scale

UMAP (CPU) is ~O(n^1.5) and HDBSCAN is memory-heavy; both become impractical past
a few hundred thousand documents. Three escape hatches, in increasing robustness:

1. **cuML (GPU)** — best topic quality at scale; needs RAPIDS on this CUDA build
   (install risk). BERTopic accepts `cuml.UMAP` / `cuml.HDBSCAN` directly.
2. **Online / incremental** — `IncrementalPCA` + `MiniBatchKMeans` via
   `BERTopic.partial_fit`; linear time, bounded memory, fixed #topics.
3. **Sample-fit + assign** — fit UMAP/HDBSCAN on a representative sample, then
   `transform`/approximate-assign the remainder. Middle ground, no extra deps.

Proposed default: **auto-select by corpus size** — exact UMAP/HDBSCAN below a
threshold (e.g. 150k docs), cuML if available, else online above it.

## Storage layout (per run)

```
artifacts/<run>/
  embeddings.f16.npy        # memmap (n, dim) float16
  coords2d.npy              # (n, 2) for the scatter (sampled view)
  documents.parquet         # doc_id, text, [label], topic   (lazy via Arrow/DuckDB)
  topic_info.parquet        # topic sizes + names
  topic_words.json          # per-topic keywords
  coherence.json, meta.json
```

## Open decisions

- **Clustering-at-scale backend**: cuML GPU vs online vs sample-fit (see above).
- **Embedding fine-tuning**: domain-adaptive (unsupervised, generic) vs supervised
  on KNDH labels (sharper for the course metric, biased for generic use) vs skip.
- **Scatter rendering**: server-side aggregation (datashader) vs client sampling.

These are tracked with the user; this document is the living plan, updated as we go.
