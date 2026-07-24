# Transform Kurdish Data Explorer into a Production-Grade NLP Visual Analytics Platform

Act as a senior product designer, data-visualization engineer, frontend architect, and Python ML platform engineer.

Your task is to transform the existing Kurdish Data Explorer into a coherent, production-grade NLP data exploration and visual-analytics application. This is not a superficial reskin. Redesign the information architecture, interaction model, frontend architecture, visualization system, and integration boundary around the existing NLP pipeline.

## Repositories

Inspect both repositories completely before modifying code:

### Existing application

https://github.com/SawabS/NLP_KurdishDataExplorer

The existing application contains the NLP pipeline, trained-model integration, artifact storage, Streamlit interface, ingestion workflow, semantic search, BERTopic visualizations, and evaluation logic.

Read at minimum:

* `README.md`
* `AGENTS.md`
* `docs/ARCHITECTURE.md`
* `app/streamlit_app.py`
* `app/upload_page.py`
* `src/kurdish_explorer/`
* `scripts/`
* `tests/`
* the artifact schemas documented in the repository

### Design system

https://github.com/SawabS/noor-ui

Read at minimum:

* `README.md`
* `DESIGN_SYSTEM.md`
* `docs/components.md`
* `docs/rtl-multilingual.md`
* `docs/accessibility.md`
* `docs/dark-mode.md`
* `docs/migration-usage.md`
* component source files and Storybook stories
* token definitions under `src/tokens/`

Use Noor UI as the mandatory visual and interaction foundation. Do not recreate generic buttons, inputs, menus, tables, dialogs, tabs, badges, cards, navigation elements, or theme systems when Noor already provides them.

## Product objective

Turn Kurdish Data Explorer into an analytical workspace for exploring multilingual text corpora, initially emphasizing:

* Kurdish Sorani;
* Kurdish Badini/Bahdini;
* Kurdish Kurmanji;
* Arabic;
* English;
* mixed-language and code-switched content.

The product must remain usable with arbitrary text corpora. Kurdish-specific features should be implemented as language-aware enrichments rather than assumptions that make the core explorer unusable for other languages.

The application should help a researcher, data scientist, analyst, or domain expert answer:

* What does this corpus contain?
* What are its dominant and minor themes?
* How are documents distributed in embedding space?
* Which topics are related or hierarchically connected?
* Which documents belong to a selected region or topic?
* What corpus records are semantically related to a natural-language query?
* How trustworthy are the clusters and topic labels?
* Which records are outliers, duplicates, malformed, noisy, or low-confidence?
* How do different embedding models and clustering runs compare?
* How can a human correct a topic label, language label, or other derived annotation?

## Preserve current capabilities

Do not discard or silently simplify working functionality.

Preserve and redesign the existing capabilities:

* source-first corpus selection without mixing unrelated corpora;
* selectable fitted embedding models;
* visible unfitted models with an explicit fitting workflow;
* corpus provenance and processing metadata;
* document, topic, outlier, coherence, model, and runtime statistics;
* BERTopic hierarchy exploration;
* icicle, treemap, and sunburst hierarchy modes where they remain useful;
* topic keyword charts;
* topic document inspection;
* topic-by-category distributions;
* two-dimensional UMAP document maps;
* topic and category colouring;
* point-sampling controls for large corpora;
* semantic “Ask the corpus” search;
* multilingual semantic queries;
* matched-topic ranking and representative documents;
* model documentation and evaluation comparisons;
* CSV, TSV, Excel, Parquet, and raw-text ingestion;
* line-based and paragraph-based text splitting;
* text-column and optional label-column selection;
* KLPT normalization controls;
* embedding-model selection;
* clustering-granularity controls;
* LDA and NMF evaluation baselines;
* pipeline progress reporting;
* local and hosted embedding providers;
* saved artifacts and reproducible runs.

The new frontend must consume the existing pipeline and artifacts rather than reimplementing BERTopic, embeddings, normalization, evaluation, or corpus preparation in TypeScript.

