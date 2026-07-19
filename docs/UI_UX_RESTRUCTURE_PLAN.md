# UI/UX Review & Restructure Plan — Kurdish Data Explorer web app

Scope: `web/src/**` (React 18 + Vite + TanStack Query + Plotly), adhering strictly to
`raw/sources/noor-ui` (Noor Design System). Review done against `DESIGN_SYSTEM.md`,
`docs/tokens.md`, `docs/accessibility.md`, `docs/rtl-multilingual.md`, and the actual
component source in `raw/sources/noor-ui/src/components/`.

Overall verdict: the app is already noor-ui-native in structure (providers, tokens CSS,
tailwind preset, logical properties, `Drawer side="start"`). The problems are a handful of
real bugs, hand-rolled duplicates of noor-ui components, hardcoded chart colors that break
dark mode and the "semantic tokens only" principle, an LTR-pinned shell for an RTL-first
corpus, and async/loading patterns that are close-but-not-quite best practice.

---

## 1. Findings

### 1.1 Bugs (fix first — Phase 0)

| # | Finding | Where | Impact |
|---|---------|-------|--------|
| B1 | **`accent-primary` is not a noor-ui token.** The tailwind preset (`raw/sources/noor-ui/tailwind.config.ts`) defines `canvas, surface*, text-*, border*, primary-action, focus-ring, success/warning/danger/info` — no `accent`. All 13 uses of `text-accent-primary` / `bg-accent-primary(/10|/30)` across 7 files compile to **no CSS at all**. | `ExplorePage` (active-tab underline), `AskTab` (selected-result tint, match bars), `TopicInspector` (top-keyword chips), `MapTab`, `TreeTab`, `ModelTab`, `UploadPage` (icon accents, step "01" chip) | Active workspace tab has an invisible indicator; selected search result has no background; top keywords look identical to the rest. Silent visual failure in both themes. |
| B2 | **`useJob`'s `meta.onDone` never fires.** TanStack Query `meta` is inert unless a global cache subscriber reads it; none exists. Completion invalidation only works because `ExplorePage`/`UploadPage` duplicate it in `useEffect`s. | `web/src/api/hooks.ts` | Dead code masking a single-source-of-truth gap for job completion side effects. |
| B3 | **`fetch` ignores TanStack Query's `AbortSignal`.** `request()` never forwards `signal`, so switching source/model/tab mid-flight leaves stale requests running (points endpoint can be large). | `web/src/api/client.ts` | Wasted bandwidth, potential race where a slow stale response is cached. |
| B4 | **Topic color encoding is inconsistent across views.** Tree colors leaves by category / hashed id; Map colors by `PASTELS[topic % 8]`. The same topic gets different colors in Structure vs Map, and 8 pastels over N topics guarantees collisions. | `TreeTab.tsx`, `MapTab.tsx`, `usePlotlyTheme.ts` | Breaks the core visual contract of a linked-view explorer. |

### 1.2 Design-system violations

| # | Finding | Noor principle violated |
|---|---------|------------------------|
| V1 | Hardcoded hex in chart code: `PASTELS` array, heatmap colorscale `#f2f6fc/#8fb8e8/#31629e` (TreeTab), highlight `#e06c5f`/`#98a1ad` (MapTab), NPMI bars `#5a91c8/#78b79a/#e09868` cycled by `index % 3` (ModelTab). Same values in dark mode → low contrast; heatmap low end is near-invisible on dark canvas. | "Semantic tokens only" (principle 5); dark mode support |
| V2 | Hand-rolled workspace tabs (`ExplorePage` nav of raw `<button>`s + underline span) instead of noor-ui `Tabs` (Radix: `role="tablist"`, arrow-key traversal, RTL mirroring). | Accessible-by-construction (principle 7) |
| V3 | Hand-rolled nav rail + mobile bottom bar in `AppShell` instead of `Sidebar`/`SidebarItem` (+ `sidebar` color token, currently unused). | Component reuse; sidebar token |
| V4 | Hand-rolled stat strip (`MetricStrip`), definition lists (`CorpusContext` "Active artifact", `ModelTab` dossier) instead of `StatCard` / `DataList`. | Component reuse |
| V5 | Hand-rolled mini progress bars (AskTab match bars), example-query chips, keyword chips — `Progress`/`Badge`/`SuggestedPrompt` exist. Custom chips/buttons also lack the standard `focus-visible:ring-2 ring-focus-ring` treatment. | Component reuse; visible focus (a11y baseline) |
| V6 | NPMI bar color cycles by index, not by meaning (BERTopic vs baseline kind is in `customdata` but not encoded visually). | "Color communicates state, never decoration" |

