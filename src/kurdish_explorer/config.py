"""Central configuration: paths, model registry, and default parameters.

All paths are derived from the repository root so the package works regardless
of the current working directory or deployment host.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
ARTIFACTS_DIR = ROOT / "artifacts"
EMBED_CACHE_DIR = ARTIFACTS_DIR / "embeddings"

for _d in (PROCESSED_DIR, ARTIFACTS_DIR, EMBED_CACHE_DIR):
    _d.mkdir(parents=True, exist_ok=True)

KNDH_PARQUET = PROCESSED_DIR / "kndh.parquet"
ASOSOFT_PARQUET = PROCESSED_DIR / "asosoft_small.parquet"

# ---------------------------------------------------------------------------
# Datasets
# ---------------------------------------------------------------------------
# The five balanced KNDH categories (confirmed from the released data).
KNDH_CATEGORIES = ["economic", "health", "science & technology", "social", "sport"]

# ---------------------------------------------------------------------------
# Embedding model registry
# ---------------------------------------------------------------------------
# The project presents ONE model: KDX MiniLM — multilingual MiniLM domain-
# adapted to Sorani with TSDAE (scripts/finetune_tsdae.py, trained on KNDH
# headlines + AsoSoft sentences). The off-the-shelf base MiniLM stays
# registered only as the evaluation comparison point. Earlier experiments
# (DistilUSE, MPNet, E5-base) scored worse on NPMI coherence and were
# unregistered; their artifacts remain on disk but are not shown in the app.
EMBEDDING_MODELS: dict[str, str] = {
    # Domain-adapted (TSDAE) MiniLM — produced by scripts/finetune_tsdae.py.
    "kdx-minilm-tsdae": str(ARTIFACTS_DIR / "models" / "kdx-minilm-tsdae"),
    "minilm": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    "openai": os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
    "nvidia": os.getenv("NVIDIA_EMBEDDING_MODEL", "nvidia/nemotron-3-embed-1b"),
}
DEFAULT_EMBEDDING_MODEL = "kdx-minilm-tsdae"

# Human-readable model names for the UI. Keys mirror EMBEDDING_MODELS; the
# raw HF ids / local paths above stay the single source of truth for loading.
EMBEDDING_MODEL_LABELS: dict[str, str] = {
    "kdx-minilm-tsdae": "KDX MiniLM · TSDAE domain-adapted for Sorani (ours)",
    "minilm": "Base MiniLM · off-the-shelf comparison",
    "openai": f"OpenAI · {EMBEDDING_MODELS['openai']}",
    "nvidia": f"NVIDIA · {EMBEDDING_MODELS['nvidia']} (concurrent, max speed)",
}


# Models offered for NEW fits / uploads. The local models above remain loadable
# for existing research artifacts, while new demo fits focus on the two hosted
# providers used by the side-by-side corpus comparison.
NEW_FIT_MODELS: tuple[str, ...] = ("openai", "nvidia")

# When a corpus has several fitted runs on disk, use this order for its default
# route and model selector. Every fitted registered model remains available.
MODEL_PREFERENCE: tuple[str, ...] = (
    "openai", "nvidia", "kdx-minilm-tsdae", "minilm", "mpnet", "distiluse", "e5-base",
)


def best_available_model(fitted: list[str]) -> str:
    """Pick the single run to serve for a source from its fitted model keys."""
    for key in MODEL_PREFERENCE:
        if key in fitted:
            return key
    return fitted[0]


# ---------------------------------------------------------------------------
# Chat/completion model registry (topic labeling + RAG answers)
# ---------------------------------------------------------------------------
# Separate from the embedding registry above: this powers LLM generation
# (human-readable topic labels, RAG answer synthesis), not vector embedding.
# NVIDIA_CHAT_API_KEY/NVIDIA_CHAT_MODEL let the chat model use a different NIM
# deployment (and key) than the embedding provider; both fall back to the
# embedding provider's NVIDIA_API_KEY when unset.
CHAT_MODELS: dict[str, str] = {
    "ollama": os.getenv("OLLAMA_CHAT_MODEL", "qwen2.5:7b-instruct"),
    "openai": os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
    "nvidia": os.getenv("NVIDIA_CHAT_MODEL", "meta/llama-3.1-8b-instruct"),
}


def default_chat_provider() -> str:
    """``KDX_CHAT_PROVIDER`` (ollama | openai | nvidia) always wins; defaults to ollama."""
    requested = os.getenv("KDX_CHAT_PROVIDER", "").strip().lower()
    if requested:
        if requested not in CHAT_MODELS:
            raise ValueError(
                f"KDX_CHAT_PROVIDER must be one of {', '.join(CHAT_MODELS)}; received {requested!r}."
            )
        return requested
    return "ollama"


def default_model_key() -> str:
    """Choose an explicit provider, a hosted key when configured, else local.

    ``KDX_EMBEDDING_PROVIDER`` accepts a registered model key and always wins.
    Without it, ``NVIDIA_API_KEY`` selects NVIDIA (checked first because its
    adapter is the fastest hosted option once configured), then
    ``OPENAI_API_KEY`` selects OpenAI, and a fresh clone remains usable with
    the local MiniLM fallback when no key is configured.
    """
    requested = os.getenv("KDX_EMBEDDING_PROVIDER", "").strip().lower()
    if requested:
        if requested not in EMBEDDING_MODELS:
            raise ValueError(
                "KDX_EMBEDDING_PROVIDER must be one of "
                f"{', '.join(EMBEDDING_MODELS)}; received {requested!r}."
            )
        return requested
    if os.getenv("NVIDIA_API_KEY"):
        return "nvidia"
    if os.getenv("OPENAI_API_KEY"):
        return "openai"
    if Path(EMBEDDING_MODELS[DEFAULT_EMBEDDING_MODEL]).exists():
        return DEFAULT_EMBEDDING_MODEL
    return "minilm"

# ---------------------------------------------------------------------------
# Modeling defaults
# ---------------------------------------------------------------------------
SEED = 42

# UMAP (dimensionality reduction before clustering)
UMAP_PARAMS = dict(n_neighbors=15, n_components=5, min_dist=0.0, metric="cosine")

# HDBSCAN (density-based clustering). Tuned on full KNDH (see scripts/tune_bertopic.py):
# larger min_cluster_size -> fewer, more diverse, better label-aligned topics; a low
# min_samples keeps native outliers down before c-TF-IDF outlier reassignment.
HDBSCAN_PARAMS = dict(min_cluster_size=250, min_samples=10, metric="euclidean", prediction_data=True)

# Per-model fit overrides, merged over the defaults above at fit time.
# The KDX (TSDAE) space is highly anisotropic (mean random-pair cosine 0.95 vs
# 0.17 for base MiniLM), so with the default EOM selection HDBSCAN grows one
# junk mega-cluster holding half the corpus. Leaf selection over a wider UMAP
# neighborhood breaks the blob: on KNDH the largest topic drops 54% -> 6%,
# NMI vs labels rises 0.159 -> 0.212, and NPMI rises +0.038 -> +0.057
# (diagnosed 2026-07-11; sweep in the wiki change log).
MODEL_FIT_OVERRIDES: dict[str, dict] = {
    "kdx-minilm-tsdae": {
        "umap": dict(n_neighbors=50),
        "hdbscan": dict(min_cluster_size=100, cluster_selection_method="leaf"),
    },
}

# Token pattern keeps Unicode word characters (works for Arabic-script Kurdish).
# Minimum 3 word-characters: 1-2 letter tokens are almost always grammatical
# particles/enclitics (Kurdish "کو", "دا", "بو", "ده", ...; also short function
# words in other scripts), never a meaningful topic-defining term, and neither
# KLPT's Sorani nor Kurmanji stopword lists cover every dialect's short forms.
TOKEN_PATTERN = r"(?u)\b\w{3,}\b"

# BERTopic c-TF-IDF runs its vectorizer over *grouped per-topic* documents (one
# concatenated doc per topic), so min_df must stay tiny and max_df off — otherwise
# keywords collapse to only words shared across many topics.
CTFIDF_VECTORIZER_PARAMS = dict(token_pattern=TOKEN_PATTERN, min_df=1, ngram_range=(1, 1))

# LDA/NMF baselines vectorize the *full* document set, where corpus-level df
# pruning is appropriate.
BASELINE_VECTORIZER_PARAMS = dict(token_pattern=TOKEN_PATTERN, min_df=5, max_df=0.5, ngram_range=(1, 1))

# Number of topics for the LDA/NMF baselines (BERTopic discovers its own count).
N_BASELINE_TOPICS = 20

# Words per topic used for keyword display and coherence scoring.
TOP_N_WORDS = 10
