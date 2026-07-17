import type { Data } from "plotly.js";
import { Focus, ScanSearch } from "lucide-react";
import { Badge, ErrorState, SegmentedControl, Skeleton, Slider, Typography } from "noor-ui";
import { usePoints } from "../../api/hooks";
import { Plot } from "../../charts/Plot";
import { PASTELS } from "../../charts/usePlotlyTheme";

interface Props {source: string; model: string; category: string; params: URLSearchParams; setParams: (params: URLSearchParams) => void}

export function MapTab({source, model, category, params, setParams}: Props) {
  const maxPoints = Number(params.get("maxPoints") ?? 12000);
  const colorBy = params.get("colorBy") ?? "topic";
  const highlight = params.has("topic") ? Number(params.get("topic")) : undefined;
  const points = usePoints(source, model, maxPoints, category);
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); next.set(key, value); setParams(next); };
  if (points.isLoading) return <div className="p-5"><Skeleton className="h-[680px] w-full" /></div>;
  if (points.isError) return <ErrorState heading="Could not load the document map" description={points.error.message} onRetry={() => points.refetch()} />;
  const data = points.data!;
  const groups = colorBy === "category" && data.label ? [...new Set(data.label.map((value) => value ?? "unlabeled"))] : ["documents"];
  const traces: Data[] = groups.map((group, groupIndex) => {
    const indices = data.x.map((_, index) => index).filter((index) => groups.length === 1 || (data.label?.[index] ?? "unlabeled") === group);
    return {
      type: "scattergl",
      mode: "markers",
      name: group,
      x: indices.map((index) => data.x[index]),
      y: indices.map((index) => data.y[index]),
      customdata: indices.map((index) => [data.topic[index], data.keywords[index], data.text[index]]),
      marker: {
        size: highlight !== undefined ? 7 : 6,
        opacity: highlight !== undefined ? indices.map((index) => data.topic[index] === highlight ? 0.92 : 0.18) : 0.7,
        color: indices.map((index) => highlight !== undefined ? (data.topic[index] === highlight ? "#e06c5f" : "#98a1ad") : PASTELS[(colorBy === "topic" ? data.topic[index] : groupIndex) % PASTELS.length]),
        line: {width: 0},
      },
      hovertemplate: "<b>topic %{customdata[0]}</b>: %{customdata[1]}<br>%{customdata[2]}<extra></extra>",
    } as Data;
  });

  return (
    <div className="p-4 md:p-5">
      <section className="overflow-hidden rounded-md border border-border bg-surface">
        <div className="flex flex-col gap-4 border-b border-border px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2"><ScanSearch className="size-4 text-accent-primary" /><Typography variant="label">Semantic field</Typography></div>
            <Badge>{data.shown.toLocaleString()} / {data.total.toLocaleString()} docs</Badge>
            {highlight !== undefined && <Badge variant="warning"><Focus className="me-1 inline size-3" />Topic {highlight}</Badge>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SegmentedControl aria-label="Color points by" value={colorBy} options={[{value: "topic", label: "Topic"}, {value: "category", label: "Category", disabled: !data.label}]} onValueChange={(value) => update("colorBy", value)} />
            <div className="w-full sm:w-56"><div className="mb-1 flex justify-between text-caption text-text-secondary"><span>Point budget</span><span>{maxPoints.toLocaleString()}</span></div><Slider aria-label="Maximum points" min={2000} max={40000} step={2000} value={[maxPoints]} onValueChange={([value]) => update("maxPoints", String(value))} /></div>
          </div>
        </div>
        <div className="relative min-h-[620px] bg-canvas/50">
          <Plot data={traces} layout={{height: 680, margin: {l: 10, r: 10, t: 10, b: 10}, showlegend: groups.length > 1, xaxis: {visible: false}, yaxis: {visible: false}, legend: {title: {text: "category"}, bgcolor: "rgba(0,0,0,0)"}, dragmode: "pan"}} />
        </div>
      </section>
    </div>
  );
}