## Inspect these external references

Study the following projects before settling on the interface. Extract interaction patterns and analytical ideas, but do not copy branding, assets, layouts verbatim, or proprietary visual identity.

Create `docs/UI_REFERENCE_ANALYSIS.md` documenting:

1. what was inspected;
2. which interaction patterns are relevant;
3. what will be adopted;
4. what will deliberately not be adopted;
5. how the resulting interface remains original and consistent with Noor UI.

### 1. Latent Scope

Repository:

https://github.com/enjalot/latent-scope

Interactive examples:

https://latent.estate/

Inspect it for:

* the end-to-end dataset exploration workflow;
* embedding, projection, clustering, and labelling as a connected process;
* zooming between dataset-level structure and individual records;
* cluster navigation;
* semantic search;
* contextual record inspection;
* how users retain their global context while examining individual points.

### 2. Apple Embedding Atlas

Repository:

https://github.com/apple/embedding-atlas

Overview:

https://apple.github.io/embedding-atlas/overview.html

Examples:

https://apple.github.io/embedding-atlas/examples/

React component documentation:

https://apple.github.io/embedding-atlas/embedding-atlas.html

Inspect it for:

* a high-performance embedding canvas;
* coordinated views and cross-filtering;
* density contours;
* metadata-based filtering;
* nearest-neighbour exploration;
* automatic cluster labels;
* instance inspection;
* linked charts;
* rendering large point collections with WebGPU;
* embedding its React components inside another application.

Evaluate whether the `embedding-atlas` React package can provide the primary document-map surface. Do not adopt it automatically. Test its bundle size, accessibility, theming, RTL behavior, data contract, embedding integration, and compatibility with Noor UI.

If it integrates cleanly, wrap it in a Noor-themed adapter. If not, implement a performant Plotly WebGL or another justified canvas/WebGL alternative while retaining the coordinated-selection concepts.

### 3. Renumics Spotlight

Repository:

https://github.com/Renumics/spotlight

Product overview:

https://renumics.com/open-source/spotlight

Inspect it for:

* linked dataframe views;
* similarity maps;
* inspecting an individual data point beside aggregate views;
* reusable view configurations;
* filters shared across charts, tables, and record inspectors;
* model-output, uncertainty, and metadata inspection.

### 4. Nomic Atlas

Application:

https://atlas.nomic.ai/datasets

SDK repository:

https://github.com/nomic-ai/nomic

Inspect it for:

* map-first semantic exploration;
* automatic topic and cluster labelling;
* meaningful zoom levels;
* natural-language semantic search;
* metadata filters;
* document previews;
* transitions between macrostructure and individual records.

### 5. BERTopic visualization system

Documentation:

https://maartengr.github.io/BERTopic/getting_started/visualization/visualization.html

Inspect the semantics of:

* topic maps;
* document maps;
* hierarchical documents;
* topic hierarchy;
* topic similarity;
* term scores;
* topics over time;
* topics per class;
* document-topic probabilities.

Do not merely replicate every BERTopic figure. Determine which views answer distinct analytical questions and remove redundant visualizations.

### 6. Argilla

Annotation interface:

https://docs.argilla.io/latest/how_to_guides/annotate/

Inspect it for:

* focus and bulk record views;
* search, filtering, and sorting;
* model suggestions and confidence;
* semantic similarity retrieval;
* pending, draft, reviewed, and discarded states;
* efficient human correction;
* annotation progress;
* keyboard-driven review.

Use these patterns for an optional review workspace where users can correct topic labels, language labels, dialect labels, sentiment, or data-quality flags. Do not add unsupported NLP predictions merely to populate the interface.

### 7. TextBI

Paper and system description:

https://aclanthology.org/2024.eacl-demo.1/

Inspect it for:

* multidimensional NLP analytics;
* thematic, temporal, spatial, and metadata dimensions;
* serving both domain stakeholders and NLP researchers;
* linking BI-style charts with NLP annotations;
* avoiding a dashboard composed of unrelated visual cards.

