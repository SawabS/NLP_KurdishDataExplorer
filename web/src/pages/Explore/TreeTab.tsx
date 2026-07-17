import { useMemo } from "react";
import type { Data, PlotMouseEvent } from "plotly.js";
import { Layers3 } from "lucide-react";
import { Alert, Button, ErrorState, SegmentedControl, Skeleton, Slider, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Typography } from "noor-ui";
import { useDistribution, useTopics, useTree } from "../../api/hooks";
import { Plot } from "../../charts/Plot";
import { PASTELS } from "../../charts/usePlotlyTheme";
import { TopicInspector } from "./TopicInspector";

interface Props {
  source: string; model: string; category: string; params: URLSearchParams;
  setParams: (params: URLSearchParams) => void;
}

const colorFor = (value: string) => {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PASTELS[hash % PASTELS.length];
};

export function TreeTab({source, model, category, params, setParams}: Props) {
  const tree = useTree(source, model);
  const topics = useTopics(source, model);
  const distribution = useDistribution(source, model);
  const layout = params.get("layout") ?? "icicle";
  const depth = Number(params.get("depth") ?? 3);
  const selectedParam = params.has("topic") ? Number(params.get("topic")) : undefined;
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); next.set(key, value); setParams(next); };

  const options = useMemo(() => (topics.data?.topics ?? []).map((item) => ({value: String(item.topic), label: `${item.name.replace(/^\d+_/, "").replaceAll("_", " · ")} · ${item.count.toLocaleString()}`})), [topics.data]);
  if (tree.isLoading || topics.isLoading) return <div className="p-5"><Skeleton className="h-[620px] w-full" /></div>;
  if (tree.isError) return <ErrorState heading="Could not load hierarchy" description={tree.error.message} onRetry={() => tree.refetch()} />;
  if (!tree.data?.ids.length) return <div className="p-5"><Alert title="No hierarchy" description="Re-fit this run to generate a saved topic hierarchy." /></div>;

  const categoryColors = Object.fromEntries([...new Set(tree.data.categories)].map((value) => [value, colorFor(value)]));
  const colors = tree.data.categories.map((value, index) => tree.data!.kinds[index] === "group"
    ? colorFor(tree.data!.ids[index])
    : (value === "(group)" ? colorFor(String(tree.data!.topic_ids[index] ?? index)) : categoryColors[value]));
  const selected = selectedParam ?? topics.data?.topics[0]?.topic;
  const trace = {
    type: layout,
    ids: tree.data.ids,
    parents: tree.data.parents,
    labels: tree.data.labels,
    values: tree.data.values,
    branchvalues: "total",
    maxdepth: depth === 0 ? -1 : depth,
    customdata: tree.data.topic_ids.map((topic, index) => [topic, tree.data!.samples[index], tree.data!.categories[index]]),
    marker: {colors},
    hovertemplate: "<b>%{label}</b><br>%{value:,} documents<br>%{customdata[2]}<br><i>%{customdata[1]}</i><extra></extra>",
    pathbar: {visible: false},
    root: {color: "rgba(0,0,0,0)"},
  } as unknown as Data;
  const onChartClick = (event: PlotMouseEvent) => {
    const custom = event.points[0]?.customdata as unknown as [number | null] | undefined;
    if (custom?.[0] !== null && custom?.[0] !== undefined) update("topic", String(custom[0]));
  };

  return (
    <div className="p-4 md:p-5">
      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <div className="flex flex-col gap-4 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2"><Layers3 className="size-4 text-accent-primary" /><Typography variant="label">Hierarchy canvas</Typography><span className="text-caption text-text-muted">Area = documents</span></div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SegmentedControl aria-label="Hierarchy layout" value={layout} options={[{value: "icicle", label: "Icicle"}, {value: "treemap", label: "Treemap"}, {value: "sunburst", label: "Sunburst"}]} onValueChange={(value) => update("layout", value)} />
            <div className="w-full sm:w-48"><div className="mb-1 flex justify-between text-caption text-text-secondary"><span>Depth</span><span>{depth === 0 ? "All" : depth}</span></div><Slider aria-label="Visible depth" min={0} max={4} step={1} value={[depth]} onValueChange={([value]) => update("depth", String(value))} /></div>
          </div>
        </div>
        <div className="grid xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 border-b border-border xl:border-b-0 xl:border-e">
            <Plot data={[trace]} layout={{height: 600, margin: {l: 0, r: 0, t: 8, b: 0}}} onClick={onChartClick} />
          </div>
          <TopicInspector source={source} model={model} topicId={selected} category={category} options={options} onChange={(value) => update("topic", String(value))} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
        <section className="min-w-0 rounded-md border border-border bg-surface">
          <div className="border-b border-border px-4 py-3"><Typography variant="label">Corpus distribution</Typography><p className="text-caption text-text-muted">Topic composition across the active category set</p></div>
          <div className="p-3">
            {distribution.isLoading ? <Skeleton className="h-[420px] w-full" /> : distribution.data?.kind === "heatmap" ? (
              <Plot data={[{type: "heatmap", x: distribution.data.categories, y: distribution.data.topics, z: distribution.data.shares, customdata: distribution.data.counts, colorscale: [[0, "#f2f6fc"], [0.5, "#8fb8e8"], [1, "#31629e"]], hovertemplate: "topic %{y} · %{x}<br>%{z:.0f}% (%{customdata:,} docs)<extra></extra>", colorbar: {title: {text: "%"}}} as Data]} layout={{height: 430, margin: {l: 55, r: 30, t: 8, b: 70}}} />
            ) : distribution.data?.kind === "bar" ? (
              <Plot data={[{type: "bar", orientation: "h", x: [...distribution.data.counts].reverse(), y: [...distribution.data.topics].reverse(), hovertemplate: "topic %{y}<br>%{x:,} docs<extra></extra>"} as Data]} layout={{height: 430, margin: {l: 55, r: 20, t: 8, b: 45}}} />
            ) : null}
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-md border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><Typography variant="label">Topic index</Typography><p className="text-caption text-text-muted">{topics.data?.topics.length ?? 0} leaf topics</p></div></div>
          <div className="max-h-[480px] overflow-auto"><Table><TableHeader><TableRow><TableHead>Topic</TableHead><TableHead>Docs</TableHead><TableHead>Terms</TableHead></TableRow></TableHeader><TableBody>
            {topics.data?.topics.map((item) => <TableRow key={item.topic}><TableCell><Button variant="link" onClick={() => update("topic", String(item.topic))}>#{item.topic}</Button></TableCell><TableCell>{item.count.toLocaleString()}</TableCell><TableCell dir="auto" lang="ckb" className="corpus-text">{item.name.replace(/^\d+_/, "").replaceAll("_", " · ")}</TableCell></TableRow>)}
          </TableBody></Table></div>
        </section>
      </div>
    </div>
  );
}
