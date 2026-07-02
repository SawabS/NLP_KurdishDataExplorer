import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from kurdish_explorer import config
from kurdish_explorer.pipeline import available_model_options


def test_available_model_options_includes_all_configured_models() -> None:
    options = available_model_options("kndh", {"kndh": ["minilm"]})

    labels = [label for label, _ in options]
    keys = [key for _, key in options]

    assert keys == list(config.EMBEDDING_MODELS)
    assert any("fit required" in label for label in labels)
    assert any(key == "kdx-minilm-tsdae" for key in keys)