### 8. Lilac

Repository:

https://github.com/databricks/lilac

Inspect it for:

* corpus quality analysis;
* duplicate and near-duplicate detection;
* outlier inspection;
* searchable metadata;
* scalable text reading;
* annotation and curation workflows.

Treat Lilac as a data-quality reference, not as a visual design template.

## Architectural direction

Because Noor UI is React-based and the existing interface is Streamlit-based, create a separate React frontend and a thin Python API around the existing pipeline.

Recommended structure:

```text
NLP_KurdishDataExplorer/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── corpus/
│   │   │   ├── explorer/
│   │   │   ├── topics/
│   │   │   ├── documents/
│   │   │   ├── semantic-search/
│   │   │   ├── evaluation/
│   │   │   ├── ingestion/
│   │   │   └── jobs/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── styles/
│   └── ...
├── app/
│   ├── api.py
│   ├── schemas.py
│   ├── services/
│   └── streamlit_app.py
├── src/kurdish_explorer/
└── ...
```

Use React, TypeScript, and Vite unless repository constraints justify Next.js. This is primarily an authenticated analytical SPA and does not require server-side rendering.

Use FastAPI or an equivalently lightweight typed Python API. The API should invoke the existing Python package and read existing artifact files. Do not move ML logic into route handlers; use service modules that call `src/kurdish_explorer`.

Keep Streamlit temporarily as a compatibility and regression-reference interface. Do not remove it until the React frontend reaches functional parity and the migration is documented.

## Proposed API contract

Design typed endpoints around analytical operations rather than exposing arbitrary files.

At minimum, consider:

```text
GET    /api/sources
GET    /api/sources/{source}
GET    /api/sources/{source}/models
GET    /api/runs
GET    /api/runs/{run_id}
GET    /api/runs/{run_id}/summary
GET    /api/runs/{run_id}/topics
GET    /api/runs/{run_id}/hierarchy
GET    /api/runs/{run_id}/documents
GET    /api/runs/{run_id}/map
GET    /api/runs/{run_id}/evaluation

POST   /api/runs/{run_id}/semantic-search
POST   /api/uploads/inspect
POST   /api/uploads
POST   /api/pipeline/jobs
GET    /api/jobs/{job_id}
GET    /api/jobs/{job_id}/events
```

Use pagination, filtering, projection, and sampling parameters. Never return the complete corpus or full embedding matrix to the browser by default.

Use Server-Sent Events for pipeline progress unless bidirectional communication is genuinely needed. Return structured progress events such as:

```json
{
  "stage": "embedding",
  "progress": 0.32,
  "message": "Embedding batch 16 of 50",
  "documentsProcessed": 10240,
  "documentsTotal": 32000
}
```

Define API schemas explicitly with Pydantic and generate or maintain matching TypeScript types.

## Information architecture

Create a persistent application shell using Noor UI.

### Primary navigation

Use a collapsible `Sidebar` with:

* Overview
* Explore
* Topics
* Documents
* Ask Corpus
* Import
* Runs
* Evaluation
* Settings

Do not create nine completely disconnected pages. Preserve analytical context across routes, particularly the active source, model, run, filters, selected topic, and selected documents.

### Top navigation

Use `TopNavigation` for:

* current corpus/run selector;
* embedding model selector;
* global search or command palette;
* theme control;
* language and direction control;
* processing-job indicator;
* contextual actions.

### Core explorer

The main Explore workspace should be the product’s central surface.

Use a coordinated three-region layout:

```text
┌──────────────── filters / search / active selection ────────────────┐
│                                                                     │
│  embedding or topic map                       record/topic inspector │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ linked distribution, timeline, keywords, or document table          │
└─────────────────────────────────────────────────────────────────────┘
```

The embedding map should receive the most space. Avoid placing it inside a small generic dashboard card.

Selecting a point, topic, hierarchy node, chart segment, or table row must update the other relevant views. Cross-filtering should be explicit and reversible. Show active filters as removable tokens or a compact filter summary.