### 1.3 RTL / multilingual

- `DirectionProvider direction="ltr"` and `AppShell dir="ltr"` are hard-pinned. Noor is
  RTL-first and ships `isRtlLocale` (`"ckb"` → true). A Sorani-corpus tool with no RTL UI
  mode is the single biggest UX gap. Corpus text itself is handled well
  (`dir="auto" lang="ckb"`, `.corpus-text` with Noto Sans Arabic, 1.8 line-height — keep).
- Logical properties are used correctly almost everywhere (`ms-/me-/border-e/side="start"`) —
  audit confirms only chart margins and Plotly legends need RTL attention.
- No UI locale switch (en/ckb) and no strings extraction; all labels are hardcoded English.

### 1.4 Accessibility

- Workspace tabs: `aria-current` on buttons instead of real tab semantics (fixed by V2).
- Charts are canvas-only with no text alternative: Map and the coherence/distribution charts
  have no data-table fallback (Tree has the Topic index table — good pattern to extend).
- Map topic highlight is color-only (`#e06c5f` vs grey) — needs size/opacity + a visible
  "n matching docs" count (color-never-the-only-signal rule).
- AskTab match bars carry no accessible value; ranked-topic result buttons have no
  `aria-pressed`/selected semantics.
- "Outliers" and "NPMI" metrics are unexplained jargon — add `Tooltip` definitions.
- Icon-only nav buttons do have `aria-label`s and `Tooltip`s — good; keep.

### 1.5 IA / UX

- Naming drift: routes say `tree/map/ask/model`, tab labels say Structure/Map/Search/Eval,
  nav says "Ingest", page header says "Build an analysis run", README says "Upload &
  explore". Pick one vocabulary (recommended: **Structure / Map / Search / Evaluate** and
  **Upload**; keep route slugs stable for shareable URLs).
- Deep state is mostly in the URL (good: `layout`, `depth`, `topic`, `q`, `colorBy`,
  `maxPoints`) but AskTab's selected result is component state → lost on share/refresh.
- No global job visibility: a fit started on Upload is invisible from Explore (and vice
  versa) unless you know to reattach. No `Toast` on completion/failure.
- No landing overview: `/` silently redirects into the first source's tree. A minimal corpus
  overview (StatCards per source + last-fit info) would orient new users.
- Header breadcrumb row is hand-rolled; `Breadcrumbs` exists. `CommandPalette` exists and is
  a perfect fit for source/model/topic jumping (`⌘K`).
- Loading skeletons are generic gray blocks that don't match target layout (content jumps).

### 1.6 Core functions & loading states (embedding pipeline UX)

- `useSearch` is a **mutation**, so results aren't cached per query, can't be refetched, and
  the `useEffect` re-firing on `initial` is fragile (double-fire risk under StrictMode).
  Should be `useQuery({queryKey: ["search", s, m, q], enabled: !!q})` — URL-driven, cached,
  abortable, back/forward works.
- `useJob` polls at 1s fixed; fine, but completion invalidation is duplicated (B2) and
  `client.invalidateQueries()` with no filter nukes the whole cache (refetches points/tree
  for unrelated sources). Invalidate by source/model keys.
- First-query embedding warmup (10–30 s) is communicated only inside AskTab. `Progress`
  with `value={null}` renders indeterminate — verify against noor-ui `Progress` API and
  pair with `aria-live="polite"` status text (noor a11y doc requires live regions for async).
- No `staleTime`/`gcTime` tuning per endpoint: artifact-derived data (tree, topics, points,
  coherence) is immutable per (source, model) until a refit → `staleTime: Infinity` and
  invalidate on job completion. Sources/models/jobs stay short-lived.
- No prefetching: hovering/selecting a workspace tab could `prefetchQuery` its data.
- No app-level React ErrorBoundary; a render error white-screens the shell.

---

## 2. Target structure

```
web/src/
  app/                 App.tsx, routes.tsx, ErrorBoundary.tsx, providers.tsx (from main.tsx)
  layout/              AppShell.tsx (noor Sidebar + mobile bar), PageHeader.tsx (Breadcrumbs + StatCard strip)
  features/
    explore/           ExplorePage.tsx (thin router/layout only)
      structure/       StructureView.tsx, TopicInspector.tsx, DistributionPanel.tsx, TopicIndexTable.tsx
      map/             MapView.tsx, MapLegend.tsx
      search/          SearchView.tsx, ResultList.tsx, ResultDetail.tsx
      evaluate/        EvaluateView.tsx, ModelDossier.tsx, BaselineTable.tsx
      FitRequired.tsx, JobProgress.tsx (shared with upload)
    upload/            UploadPage.tsx, SourceStep.tsx, RulesStep.tsx, ModelStep.tsx
  charts/              Plot.tsx, usePlotlyTheme.ts, palette.ts (single topic→color authority)
  api/                 client.ts, hooks.ts, types.ts (unchanged home)
  lib/                 labels.ts (compactModelLabel — currently duplicated), format.ts, urlState.ts
```

