"""Provider-agnostic chat/completion client for topic labeling and RAG answers.

Separate from ``embed.py``'s embedding providers: this always talks to an
OpenAI-compatible *chat completions* endpoint, so one client covers Ollama
(local), OpenAI, and NVIDIA by swapping base_url/api_key/model — no per-
provider SDK branching needed.
"""
from __future__ import annotations

import functools
import os

from . import config


@functools.lru_cache(maxsize=4)
def _client(provider: str):
    from openai import OpenAI

    if provider == "ollama":
        return OpenAI(
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
            api_key="ollama",  # unused by Ollama, but the SDK requires a value
        )
    if provider == "openai":
        return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    if provider == "nvidia":
        return OpenAI(
            api_key=os.getenv("NVIDIA_CHAT_API_KEY") or os.getenv("NVIDIA_API_KEY"),
            base_url=os.getenv("NVIDIA_API_BASE_URL", "https://integrate.api.nvidia.com/v1"),
        )
    raise ValueError(f"Unknown chat provider: {provider!r}")


def chat_complete(
    messages: list[dict],
    *,
    temperature: float = 0.2,
    json_mode: bool = False,
    provider: str | None = None,
) -> str:
    """Send a chat completion request to the configured (or given) provider.

    ``json_mode`` requests a JSON-object response where the endpoint reliably
    supports it (OpenAI, NVIDIA); callers should still instruct the model to
    reply with JSON in the prompt itself, since not every locally served
    Ollama model honors ``response_format``.
    """
    provider = provider or config.default_chat_provider()
    client = _client(provider)
    model = config.CHAT_MODELS[provider]
    kwargs: dict = {}
    if json_mode and provider in ("openai", "nvidia"):
        kwargs["response_format"] = {"type": "json_object"}
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        **kwargs,
    )
    return response.choices[0].message.content or ""