Use a right-side `Drawer` or persistent inspector for:

* complete document text;
* automatically detected text direction;
* language and dialect metadata when available;
* source metadata;
* topic membership;
* topic keywords;
* similarity score;
* category or label;
* nearest documents;
* annotation or correction controls;
* copy and export actions.

Use `dir="auto"` on user corpus text. Use appropriate `lang` values such as `ckb`, `ku`, `ar`, and `en` when known.

### Topics workspace

Provide:

* searchable topic list;
* topic hierarchy;
* topic size;
* representative keywords;
* representative documents;
* topic quality indicators where available;
* topic/category distribution;
* merge or rename actions only when backed by a clear persistence model;
* a comparison between selected topics;
* an outlier topic view.

Do not encode topic identity by colour alone. Topic numbers may be stable technical identifiers, but user-facing labels should prioritize understandable keywords or curated names.

### Documents workspace

Implement a virtualized or paginated document table with:

* text preview;
* source;
* topic;
* label;
* language or dialect when available;
* outlier state;
* semantic similarity score when a search is active;
* selectable metadata columns;
* sorting;
* filtering;
* bulk selection;
* export of selected or filtered rows.

Long Kurdish or Arabic text must remain legible. Do not truncate without a clear expansion mechanism.

### Ask Corpus

Use Noor UI’s `PromptComposer` as the search input, adapted for analytical retrieval rather than chat theatre.

The result should clearly distinguish:

* the user’s query;
* matching topics;
* matching documents;
* relative or raw similarity values;
* the active embedding model;
* applied source and metadata filters;
* why the displayed results were retrieved.

Do not generate unsupported narrative answers and present them as corpus facts. The initial implementation should remain retrieval-centred unless a grounded RAG answer-generation layer already exists.

Selecting a result should highlight it on the embedding map and open its inspector.

### Import workflow

Replace the single large Streamlit form with a staged import wizard:

1. Select input method.
2. Inspect schema or text sample.
3. Configure document extraction.
4. Configure normalization.
5. Select embedding and topic settings.
6. Review estimated workload and external-provider implications.
7. Start pipeline.
8. Observe progress.
9. Open the completed run.

Use Noor `FileUpload`, `FormField`, `Select`, `Checkbox`, `Slider`, `Alert`, `Progress`, and `ResearchProgress` components.

The server-path option must be available only in explicitly configured local or trusted deployments. Never expose arbitrary server filesystem access in a public deployment. Validate and constrain permitted paths.

For hosted embedding providers, show:

* provider name;
* model;
* estimated document or token volume when available;
* privacy warning;
* potential cost warning;
* explicit acknowledgement before transmission.

### Runs and evaluation

Treat each pipeline run as a reproducible analytical object.

Show:

* source;
* embedding model;
* normalization configuration;
* clustering parameters;
* document count;
* topic count;
* outlier count;
* fitting time;
* coherence metrics;
* creation time;
* run status;
* artifact availability.

Provide model comparison using aligned measures. Clearly explain when metrics are not directly comparable.

Avoid decorative “AI score” gauges. Use tables, confidence intervals where available, distributions, and direct metric definitions.

## Noor UI requirements

Use:

* `ThemeProvider`
* `DirectionProvider`
* `ThemeToggle`
* `Sidebar`
* `SidebarItem`
* `TopNavigation`
* `CommandPalette`
* `SearchInput`
* `Select`
* `SegmentedControl`
* `Tabs`
* `StatCard`
* `Table`
* `Drawer`
* `Dialog`
* `FileUpload`
* `Progress`
* `Alert`
* `Badge`
* `Skeleton`
* `EmptyState`
* `ErrorState`
* `Tooltip`
* `PromptComposer`
* `ResearchProgress`

Use Noor semantic tokens exclusively for application chrome and components.

Do not introduce raw hex colours throughout React components. If charts require colours, create a centralized chart-token adapter derived from Noor semantic tokens, for example:

