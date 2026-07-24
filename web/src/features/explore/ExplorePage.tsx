import { forwardRef, useEffect, useState, type HTMLAttributes, type ReactNode } from "react";
import { ChartNoAxesCombined, ChevronDown, GitBranch, Map as MapIcon, Menu, Rows3, Search } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Badge, Breadcrumbs, Button, Drawer, ErrorState, IconButton, Skeleton, TabsContent, TabsList, TabsRoot, TabsTrigger, Tooltip, Typography } from "noor-ui";
import { usePrefetchWorkspace, useRun, useSources } from "../../api/hooks";
import { useWorkspacePanel } from "../../layout/WorkspacePanel";
import { useLocale } from "../../lib/i18n";
import { compactSourceLabel } from "../../lib/labels";
import { CorpusContext } from "./CorpusContext";
import { FitRequired } from "./FitRequired";
import { DocumentsView } from "./documents/DocumentsView";
import { InsightsView } from "./insights/InsightsView";
import { MapView } from "./map/MapView";
import { SearchView } from "./search/SearchView";
import { StructureView } from "./structure/StructureView";

const STATS_KEY = "kurdish-data-explorer-stats-open";

export function ExplorePage() {
  const {source = "", model = "", tab = "tree"} = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [contextOpen, setContextOpen] = useState(false);
  const panel = useWorkspacePanel();
  const [statsOpen, setStatsOpen] = useState<boolean>(() => localStorage.getItem(STATS_KEY) !== "false");
  useEffect(() => { localStorage.setItem(STATS_KEY, String(statsOpen)); }, [statsOpen]);
  const { t } = useLocale();
  const sources = useSources();
  const prefetch = usePrefetchWorkspace(source, model);
  const sourceInfo = sources.data?.find((item) => item.source === source);
  const modelInfo = sourceInfo?.models.find((item) => item.key === model);
  const run = useRun(source, model, Boolean(modelInfo?.fitted));
  const category = params.get("category") ?? "(all)";

  // Route slugs are stable shareable URLs; labels are localized separately.
  const workspaces = [
    {value: "tree", label: t("tabStructure"), icon: GitBranch},
    {value: "map", label: t("tabMap"), icon: MapIcon},
    {value: "documents", label: t("tabDocuments"), icon: Rows3},
    {value: "ask", label: t("tabSearch"), icon: Search},
    {value: "insights", label: t("tabInsights"), icon: ChartNoAxesCombined},
  ];
  const activeTab = workspaces.some((item) => item.value === tab) ? tab : "tree";

  const go = (nextSource: string, nextModel: string, nextTab = activeTab) => navigate(`/explore/${encodeURIComponent(nextSource)}/${encodeURIComponent(nextModel)}/${nextTab}`);
  if (sources.isLoading) return <LoadingPage />;
  if (sources.isError) return <ErrorState heading="Could not load the explorer" description={sources.error.message} onRetry={() => sources.refetch()} />;
  if (!sourceInfo) return <ErrorState heading="Source not found" description="This source may have been removed or renamed." />;

  const context = (
    <CorpusContext
      source={source}
      model={model}
      category={category}
      sourceInfo={sourceInfo}
      sources={sources.data!}
      run={run.data}
      onSourceChange={(value) => {
        const next = sources.data!.find((item) => item.source === value)!;
        go(value, next.models.find((item) => item.fitted)?.key ?? next.models[0].key);
        setContextOpen(false);
      }}
      onModelChange={(value) => go(source, value)}
      onCategoryChange={(value) => {
        const next = new URLSearchParams(params);
        value === "(all)" ? next.delete("category") : next.set("category", value);
        setParams(next);
      }}
      onDeleted={() => navigate("/")}
    />
  );

  let content: ReactNode;
  if (!modelInfo?.fitted) {
    content = <FitRequired source={source} model={model} referenceModel={sourceInfo.models.find((item) => item.fitted)?.key} />;
  } else if (run.isLoading) {
    content = <LoadingPage />;
  } else if (run.isError) {
    content = <ErrorState heading="Could not load this run" description={run.error.message} onRetry={() => run.refetch()} />;
  } else if (!run.data) {
    content = null;
  } else if (activeTab === "map") {
    content = <MapView source={source} model={model} category={category} params={params} setParams={setParams} />;
  } else if (activeTab === "documents") {
    content = <DocumentsView source={source} model={model} category={category} params={params} setParams={setParams} />;
  } else if (activeTab === "ask") {
    content = <SearchView source={source} model={model} params={params} setParams={setParams} />;
  } else if (activeTab === "insights") {
    content = <InsightsView source={source} model={model} sourceInfo={sourceInfo} run={run.data} />;
  } else {
    content = <StructureView source={source} model={model} category={category} params={params} setParams={setParams} />;
  }

  const clustered = run.data ? run.data.n_docs - run.data.n_outliers : 0;
  const coverage = run.data && run.data.n_docs > 0 ? Math.round((clustered / run.data.n_docs) * 100) : 0;

  return (
    <div className="flex min-h-full min-w-0">
      {/* Corpus panel — collapsed via the rail toggle to free visualization width. */}
      {panel.open && <aside className="hidden w-[288px] shrink-0 overflow-y-auto bg-surface lg:block">{context}</aside>}
      <TabsRoot value={activeTab} onValueChange={(value) => go(source, model, value)} className="flex min-w-0 flex-1 flex-col bg-canvas" activationMode="manual">
        <div className="shrink-0 px-4 pt-4 md:px-6 md:pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Breadcrumbs items={[
                {label: t("corpus")},
                {label: compactSourceLabel(sourceInfo.title)},
              ]} />
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <Typography variant="heading-md" className="truncate">{sourceInfo.title}</Typography>
                {sourceInfo.has_labels && <Badge variant="info">{t("labeled")}</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {run.data && (
                <Tooltip content={statsOpen ? t("collapse") : t("expand")}>
                  <IconButton
                    aria-label={statsOpen ? t("collapse") : t("expand")}
                    aria-expanded={statsOpen}
                    variant="ghost"
                    size="sm"
                    className="hidden sm:inline-flex"
                    onClick={() => setStatsOpen((open) => !open)}
                  >
                    <ChevronDown className={`size-4 transition-transform ${statsOpen ? "" : "-rotate-90"}`} />
                  </IconButton>
                </Tooltip>
              )}
              <Drawer
                open={contextOpen}
                onOpenChange={setContextOpen}
                side="start"
                title={t("corpus")}
                trigger={<Button className="lg:hidden" size="sm" variant="outline"><Menu className="size-4" /> {t("corpus")}</Button>}
              >
                {context}
              </Drawer>
            </div>
          </div>

          {run.data && statsOpen && (
            <div className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
              <Metric label={t("documents")} value={run.data.n_docs.toLocaleString()} />
              <Metric label={t("topics")} value={run.data.n_topics.toLocaleString()} />
              <Tooltip content={t("outliersHint")}><Metric label={t("coverage")} value={`${coverage}%`} /></Tooltip>
              <Metric label={t("categories")} value={sourceInfo.has_labels ? sourceInfo.categories.length.toLocaleString() : "—"} />
            </div>
          )}

          <TabsList className="mt-4 gap-1 overflow-x-auto border-b-0" aria-label="Explorer workspaces">
            {workspaces.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="gap-2 px-3.5 py-3 text-body-sm font-medium data-[state=active]:border-primary-action data-[state=active]:text-text-primary sm:px-4"
                  onMouseEnter={() => prefetch(item.value)}
                  onFocus={() => prefetch(item.value)}
                >
                  <Icon className="size-4" />{item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
        {workspaces.map((item) => (
          <TabsContent key={item.value} value={item.value} className="min-h-0 flex-1 bg-canvas pt-0">
            {item.value === activeTab ? content : null}
          </TabsContent>
        ))}
      </TabsRoot>
    </div>
  );
}

/** Borderless metric — clean number over a muted label, no boxes. forwardRef so
 *  it can be a Tooltip trigger (Radix asChild passes a ref). */
const Metric = forwardRef<HTMLDivElement, {label: string; value: string} & HTMLAttributes<HTMLDivElement>>(
  ({label, value, ...props}, ref) => (
    <div ref={ref} {...props}>
      <p className="text-caption text-text-muted">{label}</p>
      <p className="mt-0.5 text-heading-sm font-semibold tabular-nums">{value}</p>
    </div>
  ),
);
Metric.displayName = "Metric";

/** Layout-true skeleton: header band + stat cards + chart block, so content doesn't jump. */
function LoadingPage() {
  return (
    <div className="w-full p-4 md:p-6">
      <Skeleton className="h-5 w-56" />
      <Skeleton className="mt-2 h-8 w-96 max-w-full" />
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
      </div>
      <Skeleton className="mt-6 h-[420px] w-full" />
    </div>
  );
}
