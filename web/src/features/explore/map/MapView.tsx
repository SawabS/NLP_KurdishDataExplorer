import { useMemo } from "react";
import { Focus, ScanSearch } from "lucide-react";
import { Badge, ErrorState, SegmentedControl, Skeleton, Slider, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Typography } from "noor-ui";
import { usePoints } from "../../../api/hooks";
import { usePalette } from "../../../charts/palette";
import { useLocale } from "../../../lib/i18n";
import { DeckMap } from "./DeckMap";
import { MapLegend, type LegendTopic } from "./MapLegend";

interface Props {source: string; model: string; category: string; params: URLSearchParams; setParams: (params: URLSearchParams) => void}

export function MapView({source, model, category, params, setParams}: Props) {
  const maxPoints = Number(params.get("maxPoints") ?? 12000);
  const colorBy = (params.get("colorBy") ?? "topic") as "topic" | "category";
  const view = params.get("view") ?? "chart";
  const renderMode = (params.get("renderMode") ?? "points") as "points" | "density";
  const highlight = params.has("topic") ? Number(params.get("topic")) : undefined;
  const points = usePoints(source, model, maxPoints, category === "(all)" ? "(all)" : category);
  const palette = usePalette();
  const { t } = useLocale();
  const update = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    value === undefined ? next.delete(key) : next.set(key, value);
    setParams(next);
  };

  const legendTopics: LegendTopic[] = useMemo(() => {
    if (!points.data) return [];
    const counts = new Map<number, {count: number; keywords: string}>();
    points.data.topic.forEach((topic, index) => {
      const entry = counts.get(topic);
      if (entry) entry.count += 1;
      else counts.set(topic, {count: 1, keywords: points.data!.keywords[index]});
    });
    return [...counts.entries()]
      .filter(([topic]) => topic >= 0)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 12)
      .map(([topic, {count, keywords}]) => ({topic, count, keywords}));
  }, [points.data]);

  if (points.isLoading) {
    return (
      <div className="flex h-full min-h-0 p-3 md:p-4 xl:p-5">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-surface shadow-sm">
          <Skeleton className="m-4 h-9 w-96 max-w-full shrink-0" />
          <Skeleton className="mx-4 mb-4 min-h-0 flex-1" />
        </div>
      </div>
    );
  }
  if (points.isError) return <ErrorState heading="Could not load the document map" description={points.error.message} onRetry={() => points.refetch()} />;
  const data = points.data!;
  const matched = highlight !== undefined ? data.topic.filter((topic) => topic === highlight).length : 0;

  return (
    <div className="flex h-full min-h-0 p-3 md:p-4 xl:p-5">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-surface shadow-sm">
        <div className="flex shrink-0 flex-col gap-4 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2"><ScanSearch className="size-4 text-text-secondary" /><Typography variant="label">Semantic field</Typography></div>
            <Badge>{data.shown.toLocaleString()} / {data.total.toLocaleString()} docs</Badge>
            {highlight !== undefined && <Badge variant="warning"><Focus className="me-1 inline size-3" />Topic {highlight} · {matched.toLocaleString()} docs</Badge>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SegmentedControl aria-label="View" value={view} options={[{value: "chart", label: t("viewChart")}, {value: "table", label: t("viewTable")}]} onValueChange={(value) => update("view", value)} />
            {view === "chart" && <SegmentedControl aria-label="Render mode" value={renderMode} options={[{value: "points", label: "Points"}, {value: "density", label: "Density"}]} onValueChange={(value) => update("renderMode", value)} />}
            <SegmentedControl aria-label="Color points by" value={colorBy} options={[{value: "topic", label: "Topic"}, {value: "category", label: "Category", disabled: !data.label}]} onValueChange={(value) => update("colorBy", value)} />
            <div className="w-full sm:w-56"><div className="mb-1 flex justify-between text-caption text-text-secondary"><span>Point budget</span><span className="tabular-nums">{maxPoints.toLocaleString()}</span></div><Slider aria-label="Maximum points" min={2000} max={40000} step={2000} value={[maxPoints]} onValueChange={([value]) => update("maxPoints", String(value))} /></div>
          </div>
        </div>
        {view === "table" ? (
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Topic</TableHead><TableHead>Docs in sample</TableHead><TableHead>Keywords</TableHead></TableRow></TableHeader>
              <TableBody>
                {legendTopics.map((item) => (
                  <TableRow key={item.topic}>
                    <TableCell className="tabular-nums">#{item.topic}</TableCell>
                    <TableCell className="tabular-nums">{item.count.toLocaleString()}</TableCell>
                    <TableCell dir="auto" lang="ckb" className="corpus-text">{item.keywords}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <>
            <div className="relative min-h-0 flex-1 bg-canvas/50">
              <DeckMap
                data={data}
                mode={renderMode}
                colorBy={colorBy}
                highlight={highlight}
                palette={palette}
                onSelectTopic={(topic) => update("topic", String(topic))}
              />
            </div>
            {renderMode === "points" && colorBy === "topic" && <MapLegend topics={legendTopics} highlight={highlight} onToggle={(topic) => update("topic", topic === undefined ? undefined : String(topic))} />}
          </>
        )}
      </section>
    </div>
  );
}