```text
--kdx-chart-background
--kdx-chart-grid
--kdx-chart-axis
--kdx-chart-selection
--kdx-chart-muted-point
--kdx-chart-topic-1 ... --kdx-chart-topic-n
--kdx-chart-success
--kdx-chart-warning
--kdx-chart-danger
```

Ensure charts update when the Noor theme changes.

Follow Noor’s principles:

* restraint over decoration;
* tonal hierarchy rather than heavy shadows;
* meaningful colour rather than decorative colour;
* modest radii rather than pills everywhere;
* semantic tokens;
* logical CSS properties;
* accessible primitives;
* generous Arabic-script line height;
* no gradients, glassmorphism, oversized shadows, or generic SaaS card walls.

Do not modify Noor UI merely to solve an application-specific layout issue. Extend Noor only when a missing component is broadly reusable and belongs in the design system.

## RTL and multilingual behavior

RTL support is a functional requirement, not a cosmetic mirror.

Test at minimum:

* full English LTR interface;
* full Sorani Kurdish RTL interface;
* full Arabic RTL interface;
* LTR interface containing RTL documents;
* RTL interface containing English metadata;
* mixed Kurdish-English text;
* long Arabic-script labels;
* numeric metrics inside RTL layouts;
* charts whose axes must remain mathematically coherent;
* tables with mixed-direction cells;
* drawers, menus, pagination, breadcrumbs, and directional icons.

Use CSS logical properties. Do not use fixed `left` and `right` positioning when `start` and `end` are appropriate.

The embedding coordinate system must not be mirrored merely because the interface is RTL. Directional navigation and surrounding layout may mirror; scientific coordinates must remain stable.

## Visualization principles

Every visualization must answer a defined analytical question.

Before implementing each chart, document:

* the user question;
* the encoded variables;
* the interaction;
* the linked views it affects;
* the empty state;
* the large-data strategy;
* the accessibility fallback.

Avoid:

* redundant pie charts;
* excessive legends;
* arbitrary pastel colours;
* charts that duplicate table values;
* unreadable labels;
* plotting every point when aggregation is more meaningful;
* treating UMAP distances as globally metric;
* implying cluster certainty where none exists.

Include explanatory tooltips or inline documentation clarifying that a two-dimensional projection is an approximation of the higher-dimensional embedding space.

## Performance and scaling

Respect the repository’s goal of supporting corpora substantially larger than the current demonstration datasets.

Implement:

* server-side pagination;
* server-side metadata filtering;
* point sampling or aggregation;
* lazy document loading;
* cached analytical queries;
* cancellation-safe client requests;
* debounced search;
* URL-serializable filters where practical;
* loading skeletons;
* explicit empty and error states;
* no automatic re-fitting during navigation;
* no transfer of full embedding matrices to the browser;
* no loading the full documents Parquet file for every request.

Evaluate DuckDB and Arrow for querying artifacts without fully materializing them in memory.

Keep the current saved-artifact format compatible unless a migration is documented and tested.

## State and frontend engineering

Use typed, feature-oriented code.

Recommended supporting libraries may include:

* TanStack Query for server state;
* TanStack Table for advanced data-table behavior if Noor’s `Table` primitive is used as the visual layer;
* Zod for runtime API validation;
* Plotly React or Embedding Atlas for scientific visualization;
* Vitest and React Testing Library;
* Playwright for end-to-end tests.

Do not add dependencies without documenting why they are necessary.

Distinguish:

* server state;
* persistent application preferences;
* URL/query state;
* transient UI state;
* analytical selection state.

Avoid one monolithic dashboard component.

## Accessibility

Meet WCAG 2.2 AA.

Require:

* keyboard access to all controls;
* visible focus;
* labelled icon buttons;
* semantic headings;
* ARIA labels for visualizations;
* text alternatives or tabular summaries for important charts;
* reduced-motion support;
* sufficient contrast;
* non-colour status encoding;
* accessible dialogs and drawers;
* sensible focus restoration;
* screen-reader announcements for pipeline state changes;
* no clipping of Kurdish or Arabic diacritics.