Rules: every view ≤ ~150 lines, one exported component per file, shared types imported from
`api/types.ts` (ExplorePage currently re-declares `SourceInfo`), zero hex literals outside
`charts/palette.ts`.

---

## 3. Phased plan

### Phase 0 — Bug fixes & baseline (no visual redesign)
1. **B1**: replace all `accent-primary` classes with real tokens: active-tab underline →
   `bg-primary-action`; selected tints → `bg-info-bg`; icon accents → `text-text-secondary`
   (Noor: color is for state, not decoration — most of these accents should simply go quiet).
2. **B2/B3**: forward `signal` through `request()`; delete dead `meta.onDone`; centralize job
   completion in one place (see Phase 4) with scoped invalidation.
3. Dedupe `compactModelLabel` into `lib/labels.ts`; import `SourceInfo` from `api/types.ts`.
4. Add `app/ErrorBoundary.tsx` (renders noor `ErrorState`) around routes.
5. Baseline captures: screenshots (light/dark × ltr) of all 5 views + `tsc --noEmit` green.

Acceptance: visible active tab and selected search result in both themes; no `accent-primary`
match in `web/src`; typecheck green.

### Phase 1 — Chart & color system (Visual-Data-Science core)
1. Create `charts/palette.ts`:
   - **Categorical**: 10–12 colorblind-safe colors (Okabe-Ito extended), defined as light/dark
     pairs and exposed through the Plotly theme (which already reads `--n-*` CSS vars — extend
     the same mechanism with `--kdx-cat-1…12` defined in `index.css` per theme).
   - **Stable assignment**: one `colorForTopic(topicId)` / `colorForCategory(name)` used by
     *both* Tree and Map (fixes B4). Outlier topic (−1) always gets `text-muted` grey.
   - **Sequential**: heatmap ramp built from tokens (canvas → info) per theme.
   - **Semantic**: highlight = `--n-warning`, dimmed = `--n-border-strong`; NPMI bars colored
     by *kind* (BERTopic = `primary-action` tone, baselines = muted) not by index (V6).
2. Map legend: when `colorBy=topic`, show a top-N-topics legend chip row (`MapLegend.tsx`)
   with counts; click-to-highlight syncs `?topic=` (linked with Structure/Search).
3. Dark-mode audit of every trace/hover/colorbar; hoverlabels already tokenized — keep.

Acceptance: same topic = same color in Structure and Map; all charts legible in dark mode;
`grep -rn "#[0-9a-f]\{6\}" web/src` matches only `charts/palette.ts`.

### Phase 2 — Shell, navigation, IA
1. Rebuild `AppShell` on noor `Sidebar`/`SidebarItem` (+ `bg-sidebar` token); keep 72px rail
   look and mobile bottom bar, but derive both from one nav config.
2. Replace hand-rolled workspace tabs with noor `Tabs` (V2); labels **Structure / Map /
   Search / Evaluate**; rename nav "Ingest" → "Upload"; align page copy.
3. Replace header caption row with `Breadcrumbs` (Corpus / source / model); `MetricStrip` →
   4 compact `StatCard`s with `Tooltip` definitions for Outliers and NPMI.
4. Add `CommandPalette` (⌘K): jump to source, model, workspace, or topic by id/keyword.
5. Optional (recommended): `/` renders a small overview page (per-source StatCards + fitted
   models + "last fit" from run meta) instead of a blind redirect.

Acceptance: keyboard arrow-keys traverse tabs; axe scan of shell has no violations; one
vocabulary everywhere.

### Phase 3 — View restructure (per workspace)
1. **Structure**: split into `StructureView` + `DistributionPanel` + `TopicIndexTable`;
   `CorpusContext` dl → `DataList`; keyword chips → `Badge` (top-3 `variant="info"`);
   chart click also scrolls/updates inspector with a visible selected state.
2. **Search**: mutation → URL-driven query (`?q=`, `?sel=` for selected result — fixes lost
   state); example chips → `SuggestedPrompt`; match bars → `Progress` with accessible label;
   result buttons get selected semantics + focus ring; warmup state gets `aria-live` text.
