import os
from fastapi import APIRouter

from kurdish_explorer import config

router = APIRouter(tags=["models"])


@router.get("/models")
def list_models() -> dict:
    return {
        "default": config.default_model_key(),
        "models": [
            {
                "key": key,
                "label": config.EMBEDDING_MODEL_LABELS.get(key, key),
                "key_present": (
                    bool(os.getenv("OPENAI_API_KEY")) if key == "openai"
                    else bool(os.getenv("NVIDIA_API_KEY")) if key == "nvidia"
                    else True
                ),
            }
            for key in config.EMBEDDING_MODELS
        ],
    }
