"""Kurdish Data Explorer.

A reproducible pipeline for topic-modeling and exploratory analysis of Central
Kurdish (Sorani) text, following the project proposal:

    load -> KLPT normalize -> embed -> BERTopic (+ LDA/NMF baselines) -> Streamlit

See `kurdish_explorer.pipeline.run` for the end-to-end entry point.
"""

__version__ = "0.1.0"
