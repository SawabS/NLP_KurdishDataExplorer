import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChartNoAxesCombined, Database, GitBranch, Map, Menu, Search, Sparkles } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Alert, Badge, Button, Checkbox, Dialog, Drawer, ErrorState, FormField, Progress, Select, Skeleton, Typography } from "noor-ui";
import { api } from "../../api/client";
import { useJob, useModels, useRun, useSources } from "../../api/hooks";
import { AskTab } from "./AskTab";
import { MapTab } from "./MapTab";
import { ModelTab } from "./ModelTab";
import { TreeTab } from "./TreeTab";

const WORKSPACES = [
  {value: "tree", label: "Structure", icon: GitBranch},
  {value: "map", label: "Map", icon: Map},
  {value: "ask", label: "Search", icon: Search},
  {value: "model", label: "Eval", icon: ChartNoAxesCombined},
];

export function ExplorePage() {
  const {source = "", model = "", tab = "tree"} = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [contextOpen, setContextOpen] = useState(false);
  const sources = useSources();
  const sourceInfo = sources.data?.find((item) => item.source === source);
  const modelInfo = sourceInfo?.models.find((item) => item.key === model);
  const run = useRun(source, model, Boolean(modelInfo?.fitted));
  const category = params.get("category") ?? "(all)";
  const activeTab = WORKSPACES.some((item) => item.value === tab) ? tab : "tree";

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
    content = <MapTab source={source} model={model} category={category} params={params} setParams={setParams} />;
  } else if (activeTab === "ask") {
    content = <AskTab source={source} model={model} params={params} setParams={setParams} />;
  } else if (activeTab === "model") {
    content = <ModelTab source={source} model={model} />;
  } else {
    content = <TreeTab source={source} model={model} category={category} params={params} setParams={setParams} />;
  }

  return (
    <div className="flex h-full min-w-0">
      <aside className="hidden w-[312px] shrink-0 overflow-y-auto border-e border-border bg-surface lg:block">{context}</aside>
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border bg-canvas px-4 pt-4 md:px-6 md:pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-caption text-text-muted"><Database className="size-3.5" /><span>Corpus</span><span>/</span><span>{modelInfo ? compactModelLabel(modelInfo.key, modelInfo.label) : ""}</span></div>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <Typography variant="heading-md" className="truncate">{sourceInfo.title}</Typography>
                {sourceInfo.has_labels && <Badge variant="info">Labeled</Badge>}
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

          {run.data && <MetricStrip values={[
            {label: "Documents", value: run.data.n_docs.toLocaleString()},
            {label: "Topics", value: run.data.n_topics.toLocaleString()},
            {label: "Outliers", value: run.data.n_outliers.toLocaleString()},
            {label: "NPMI", value: run.data.coherence_npmi.BERTopic?.toFixed(3) ?? "n/a"},
          ]} />}

          <nav className="mt-4 flex gap-1 overflow-x-auto" aria-label="Explorer workspaces">
            {WORKSPACES.map((item) => {
              const Icon = item.icon;
              const selected = activeTab === item.value;
              return <button
                key={item.value}
                type="button"
                aria-current={selected ? "page" : undefined}
                className={`relative flex shrink-0 items-center gap-1.5 px-2.5 py-3 text-body-sm font-medium transition-colors sm:gap-2 sm:px-3 ${selected ? "text-text-primary" : "text-text-muted hover:text-text-primary"}`}
                onClick={() => go(source, model, item.value)}
              >
                <Icon className="size-4" />{item.label}
                {selected && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-accent-primary" />}
              </button>;
            })}
          </nav>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">{content}</div>
      </section>
    </div>
  );
}

interface SourceInfo {
  source: string;
  title: string;
  has_labels: boolean;
  categories: string[];
  n_docs: number;
  models: Array<{key: string; label: string; fitted: boolean}>;
}

function CorpusContext({source, model, category, sourceInfo, sources, run, onSourceChange, onModelChange, onCategoryChange}: {
  source: string;
  model: string;
  category: string;
  sourceInfo: SourceInfo;
  sources: SourceInfo[];
  run?: {seconds: number};
  onSourceChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}) {
  return <div className="p-5">
    <div className="flex items-center gap-2"><Sparkles className="size-4 text-accent-primary" /><Typography variant="label">Corpus context</Typography></div>
    <div className="mt-5 space-y-5">
      <FormField label="Source">
        <Select aria-label="Source" value={source} options={sources.map((item) => ({value: item.source, label: compactSourceLabel(item.title)}))} onValueChange={onSourceChange} />
      </FormField>
      <FormField label="Embedding model">
        <Select aria-label="Embedding model" value={model} options={sourceInfo.models.map((item) => ({value: item.key, label: `${compactModelLabel(item.key, item.label)}${item.fitted ? "" : " · fit required"}`}))} onValueChange={onModelChange} />
      </FormField>
      <FormField label="Category">
        <Select aria-label="Category" disabled={!sourceInfo.has_labels} value={category} options={[{value: "(all)", label: "All categories"}, ...sourceInfo.categories.map((value) => ({value, label: value}))]} onValueChange={onCategoryChange} />
      </FormField>
    </div>
    <div className="mt-7 border-t border-border pt-5">
      <p className="text-caption uppercase text-text-muted">Active artifact</p>
      <dl className="mt-3 space-y-3 text-body-sm">
        <div className="flex items-center justify-between gap-3"><dt className="text-text-secondary">Status</dt><dd><span className="inline-block size-2 rounded-full bg-success" /> <span className="ms-1">{sourceInfo.models.find((item) => item.key === model)?.fitted ? "Ready" : "Not fitted"}</span></dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-text-secondary">Corpus size</dt><dd>{sourceInfo.n_docs.toLocaleString()}</dd></div>
        {run && <div className="flex items-center justify-between gap-3"><dt className="text-text-secondary">Fit time</dt><dd>{run.seconds}s</dd></div>}
      </dl>
    </div>
  </div>;
}