## Implementation sequence

Proceed in the following order.

### Phase 1: audit

Before writing implementation code:

1. Inspect both repositories.
2. Run the existing tests.
3. Launch the Streamlit application if artifacts are available.
4. Record all current user workflows.
5. Inspect the external references.
6. Produce:

   * `docs/UI_REFERENCE_ANALYSIS.md`
   * `docs/UI_INFORMATION_ARCHITECTURE.md`
   * `docs/REACT_MIGRATION_PLAN.md`
   * proposed API schemas
   * a file-level implementation plan.

Do not stop after producing the plan unless blocked by missing repository access or an unrecoverable environment problem.

### Phase 2: vertical slice

Implement one complete workflow:

```text
select source and model
→ load run summary
→ display embedding map
→ select a point
→ inspect document
→ perform semantic search
→ highlight matching documents
```

Use real repository artifacts, not permanent mock data.

### Phase 3: functional parity

Implement:

* topic hierarchy;
* topic inspection;
* document table;
* evaluation;
* upload configuration;
* model fitting;
* progress events;
* provider warnings;
* source provenance.

### Phase 4: review and curation

Add a persistence-backed review workflow only after the explorer is stable. Do not create correction buttons that lose state after refresh.

### Phase 5: validation

Validate:

* LTR and RTL;
* light and dark themes;
* keyboard navigation;
* mixed-direction content;
* empty corpora;
* missing artifacts;
* unavailable models;
* failed pipelines;
* large point sets;
* long documents;
* responsive desktop and tablet layouts.

## Acceptance criteria

The transformation is complete only when:

* all important Streamlit workflows have React equivalents;
* the Python NLP pipeline remains the source of truth;
* existing model and pipeline tests still pass;
* API contracts are typed and documented;
* navigation does not trigger model fitting;
* topic, document, search, and map selections are coordinated;
* a selected document can be located across map, table, topic, and search views;
* light and dark modes are visually coherent;
* English, Kurdish, and Arabic layouts function correctly;
* mixed-direction text renders correctly;
* charts use centralized theme-derived tokens;
* no full corpus or embedding matrix is sent to the browser unnecessarily;
* large datasets use sampling, pagination, aggregation, or virtualization;
* external-provider use requires explicit disclosure;
* the interface does not imply unsupported NLP capabilities;
* no source project’s branding or visual identity has been copied;
* documentation explains the architecture and migration;
* the old Streamlit frontend remains available until parity is verified.

## Required deliverables

Produce:

1. the React frontend;
2. the typed Python API;
3. API schemas and generated or synchronized TypeScript types;
4. Noor UI integration;
5. theme-aware visualization adapters;
6. RTL and multilingual support;
7. automated frontend, API, and end-to-end tests;
8. `docs/UI_REFERENCE_ANALYSIS.md`;
9. `docs/UI_INFORMATION_ARCHITECTURE.md`;
10. `docs/REACT_MIGRATION_PLAN.md`;
11. `docs/API.md`;
12. updated root `README.md`;
13. local development and production run instructions;
14. screenshots of the principal LTR, RTL, light, and dark states;
15. a final parity checklist mapping every former Streamlit workflow to its replacement.

## Working constraints

* Inspect before modifying.
* Preserve working ML behavior.
* Prefer incremental migration over wholesale replacement.
* Do not hide incomplete features behind polished mockups.
* Do not fabricate corpus metadata, NLP results, or evaluation values.
* Do not introduce an LLM chatbot unless its answers are explicitly grounded in retrieved corpus records.
* Do not make the interface look like a generic admin template.
* Do not turn every metric or section into an isolated card.
* Do not use visual decoration to compensate for weak information architecture.
* Keep scientific representations accurate and explain their limitations.
* Make justified implementation decisions and document significant trade-offs.

Begin by auditing the two repositories and producing a concise current-state summary, risk assessment, source-reference analysis, and file-level migration plan. Then implement the vertical slice and continue toward functional parity.