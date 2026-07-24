import { useMemo } from "react";
import type { Data, PlotMouseEvent } from "plotly.js";
import { Layers3 } from "lucide-react";
import { Alert, ErrorState, SegmentedControl, Skeleton, Slider, Typography } from "noor-ui";
import { useTopics, useTree } from "../../../api/hooks";
import { Plot } from "../../../charts/Plot";
import { cssToken, usePalette } from "../../../charts/palette";
import { topicDisplayName, topicName } from "../../../lib/labels";
import { DistributionPanel } from "./DistributionPanel";
import { NameTopicsAction } from "./NameTopicsAction";
import { TopicIndexTable } from "./TopicIndexTable";
import { TopicInspector } from "./TopicInspector";

interface Props {
  source: string; model: string; category: string; params: URLSearchParams;
  setParams: (params: URLSearchParams) => void;
}

export function StructureView({source, model, category, params, setParams}: Props) {
  const tree = useTree(source, model);
  const topics = useTopics(source, model);
  const palette = usePalette();
  const layout = params.get("layout") ?? "treemap";
  const depth = Number(params.get("depth") ?? 0);
  const selectedParam = params.has("topic") ? Number(params.get("topic")) : undefined;
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); next.set(key, value); setParams(next); };

  const topicRows = topics.data?.topics ?? [];
  const options = useMemo(() => topicRows.map((item) => ({value: String(item.topic), label: `${topicName(item)} · ${item.count.toLocaleString()}`})), [topics.data]);
  if (tree.isLoading || topics.isLoading) {
    return (
      <div className="p-4 md:p-5">
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          <Skeleton className="m-4 h-9 w-96 max-w-full" />
          <div className="grid xl:grid-cols-[minmax(0,1fr)_380px]">
            <Skeleton className="m-4 h-[560px]" />
            <Skeleton className="m-4 hidden h-[560px] xl:block" />
          </div>
        </div>
      </div>
    );
  }
  if (tree.isError) return <ErrorState heading="Could not load hierarchy" description={tree.error.message} onRetry={() => tree.refetch()} />;
  if (!tree.data?.ids.length) return <div className="p-5"><Alert title="No hierarchy" description="Re-fit this run to generate a saved topic hierarchy." /></div>;

  const selected = selectedParam ?? topicRows[0]?.topic;
  const isTreemapTopics = layout === "treemap";

  // DEFAULT — a flat treemap of the actual topics: one tile per topic, sized by
  // document count, named with its real (LLM) name, colored to match the Map.
  // This answers "what are the themes and how big" directly, without the raw
  // binary-merge trunk (whose internal nodes just repeat the same keywords).
  const topicTrace = {
    type: "treemap",
    ids: topicRows.map((row) => String(row.topic)),
    parents: topicRows.map(() => ""),
    labels: topicRows.map((row) => topicName(row)),
    values: topicRows.map((row) => row.count),
    customdata: topicRows.map((row) => [row.topic, topicDisplayName(row.name)]),
    marker: {colors: topicRows.map((row) => palette.colorForTopic(row.topic)), line: {width: 1, color: palette.onFill}},
    texttemplate: "%{label}<br>%{value:,}",
    textposition: "middle center",
    textfont: {color: palette.onFill, size: 13},
    hovertemplate: "<b>%{label}</b><br>%{value:,} documents<br><i>%{customdata[1]}</i><extra></extra>",
    tiling: {pad: 3},
    sort: true,
  } as unknown as Data;

  // ALTERNATES — icicle / sunburst show the FULL merge hierarchy for drill-down.
  // Leaves take the Map topic color; internal groups a hashed tone; corpus root a
  // neutral structural grey. Labels/text are now explicitly readable on the fills.
  const rootColor = cssToken("--n-border-strong", "#94a3b8");
  const hierColors = tree.data.ids.map((id, index) => {
    const topicId = tree.data!.topic_ids[index];
    if (topicId !== null && topicId !== undefined) return palette.colorForTopic(topicId);
    const kind = tree.data!.kinds[index];
    if (kind === "source") return rootColor;
    return kind === "group" ? palette.colorForCategory(id) : palette.outlier;
  });
  const hierTrace = {
    type: layout,
    ids: tree.data.ids,
    parents: tree.data.parents,
    labels: tree.data.labels,
    values: tree.data.values,
    branchvalues: "total",
    maxdepth: depth === 0 ? -1 : depth,
    customdata: tree.data.topic_ids.map((topic, index) => [topic, tree.data!.samples[index], tree.data!.categories[index]]),
    marker: {colors: hierColors},
    texttemplate: "%{label}",
    textfont: {color: palette.onFill, size: 12},
    insidetextfont: {color: palette.onFill},
    hovertemplate: "<b>%{label}</b><br>%{value:,} documents<br>%{customdata[2]}<br><i>%{customdata[1]}</i><extra></extra>",
    pathbar: {visible: layout === "icicle"},
  } as unknown as Data;

  const trace = isTreemapTopics ? topicTrace : hierTrace;
  const onChartClick = (event: PlotMouseEvent) => {
    const custom = event.points[0]?.customdata as unknown as [number | null] | undefined;
    if (custom?.[0] !== null && custom?.[0] !== undefined) update("topic", String(custom[0]));
  };

  return (
    <div className="p-4 md:p-6">
      <div className="overflow-hidden rounded-xl bg-surface shadow-sm">
        <div className="flex flex-col gap-4 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2"><Layers3 className="size-4 text-text-secondary" /><Typography variant="label">{isTreemapTopics ? "Topics" : "Merge hierarchy"}</Typography><span className="text-caption text-text-muted">Area = documents</span></div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <NameTopicsAction source={source} model={model} topics={topicRows} />
            <SegmentedControl aria-label="Hierarchy layout" value={layout} options={[{value: "treemap", label: "Topics"}, {value: "icicle", label: "Icicle"}, {value: "sunburst", label: "Sunburst"}]} onValueChange={(value) => update("layout", value)} />
            {!isTreemapTopics && (
              <div className="w-full sm:w-48"><div className="mb-1 flex justify-between text-caption text-text-secondary"><span>Depth</span><span>{depth === 0 ? "All" : depth}</span></div><Slider aria-label="Visible depth" min={0} max={4} step={1} value={[depth]} onValueChange={([value]) => update("depth", String(value))} /></div>
            )}
          </div>
        </div>
        {/* xl:h-[600px] bounds the row so the inspector's own scroll area (not
            the page) absorbs long representative-document lists. Below xl the
            panel stacks under the chart with natural page height instead. */}
        <div className="grid xl:h-[600px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="h-[600px] min-w-0 border-b border-border/60 xl:border-b-0 xl:border-e">
            <Plot data={[trace]} layout={{height: 600, margin: {l: 0, r: 0, t: 8, b: 0}}} onClick={onChartClick} />
          </div>
          <TopicInspector source={source} model={model} topicId={selected} category={category} options={options} onChange={(value) => update("topic", String(value))} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
        <DistributionPanel source={source} model={model} topics={topicRows} onSelect={(topic) => update("topic", String(topic))} />
        <TopicIndexTable topics={topics.data?.topics ?? []} onSelect={(topic) => update("topic", String(topic))} />
      </div>
    </div>
  );
}