3. **Map**: extract `MapLegend`; highlight uses size+opacity+color and a `Badge` count of
   matched docs; add "Clear highlight"; keep `scattergl` + point budget slider (good).
4. **Evaluate**: dossier dl → `DataList`; NPMI chart recolored by kind with in-chart legend;
   add a small "what is NPMI" `Tooltip`; baseline table unchanged (already noor `Table`).
5. **Upload**: keep the strong 01/02/03 stepper; swap step chips to tokens (B1); move job
   progress into shared `JobProgress.tsx`; disabled-submit reasons surfaced via helper text
   ("select a text column", "acknowledge cost") instead of a silently disabled button.

Acceptance: every view renders from `features/*`; shared URL reproduces exact view state
(including selected search result); no hand-rolled duplicate of an existing noor component.

### Phase 4 — Core-function reliability & loading states
1. **Query tuning** (`api/hooks.ts`): artifact-derived queries get `staleTime: Infinity`;
   `sources`/`models` 30 s; jobs polling unchanged. On job `done`: invalidate only
   `["sources"]`, `["models"]`, and keys scoped to the fitted `(source, model)`.
2. **Global job awareness**: lift active-job polling into a provider; show a small `Spinner`
   + progress chip in the shell whenever any fit is running (clickable → reattach), fire
   noor `Toast` on done/error. Removes the duplicated `useEffect` invalidation (B2).
3. **Abort + races**: `request()` forwards `signal`; points/search become cancel-safe.
4. **Layout-true skeletons**: per-view skeletons that mirror final layout (sidebar column +
   chart block + table rows) to kill content jump; `Suspense` fallback matches shell padding.
5. **Prefetch**: on tab hover/focus, `queryClient.prefetchQuery` that workspace's data.
6. **Warmup honesty**: first search/fit shows staged text ("Loading embedding model… ~30 s"
   → "Encoding query…" → "Ranking topics…") driven by job/endpoint status, in a live region.

Acceptance: switching source/model mid-load cancels stale requests (network tab); job
completion toasts from any page and refetches only affected keys; no spinner-flash on
cached revisits (staleTime working).

### Phase 5 — RTL & localization
1. Locale state (en/ckb) in a provider + `UserMenu`/toggle in the shell;
   `DirectionProvider direction={isRtlLocale(locale) ? "rtl" : "ltr"}`; drop the hardcoded
   `dir="ltr"` on `AppShell`.
2. Extract UI strings to a minimal dictionary (no i18n lib needed at this size); translate
   chrome labels to Sorani.
3. RTL audit pass: Plotly margins/legends, `rtl:rotate-180` on directional icons
   (`ArrowUpRight` in Search), Drawer/Select mirroring (Radix handles it — verify only).
4. Verify Arabic-script type scale: headings use IBM Plex Sans Arabic (already loaded) —
   check no clipping at `heading-md` with diacritics.

Acceptance: full app usable in RTL with no misaligned borders/spacing; direction follows
locale; side-by-side screenshot review light/dark × ltr/rtl.

### Phase 6 — Accessibility & verification
1. Chart text alternatives: "View as table" toggle for Map (top topics + counts) and
   Evaluate charts, mirroring the existing Topic-index pattern.
2. Focus-visible ring on every remaining interactive element; keyboard path through an
   entire session (upload → fit → explore → search → map) with no pointer.
3. axe-core automated scan on all routes (add as a dev script), manual VoiceOver/NVDA smoke
   of tabs, dialog, job progress live region.
4. Regression: `tsc --noEmit`, `npm run build -w web`, Lighthouse (a11y ≥ 95, no CLS from
   skeletons), screenshot diff vs Phase-0 baselines, `graphify update .` after each phase.

---

## 4. Sequencing & risk

- Order is dependency-driven: 0 (correctness) → 1 (palette feeds every later view) → 2
  (shell hosts global job UI) → 3 ∥ 4 (can interleave per view) → 5 → 6.
- Each phase is independently shippable; keep PRs per phase with the Phase-0 screenshot
  baseline as the visual diff anchor.
- Riskiest items: Tabs swap (URL slugs must not change — map `value` to route), search
  mutation→query migration (preserve warmup UX), palette change (expect every chart
  screenshot to diff — that's the point).
- Explicitly out of scope: backend/FastAPI changes (except none needed), Streamlit app,
  pipeline code. `raw/sources/noor-ui` is consumed as-is — any missing primitive is solved
  with tokens in the app layer, never by forking noor-ui.
