import os
from pathlib import Path

from fastapi import APIRouter

from kurdish_explorer import config

router = APIRouter(tags=["models"])


def key_present(key: str) -> bool:
    if key == "openai":
        return bool(os.getenv("OPENAI_API_KEY"))
    if key == "nvidia":
        return bool(os.getenv("NVIDIA_API_KEY"))
    return True


def auto_model_key() -> str:
    """The model a new fit uses when the caller does not name one.

    Uploads never ask the user to choose an embedding backend; the server picks
    a hosted provider whose key is configured and falls back to the local
    Sorani-adapted model so a keyless install still works.
    """
    default = config.default_model_key()
    if key_present(default):
        return default
    return next((key for key in config.NEW_FIT_MODELS if key_present(key)), config.DEFAULT_EMBEDDING_MODEL)


def model_card(key: str) -> dict:
    """How a model is described to the user — provider, exact model id, cost class."""
    name = config.EMBEDDING_MODELS.get(key, key)
    return {
        "key": key,
        "label": config.EMBEDDING_MODEL_LABELS.get(key, key),
        # Local models register as a filesystem path; only the model name is
        # meaningful to a reader.
        "name": Path(name).name if name.startswith("/") else name,
        "provider": {"openai": "OpenAI", "nvidia": "NVIDIA"}.get(key, "local"),
        "hosted": key in {"openai", "nvidia"},
        "key_present": key_present(key),
    }


@router.get("/models")
def list_models() -> dict:
    """Embedding providers offered for new fits, plus the one auto-selected."""
    keys = config.NEW_FIT_MODELS
    auto = auto_model_key()
    return {
        "default": auto,
        "auto": model_card(auto),
        "models": [model_card(key) for key in keys],
    }
