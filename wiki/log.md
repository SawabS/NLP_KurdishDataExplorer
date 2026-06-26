# Wiki Log

## [2026-06-26] build | Drill-down topic tree, source isolation, and upload engine

Three user-requested features for the demo, all documented in
[[Implementation and Methodology]]:

- **Drill-down topic hierarchy.** Topics are now an interactive tree
  (icicle / treemap / sunburst) built from BERTopic `hierarchical_topics`: click a
  broad cluster to reveal sub-topics; box size = document count; hover shows
  keywords + count + a sample; a leaf inspector shows counts and example texts, with
  the distribution placed directly below. New `topics.hierarchy_nodes()` +
  `hierarchy.json` artifact.
- **Source-first navigation, no mixing.** The app picks a *source* then a model;
  each run is one corpus only, with a provenance banner. Added an explorable
  **AsoSoft** run (7,108 docs, 47 topics, NPMI +0.081, mcs=25) alongside the two
  KNDH runs.
- **Generic upload engine.** `app/upload_page.py` + `pipeline.run_on_texts()` accept
  a `.txt` (line/paragraph) or table (`.csv/.tsv/.xlsx/.parquet`, choose column);
  server-path input + streamed reads + a sample cap target hundreds-of-MB inputs.

Regenerated all artifacts with hierarchy and refreshed the comparison numbers to the
shipped runs: base MiniLM 48 topics / NPMI -0.056 / NMI 0.224; TSDAE 45 / +0.038 /
NMI 0.159 (TSDAE now wins coherence, diversity, and outliers; base wins label
alignment). Numbers in [[KDX-MiniLM-TSDAE (fine-tuned embedder)]] updated to match.

## [2026-06-26] build | Pipeline implementation, BERTopic tuning, and TSDAE fine-tuning

Documented in full at [[Implementation and Methodology]]. Summary of work done:

- **Environment**: `ai` conda env (Python 3.11, RTX 4060). Installed bertopic,
  umap-learn, hdbscan, gensim, streamlit, klpt (+chunspell), datasets, etc.; torch
  2.11+CUDA already present. Pinned `huggingface_hub==1.21.0` to resolve a
  datasets/transformers version clash.
- **Data**: KNDH downloaded from Mendeley (50k, 5 balanced classes — confirmed
  *economic, health, science & technology, social, sport*); AsoSoft Small (~4.9M
  tokens) cloned from GitHub. Both prepared to Parquet.
- **Code**: scaffolded `src/kurdish_explorer/` (config, data, preprocess, embed,
  topics, baselines, evaluate, pipeline) + `scripts/` + Streamlit `app/`.
- **BERTopic tuning** (full 50k): fixed a c-TF-IDF vectorizer bug, added MMR + outlier
  reassignment, tuned HDBSCAN (`min_cluster_size=250, min_samples=10`). Final NPMI
  -0.053 (beats LDA -0.149; NMF +0.107), 46 topics, 0.06% outliers.
- **Fine-tuning**: launched domain-adaptive **TSDAE** on ~110k Sorani sentences to
  produce [[KDX-MiniLM-TSDAE (fine-tuned embedder)]] (unsupervised, keeps the model
  general-purpose). Batch 8, lr 3e-5, 1 epoch, RTX 4060. Comparison vs base MiniLM
  pending completion.
- **App**: added a 2D document Map tab (sampled for scale).

Corrected the KNDH wiki pages: 5th category confirmed as "science & technology"
from the released data (paper prose was inconsistent).

Unresolved / pending:

- AsoSoft Large (75M) + topic-annotated RAR (needs `unrar`) not yet ingested.

## [2026-06-26] eval | TSDAE fine-tuning comparison completed

TSDAE training finished (train_loss 11.54, ~45 min). Compared
[[KDX-MiniLM-TSDAE (fine-tuned embedder)]] vs base MiniLM on full KNDH:

- Base MiniLM (mcs=250): 44 topics, NPMI -0.038, diversity 0.864, NMI 0.232.
- KDX-MiniLM-TSDAE (mcs=50): 88 topics, NPMI +0.009, diversity 0.855, NMI 0.175.

Honest finding: TSDAE improved coherence and cluster confidence (fewer outliers) but
reduced alignment with the 5 human categories; it also needed its own granularity
(mcs 250→50). Both models ship and are selectable in the app. Numbers written into
[[KDX-MiniLM-TSDAE (fine-tuned embedder)]] and [[Implementation and Methodology]].
Both 50k artifacts regenerated with 2D map coordinates; app verified (both runs
load, Map tab renders).

## [2026-06-26] ingest | Bootstrap wiki from 8 Kurdish NLP sources

First ingest pass. Processed all eight PDFs in `raw/sources/` into the wiki.

Sources ingested:

- KLPT – Kurdish Language Processing Toolkit (Ahmadi 2020)
- Kurdish News Dataset Headlines (KNDH) (Badawi et al. 2023)
- Toward Kurdish Language Processing: AsoSoft Text Corpus (Veisi et al. 2019)
- The Kurdish Language Corpus: State of the Art (Azzat et al. 2023)
- Multilingual Transformer and BERTopic for Short Text: Serbian (Medvecki et al. 2024)
- Idiom Detection in Sorani Kurdish Texts (Omer & Hassani 2025)
- A Transformer-based NMT Model for Sorani (Badawi 2023)
- Morphological Feature Extraction for Sorani Dialect Identification (Bharati et al. 2026)

Created:

- 8 source pages in `wiki/sources/`
- 6 entity pages (`klpt`, `kndh`, `asosoft-text-corpus`, `bertopic`, `kubert`, `soran-badawi`)
- 7 concept pages (`central-kurdish-sorani`, `low-resource-languages`, `topic-modeling`, `morphological-richness`, `text-normalization`, `transformer-models`, `text-classification`)
- 1 synthesis page (`kurdish-data-explorer-pipeline`)
- Updated `wiki/index.md`.

Unresolved issues / cautions:

- Fifth KNDH category label is inconsistent in the source (science vs education); recorded as science per the channel breakdown, with the discrepancy noted on the page.
- NMT BLEU 0.45 and idiom ~99% accuracy are strong claims on small data; flagged as encouraging, not decisive.
- AsoSoft and KNDH licensing/availability for direct ingestion not yet confirmed.
