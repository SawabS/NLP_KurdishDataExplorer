import type { Data } from "plotly.js";
import { Alert, Badge, Skeleton, Typography } from "noor-ui";
import { useDistribution } from "../../../api/hooks";
import type { Distribution, TopicRow } from "../../../api/types";
import { Plot } from "../../../charts/Plot";
import { usePalette } from "../../../charts/palette";
import { topicName } from "../../../lib/labels";

/** Topic composition across the active category set. Heatmap ramp is
 *  theme-aware (palette.sequential) instead of a hardcoded light-only scale. */
export function DistributionPanel({
  source,
  model,
  topics,
  onSelect,
}: {
  source: string;
  model: string;
  topics: TopicRow[];
  onSelect?: (topic: number) => void;
}) {
  const distribution = useDistribution(source, model);
  const palette = usePalette();
  const topicById = new Map(topics.map((topic) => [topic.topic, topic]));
  const total = topics.reduce((sum, topic) => sum + topic.count, 0);
  const barDistribution: Extract<Distribution, {kind: "bar"}> | undefined =
    distribution.data?.kind === "bar" ? distribution.data : undefined;

  const ranked = barDistribution
    ? barDistribution.topics.map((rawTopic, index) => {
        const topic = Number(rawTopic);
        const count = barDistribution.counts[index];
        return {
          topic,
          count,
          label: topicById.has(topic) ? topicName(topicById.get(topic)!) : `Topic ${topic}`,
          share: total > 0 ? (count / total) * 100 : 0,
        };
      })
    : [];
  const visible = ranked.slice(0, 12);
  const visibleCount = visible.reduce((sum, row) => sum + row.count, 0);
  const otherCount = Math.max(0, total - visibleCount);
  const largestShare = visible[0]?.share ?? 0;

  return (
    <section className="min-w-0 rounded-xl bg-surface shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Typography variant="label">Corpus distribution</Typography>
          <p className="mt-0.5 text-caption text-text-muted">How clustered documents are divided across topics</p>
        </div>
        {!distribution.isLoading && distribution.data?.kind === "bar" && (
          <div className="flex flex-wrap gap-2">
            <Badge>{total.toLocaleString()} documents</Badge>
            <Badge>{topics.length.toLocaleString()} topics</Badge>
            <Badge variant="info">Largest {largestShare.toFixed(1)}%</Badge>
          </div>
        )}
      </div>
      <div className="p-4">
        {distribution.isLoading ? <DistributionSkeleton /> : distribution.isError ? (
          <Alert variant="danger" title="Distribution unavailable" description={distribution.error.message} />
        ) : distribution.data?.kind === "heatmap" ? (
          <Plot
            data={[{
              type: "heatmap",
              x: distribution.data.categories,
              y: distribution.data.topics.map((raw) => {
                const topic = topicById.get(Number(raw));
                return topic ? topicName(topic) : `Topic ${raw}`;
              }),
              z: distribution.data.shares,
              customdata: distribution.data.counts,
              colorscale: palette.sequential,
              hovertemplate: "%{y} · %{x}<br>%{z:.1f}% (%{customdata:,} docs)<extra></extra>",
              colorbar: {title: {text: "%"}},
            } as Data]}
            layout={{height: 430, margin: {l: 150, r: 30, t: 8, b: 70}}}
          />
        ) : distribution.data?.kind === "bar" ? (
          <div>
            <div className="space-y-3">
              {visible.map((row, index) => (
                <button
                  type="button"
                  key={row.topic}
                  onClick={() => onSelect?.(row.topic)}
                  className="group grid w-full grid-cols-[minmax(120px,1fr)_minmax(140px,1.5fr)_auto] items-center gap-3 rounded-md text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-body-sm font-medium text-text-primary group-hover:text-primary-action">{row.label}</span>
                    <span className="text-caption text-text-muted">Topic {row.topic}</span>
                  </span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-surface-raised">
                    <span
                      className="block h-full rounded-full transition-[width]"
                      style={{width: `${Math.max(row.share, 0.6)}%`, backgroundColor: palette.colorForTopic(row.topic)}}
                    />
                  </span>
                  <span className="w-24 text-end">
                    <span className="block text-body-sm tabular-nums text-text-primary">{row.count.toLocaleString()}</span>
                    <span className="text-caption tabular-nums text-text-muted">{row.share.toFixed(1)}%</span>
                  </span>
                  {index < visible.length - 1 && <span className="sr-only">Rank {index + 1}</span>}
                </button>
              ))}
            </div>
            {otherCount > 0 && (
              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-caption text-text-muted">
                <span>Remaining {Math.max(0, topics.length - visible.length)} topics</span>
                <span className="tabular-nums">{otherCount.toLocaleString()} · {total > 0 ? ((otherCount / total) * 100).toFixed(1) : "0.0"}%</span>
              </div>
            )}
          </div>
        ) : <p className="py-12 text-center text-body-sm text-text-muted">No topic distribution is available.</p>}
      </div>
    </section>
  );
}

function DistributionSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading corpus distribution">
      {[82, 68, 55, 46, 37, 30, 24].map((width, index) => (
        <div key={width} className="grid grid-cols-[minmax(120px,1fr)_minmax(140px,1.5fr)_auto] items-center gap-3">
          <div className="space-y-1.5"><Skeleton className="h-3.5" style={{width: `${Math.max(45, 90 - index * 6)}%`}} /><Skeleton className="h-2.5 w-12" /></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-raised"><Skeleton className="h-full rounded-full" style={{width: `${width}%`}} /></div>
          <div className="space-y-1.5"><Skeleton className="ms-auto h-3.5 w-14" /><Skeleton className="ms-auto h-2.5 w-9" /></div>
        </div>
      ))}
    </div>
  );
}
