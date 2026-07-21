import { forwardRef, useMemo, type HTMLAttributes } from "react";
import type { Data } from "plotly.js";
import { BarChart3, FileText, Layers, PieChart } from "lucide-react";
import { Skeleton, Tooltip, Typography } from "noor-ui";
import { useDistribution, useTopics } from "../../../api/hooks";
import type { RunMeta, SourceSummary } from "../../../api/types";
import { Plot } from "../../../charts/Plot";
import { usePalette } from "../../../charts/palette";
import { useLocale } from "../../../lib/i18n";
import { topicDisplayName } from "../../../lib/labels";

interface Props {source: string; model: string; sourceInfo: SourceSummary; run: RunMeta}

/** Borderless metric — a clean number over a muted label. forwardRef so it can
 *  be a Tooltip trigger (Radix asChild passes a ref). */
const Metric = forwardRef<HTMLDivElement, {label: string; value: string} & HTMLAttributes<HTMLDivElement>>(
  ({label, value, ...props}, ref) => (
    <div ref={ref} {...props}>
      <p className="text-caption text-text-muted">{label}</p>
      <p className="mt-0.5 text-heading-md font-semibold tabular-nums">{value}</p>
    </div>
  ),
);
Metric.displayName = "Metric";

/**
 * What produced these topics: the file the documents came from, how they were
 * cut out of it, and the exact embedding model. Older runs carry no ingest
 * record, so the model line still stands on its own.
 */
