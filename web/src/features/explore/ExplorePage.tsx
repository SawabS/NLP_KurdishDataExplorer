import { useState, type ReactNode } from "react";
import { ChartNoAxesCombined, GitBranch, Map as MapIcon, Menu, Search } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Badge, Breadcrumbs, Button, Drawer, ErrorState, Skeleton, StatCard, TabsContent, TabsList, TabsRoot, TabsTrigger, Tooltip, Typography } from "noor-ui";
import { usePrefetchWorkspace, useRun, useSources } from "../../api/hooks";
import { useLocale } from "../../lib/i18n";
import { compactModelLabel, compactSourceLabel } from "../../lib/labels";
import { CorpusContext } from "./CorpusContext";
import { FitRequired } from "./FitRequired";
import { EvaluateView } from "./evaluate/EvaluateView";
import { MapView } from "./map/MapView";
import { SearchView } from "./search/SearchView";
import { StructureView } from "./structure/StructureView";

export function ExplorePage() {
  const {source = "", model = "", tab = "tree"} = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [contextOpen, setContextOpen] = useState(false);
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
    {value: "ask", label: t("tabSearch"), icon: Search},
    {value: "model", label: t("tabEvaluate"), icon: ChartNoAxesCombined},
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
      onModelChange={(value) => { go(source, value); setContextOpen(false); }}
      onCategoryChange={(value) => {
        const next = new URLSearchParams(params);
        value === "(all)" ? next.delete("category") : next.set("category", value);
        setParams(next);
      }}
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
  } else if (activeTab === "ask") {
    content = <SearchView source={source} model={model} params={params} setParams={setParams} />;
  } else if (activeTab === "model") {
    content = <EvaluateView source={source} model={model} />;
  } else {
    content = <StructureView source={source} model={model} category={category} params={params} setParams={setParams} />;
  }

  return (
    <div className="flex h-full min-w-0">
      <aside className="hidden w-[312px] shrink-0 overflow-y-auto border-e border-border bg-surface lg:block">{context}</aside>
      <TabsRoot value={activeTab} onValueChange={(value) => go(source, model, value)} className="flex min-w-0 flex-1 flex-col overflow-hidden" activationMode="manual">
        <div className="shrink-0 border-b border-border bg-canvas px-4 pt-4 md:px-6 md:pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Breadcrumbs items={[
                {label: t("corpus")},
                {label: compactSourceLabel(sourceInfo.title)},
                {label: modelInfo ? compactModelLabel(modelInfo.key, modelInfo.label) : ""},
              ]} />
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <Typography variant="heading-md" className="truncate">{sourceInfo.title}</Typography>
                {sourceInfo.has_labels && <Badge variant="info">{t("labeled")}</Badge>}
              </div>
            </div>
            <Drawer
              open={contextOpen}
              onOpenChange={setContextOpen}
              side="start"
              title="Corpus context"
              trigger={<Button className="lg:hidden" size="sm" variant="outline"><Menu className="size-4" /> Context</Button>}
            >
              {context}
            </Drawer>
          </div>

          {run.data && (
            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard className="gap-1 p-3" label={t("documents")} value={<span className="text-heading-sm tabular-nums">{run.data.n_docs.toLocaleString()}</span>} />
              <StatCard className="gap-1 p-3" label={t("topics")} value={<span className="text-heading-sm tabular-nums">{run.data.n_topics.toLocaleString()}</span>} />
              <Tooltip content={t("outliersHint")}>
                <StatCard className="gap-1 p-3" label={t("outliers")} value={<span className="text-heading-sm tabular-nums">{run.data.n_outliers.toLocaleString()}</span>} />
              </Tooltip>
              <Tooltip content={t("npmiHint")}>
                <StatCard className="gap-1 p-3" label="NPMI" value={<span className="text-heading-sm tabular-nums">{run.data.coherence_npmi.BERTopic?.toFixed(3) ?? "n/a"}</span>} />
              </Tooltip>
            </div>
          )}

          <TabsList className="mt-4 gap-1 overflow-x-auto border-b-0" aria-label="Explorer workspaces">
            {workspaces.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="gap-1.5 px-2.5 py-3 data-[state=active]:border-primary-action sm:gap-2 sm:px-3"
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
          <TabsContent key={item.value} value={item.value} className="min-h-0 flex-1 overflow-y-auto bg-canvas pt-0">
            {item.value === activeTab ? content : null}
          </TabsContent>
        ))}
      </TabsRoot>
    </div>
  );
}

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
