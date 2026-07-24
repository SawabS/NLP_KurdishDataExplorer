import { forwardRef, useMemo, type HTMLAttributes } from "react";
import type { Data } from "plotly.js";
import { BarChart3, FileText, Layers, PieChart } from "lucide-react";
import { Skeleton, Tooltip, Typography } from "noor-ui";
import { useDistribution, useTopics } from "../../../api/hooks";
import type { RunMeta, SourceSummary } from "../../../api/types";
import { Plot } from "../../../charts/Plot";
import { usePalette } from "../../../charts/palette";
import { useLocale } from "../../../lib/i18n";
import { topicDisplayName, topicName } from "../../../lib/labels";

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

  // Biggest themes, by their real names — a horizontal bar reads long Kurdish /
  // Arabic labels far better than an x-axis of #ids, and answers "what dominates
  // this corpus" at a glance. Reversed so the largest sits at the top.
  const topTopics = useMemo(() => {
    const top = rows.slice(0, 12).reverse();
    return {
      names: top.map((row) => topicName(row)),
      counts: top.map((row) => row.count),
      keywords: top.map((row) => topicDisplayName(row.name)),
      colors: top.map((row) => palette.colorForTopic(row.topic)),
      shares: top.map((row) => (run.n_docs > 0 ? (row.count / run.n_docs) * 100 : 0)),
    };
  }, [rows, run.n_docs, palette]);

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
              data={[{
                type: "bar",
                orientation: "h",
                x: topTopics.counts,
                y: topTopics.names,
                customdata: topTopics.names.map((_, index) => [topTopics.keywords[index], topTopics.shares[index]]),
                marker: {color: topTopics.colors},
                hovertemplate: "<b>%{y}</b><br>%{x:,} documents · %{customdata[1]:.1f}%<br><i>%{customdata[0]}</i><extra></extra>",
              } as Data]}
              layout={{
                height: Math.max(280, topTopics.names.length * 34),
                margin: {l: 12, r: 24, t: 8, b: 40},
                xaxis: {title: {text: t("documents")}, rangemode: "tozero"},
                yaxis: {automargin: true, ticksuffix: "  ", tickfont: {size: 12}},
                bargap: 0.35,
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