function ProvenanceSection({run}: {run: RunMeta}) {
  const ingest = run.ingest ?? undefined;
  // Local models are registered by filesystem path; runs fitted before that was
  // normalized server-side still carry one.
  const modelName = (ingest?.embedding?.name ?? run.model_name).split("/").pop() ?? run.model_name;
  const rows: Array<{label: string; value: string}> = [
    ...(ingest ? [
      {label: "Source file", value: `${ingest.file} · ${ingest.format.toUpperCase()}`},
      {
        label: "Documents",
        value: ingest.sampled
          ? `${ingest.documents_embedded.toLocaleString()} embedded · random sample of ${ingest.documents_available.toLocaleString()}`
          : `${ingest.documents_embedded.toLocaleString()} embedded · every ${ingest.unit} that qualified`,
      },
      {
        label: "Document text",
        value: ingest.text_col ? `column “${ingest.text_col}”` : `one per ${ingest.unit}, ≥ ${ingest.min_words} words`,
      },
      ...(ingest.label_col ? [{label: "Category label", value: `column “${ingest.label_col}”`}] : []),
    ] : [{label: "Documents", value: `${run.n_docs.toLocaleString()} embedded`}]),
    {label: "Embedding model", value: ingest?.embedding ? `${ingest.embedding.provider} · ${modelName}` : modelName},
    {label: "Normalization", value: run.normalized ? "KLPT Sorani normalization applied" : "raw text, not normalized"},
    {label: "Fit time", value: `${run.seconds.toLocaleString()} s`},
  ];
  return (
    <section>
      <div className="mb-1 flex items-center gap-2"><FileText className="size-4 text-text-secondary" /><Typography variant="label">How this run was built</Typography></div>
      <p className="mb-3 text-caption text-text-muted">Exactly what was embedded, and with which model.</p>
      <dl className="grid max-w-3xl gap-x-8 gap-y-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-caption text-text-muted">{row.label}</dt>
            <dd className="mt-0.5 text-body-sm text-text-primary" dir="auto">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

/**
 * Data-scientist read of the corpus itself (not the embedding model). Three
 * questions: how is it shaped, how concentrated are the topics, and — when
 * labeled — how balanced are the categories.
 */
export function InsightsView({source, model, sourceInfo, run}: Props) {
  const topics = useTopics(source, model);
  const distribution = useDistribution(source, model);
  const palette = usePalette();
  const { t } = useLocale();

  const rows = topics.data?.topics ?? [];
  const clustered = run.n_docs - run.n_outliers;
  const coverage = run.n_docs > 0 ? Math.round((clustered / run.n_docs) * 100) : 0;
  const counts = rows.map((row) => row.count);
  const largest = rows[0];
  const largestShare = largest && run.n_docs > 0 ? Math.round((largest.count / run.n_docs) * 100) : 0;
  const avgPerTopic = rows.length ? Math.round(clustered / rows.length) : 0;

  // Share-based Pareto: bars and the cumulative line share ONE % axis (no
  // dual-scale). Bars = each topic's share of the corpus; the line is the
  // running total, so its plateau IS the clustered coverage.
  const pareto = useMemo(() => {
    const top = rows.slice(0, 24);
    let running = 0;
    const share = top.map((row) => (run.n_docs > 0 ? (row.count / run.n_docs) * 100 : 0));
    const cumulative = share.map((value) => (running += value));
    return {
      // Fixed numeric x-positions keep both traces aligned; Plotly can reorder a
      // shared *categorical* axis, which would scramble the cumulative line.
      x: top.map((_, index) => index),
      labels: top.map((row) => `#${row.topic}`),
      names: top.map((row) => topicDisplayName(row.name)),
      counts: top.map((row) => row.count),
      share,
      cumulative,
    };
  }, [rows, run.n_docs]);

  // Category balance (labeled corpora only): sum the topic×category matrix down
  // to documents per category — the class distribution a modeller checks first.
  const balance = useMemo(() => {
    if (distribution.data?.kind !== "heatmap") return null;
    const {categories, counts: matrix} = distribution.data;
    const totals = categories.map((_, col) => matrix.reduce((sum, topicRow) => sum + (topicRow[col] ?? 0), 0));
    const order = categories.map((_, index) => index).sort((a, b) => totals[a] - totals[b]);
    return {
      categories: order.map((index) => categories[index]),
      totals: order.map((index) => totals[index]),
    };
  }, [distribution.data]);

  return (
    <div className="space-y-8 p-4 md:p-6">
      <section>
        <div className="mb-4 flex items-center gap-2 text-text-secondary"><Layers className="size-4" /><Typography variant="label">{t("glance")}</Typography></div>
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <Tooltip content={t("outliersHint")}><Metric label={`${t("clustered")} · ${t("coverage")}`} value={`${coverage}%`} /></Tooltip>
          <Metric label={t("largestTopic")} value={`${largestShare}%`} />
          <Metric label="Median topic size" value={median(counts).toLocaleString()} />
          <Metric label="Avg docs / topic" value={avgPerTopic.toLocaleString()} />
        </div>
        {/* Coverage meter: clustered vs unclustered, magnitude read at a glance. */}
        <div className="mt-5 max-w-3xl">
          <div className="flex items-center justify-between text-caption text-text-secondary">
            <span>{t("clustered")} · {clustered.toLocaleString()}</span>
            <span>{t("unclustered")} · {run.n_outliers.toLocaleString()}</span>
          </div>
          <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-surface-raised" role="img" aria-label={`${coverage}% ${t("clustered")}`}>
            <div className="h-full rounded-full" style={{width: `${coverage}%`, backgroundColor: palette.kind.bertopic}} />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-1 flex items-center gap-2"><BarChart3 className="size-4 text-text-secondary" /><Typography variant="label">{t("topicSizes")}</Typography></div>
        <p className="mb-3 text-caption text-text-muted">{t("topicSizesHint")}</p>
        <div className="rounded-xl bg-surface p-3 shadow-sm">
          {topics.isLoading ? <Skeleton className="h-[440px] w-full" /> : !rows.length ? null : (
            <Plot
              data={[
                {
                  type: "bar",
                  name: `${t("topics")} · %`,
                  x: pareto.x,
                  y: pareto.share,
                  customdata: pareto.names.map((name, index) => [name, pareto.counts[index], pareto.labels[index]]),
                  marker: {color: palette.kind.bertopic},
                  hovertemplate: "<b>%{customdata[2]} · %{customdata[0]}</b><br>%{y:.1f}% · %{customdata[1]:,} docs<extra></extra>",
                } as Data,
                {
                  type: "scatter",
                  mode: "lines+markers",
                  name: t("cumulativeCoverage"),
                  x: pareto.x,
                  y: pareto.cumulative,
                  customdata: pareto.labels,
                  line: {color: palette.categorical[1], width: 2},
                  marker: {size: 6, color: palette.categorical[1]},
                  hovertemplate: "%{customdata}<br>" + t("cumulativeCoverage") + " %{y:.0f}%<extra></extra>",
                } as Data,
              ]}
              layout={{
                height: 440,
                margin: {l: 48, r: 16, t: 10, b: 52},
                yaxis: {title: {text: "% of corpus"}, ticksuffix: "%", rangemode: "tozero"},
                xaxis: {title: {text: t("topics")}, tickmode: "array", tickvals: pareto.x, ticktext: pareto.labels, tickangle: 0, tickfont: {size: 10}},
                legend: {orientation: "h", y: 1.12, x: 0},
                bargap: 0.25,
              }}
            />
          )}
        </div>
      </section>

      {sourceInfo.has_labels && (
        <section>
          <div className="mb-1 flex items-center gap-2"><PieChart className="size-4 text-text-secondary" /><Typography variant="label">{t("categories")}</Typography></div>
          <p className="mb-3 text-caption text-text-muted">Documents per category — the class balance of the corpus.</p>
          <div className="rounded-xl bg-surface p-3 shadow-sm">
            {distribution.isLoading ? <Skeleton className="h-[360px] w-full" /> : !balance ? null : (
              <Plot
                data={[{
                  type: "bar",
                  orientation: "h",
                  x: balance.totals,
                  y: balance.categories,
                  // Category identity colors match the Map and Structure views.
                  marker: {color: balance.categories.map((name) => palette.colorForCategory(name))},
                  hovertemplate: "<b>%{y}</b><br>%{x:,} docs<extra></extra>",
                } as Data]}
                layout={{height: Math.max(240, balance.categories.length * 46), margin: {l: 130, r: 24, t: 8, b: 40}, xaxis: {title: {text: t("documents")}, rangemode: "tozero"}}}
              />
            )}
          </div>
        </section>
      )}

      <ProvenanceSection run={run} />
    </div>
  );
}