function MetricStrip({values}: {values: Array<{label: string; value: string}>}) {
  return <dl className="mt-4 grid grid-cols-2 divide-x divide-border border-y border-border py-3 sm:flex sm:w-fit">
    {values.map((item) => <div key={item.label} className="min-w-0 px-3 first:ps-0 sm:min-w-[116px]">
      <dt className="text-caption text-text-muted">{item.label}</dt>
      <dd className="mt-0.5 text-heading-sm font-semibold tabular-nums text-text-primary">{item.value}</dd>
    </div>)}
  </dl>;
}

function compactSourceLabel(title: string) {
  return title.replace(/\s+—.*$/, "");
}

function compactModelLabel(key: string, label: string) {
  if (key === "openai") return "OpenAI · text-embedding-3-small";
  if (key === "nvidia") return "NVIDIA · Nemotron Embed 1B";
  if (key === "kdx-minilm-tsdae") return "Sorani MiniLM · local TSDAE";
  if (key === "minilm") return "Base multilingual MiniLM";
  return label;
}

function LoadingPage() {
  return <div className="space-y-4 p-6"><Skeleton className="h-20 w-full" /><Skeleton className="h-[420px] w-full" /></div>;
}

function FitRequired({source, model, referenceModel}: {source: string; model: string; referenceModel?: string}) {
  const models = useModels();
  const client = useQueryClient();
  const [ack, setAck] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [jobId, setJobId] = useState<string>();
  const fit = useMutation({mutationFn: () => api.fitRun({source, model, reference_model: referenceModel})});
  const job = useJob(jobId);
  const registry = models.data?.models.find((item) => item.key === model);
  const needsKey = registry && !registry.key_present;
  const hosted = model === "openai" || model === "nvidia";
  const estimate = useQuery({queryKey: ["estimate", source, model], queryFn: () => api.estimate(source, model), enabled: model === "openai" && !needsKey});

  useEffect(() => {
    if (fit.data?.job_id) {
      setJobId(fit.data.job_id);
      setCostOpen(false);
    }
  }, [fit.data]);
  useEffect(() => {
    if (job.data?.status === "done") void client.invalidateQueries();
  }, [client, job.data?.status]);

  return (
    <div className="mx-auto max-w-content-md space-y-4 p-6 py-10">
      <Alert variant="warning" title="Fit required" description="This source has no saved artifact for the selected embedding model." />
      {needsKey && <Alert variant="danger" title="Provider key unavailable" description={`Configure the required ${model.toUpperCase()} API key in the server environment.`} />}
      <p className="text-body-sm text-text-secondary">Fits run one at a time in a dedicated worker. You can reload this page and reattach from the active job list.</p>
      {!jobId && (hosted ? <Button disabled={Boolean(needsKey) || !referenceModel} onClick={() => setCostOpen(true)}>Review and fit</Button> : <Button disabled={!referenceModel} loading={fit.isPending} onClick={() => fit.mutate()}>Fit selected model</Button>)}
      <Dialog open={costOpen} onOpenChange={setCostOpen} title={`Fit with ${registry?.label ?? model}`} description="The source text will be sent to the selected hosted embedding provider and API charges may apply.">
        <div className="space-y-4">
          <div className="rounded-md bg-surface-raised p-3 text-body-sm text-text-secondary">
            <p>{estimate.data?.n_docs.toLocaleString() ?? "—"} documents</p>
            {model === "openai" && <p>{estimate.isLoading ? "Estimating tokens…" : estimate.data?.estimated_tokens ? `${estimate.data.estimated_tokens.toLocaleString()} estimated tokens · theoretical minimum ${formatDuration(estimate.data.minimum_minutes ?? 0)}` : "Token estimate unavailable"}</p>}
          </div>
          <Checkbox checked={ack} onCheckedChange={(value) => setAck(value === true)} label="I understand the data-sharing and cost implications" />
          <Button fullWidth disabled={!ack} loading={fit.isPending} onClick={() => fit.mutate()}>Acknowledge and start fit</Button>
        </div>
      </Dialog>
      {fit.isError && <Alert variant="danger" title="Could not start fit" description={fit.error.message} />}
      {job.data && <div className="space-y-2 rounded-md border border-border bg-surface p-4"><div className="flex justify-between text-body-sm"><span>{job.data.message}</span><span>{Math.round(job.data.fraction * 100)}%</span></div><Progress value={job.data.fraction * 100} label={job.data.message} />{job.data.error && <Alert variant="danger" description={job.data.error} />}</div>}
    </div>
  );
}

function formatDuration(minutes: number) {
  return minutes >= 60 ? `${(minutes / 60).toFixed(1)} hours` : `${minutes.toFixed(1)} minutes`;
}
