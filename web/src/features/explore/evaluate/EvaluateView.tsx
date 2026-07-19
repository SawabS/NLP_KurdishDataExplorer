import { useState } from "react";
import type { Data } from "plotly.js";
import { Activity, Info } from "lucide-react";
import { Alert, SegmentedControl, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tooltip, Typography } from "noor-ui";
import { useBaselines, useCoherence } from "../../../api/hooks";
import { Plot } from "../../../charts/Plot";
import { usePalette } from "../../../charts/palette";
import { useLocale } from "../../../lib/i18n";
import { BaselineTable } from "./BaselineTable";
import { ModelDossier } from "./ModelDossier";

export function EvaluateView({source, model}: {source: string; model: string}) {
  const coherence = useCoherence(source, model);
  const baselines = useBaselines(source, model);
  const palette = usePalette();
  const { t } = useLocale();
  const baselineNames = Object.keys(baselines.data?.baselines ?? {});
  const [baseline, setBaseline] = useState("LDA");
  const [view, setView] = useState("chart");
  const rows = coherence.data ? [
    ...coherence.data.comparisons.map((item) => ({name: item.model === "kdx-minilm-tsdae" ? "Sorani MiniLM" : item.model === "minilm" ? "Base multilingual MiniLM" : item.label, value: item.npmi, kind: "BERTopic" as const})),
    ...Object.entries(coherence.data.scores).filter(([name]) => name !== "BERTopic").map(([name, value]) => ({name, value, kind: "Baseline" as const})),
  ] : [];
  const selectedBaseline = baselineNames.includes(baseline) ? baseline : baselineNames[0];
  const reversed = [...rows].reverse();

  return (
    <div className="p-4 md:p-5">
      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <ModelDossier model={model} />

        <section className="min-w-0 rounded-md border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-text-secondary" />
                <Typography variant="label">Coherence benchmark</Typography>
                <Tooltip content={t("npmiHint")}>
                  <button type="button" aria-label={t("npmiHint")} className="rounded-full text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"><Info className="size-3.5" /></button>
                </Tooltip>
              </div>
              <p className="mt-0.5 text-caption text-text-muted">NPMI · higher is better</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 text-caption text-text-secondary sm:flex" aria-hidden="true">
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{backgroundColor: palette.kind.bertopic}} />BERTopic</span>
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{backgroundColor: palette.kind.baseline}} />Baseline</span>
              </div>
              <SegmentedControl aria-label="View" value={view} options={[{value: "chart", label: t("viewChart")}, {value: "table", label: t("viewTable")}]} onValueChange={setView} />
            </div>
          </div>
          <div className="p-3">
            {coherence.isLoading ? <Skeleton className="h-[440px] w-full" /> : !rows.length ? <Alert className="m-3" description="No coherence scores are stored for this source." /> : view === "table" ? (
              <Table>
                <TableHeader><TableRow><TableHead>Model</TableHead><TableHead>Kind</TableHead><TableHead>NPMI</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.name}><TableCell>{row.name}</TableCell><TableCell>{row.kind}</TableCell><TableCell className="tabular-nums">{row.value.toFixed(3)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Plot data={[{
                type: "bar",
                orientation: "h",
                y: reversed.map((item) => item.name),
                x: reversed.map((item) => item.value),
                text: reversed.map((item) => item.value.toFixed(3)),
                textposition: "auto",
                // Color encodes MEANING (embedding pipeline vs classical baseline), not position.
                marker: {color: reversed.map((item) => item.kind === "BERTopic" ? palette.kind.bertopic : palette.kind.baseline)},
                customdata: reversed.map((item) => item.kind),
                hovertemplate: "%{y}<br>NPMI %{x:.3f}<br>%{customdata}<extra></extra>",
              } as Data]} layout={{height: 460, margin: {l: 150, r: 30, t: 15, b: 45}, xaxis: {title: {text: "NPMI"}}}} />
            )}
          </div>
        </section>
      </div>

      <div className="mt-5">
        {baselineNames.length > 0
          ? <BaselineTable baselines={baselines.data!.baselines} selected={selectedBaseline} onSelect={setBaseline} />
          : <BaselineTable baselines={{}} selected="" onSelect={setBaseline} />}
      </div>
    </div>
  );
}
