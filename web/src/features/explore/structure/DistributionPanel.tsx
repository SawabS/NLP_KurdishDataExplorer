import type { Data } from "plotly.js";
import { Skeleton, Typography } from "noor-ui";
import { useDistribution } from "../../../api/hooks";
import { Plot } from "../../../charts/Plot";
import { usePalette } from "../../../charts/palette";

/** Topic composition across the active category set. Heatmap ramp is
 *  theme-aware (palette.sequential) instead of a hardcoded light-only scale. */
export function DistributionPanel({source, model}: {source: string; model: string}) {
  const distribution = useDistribution(source, model);
  const palette = usePalette();
  return (
    <section className="min-w-0 rounded-xl bg-surface shadow-sm">
      <div className="px-4 pb-1 pt-3"><Typography variant="label">Corpus distribution</Typography><p className="text-caption text-text-muted">Topic composition across the active category set</p></div>
      <div className="p-3">
        {distribution.isLoading ? <Skeleton className="h-[420px] w-full" /> : distribution.data?.kind === "heatmap" ? (
          <Plot data={[{type: "heatmap", x: distribution.data.categories, y: distribution.data.topics, z: distribution.data.shares, customdata: distribution.data.counts, colorscale: palette.sequential, hovertemplate: "topic %{y} · %{x}<br>%{z:.0f}% (%{customdata:,} docs)<extra></extra>", colorbar: {title: {text: "%"}}} as Data]} layout={{height: 430, margin: {l: 55, r: 30, t: 8, b: 70}}} />
        ) : distribution.data?.kind === "bar" ? (
          <Plot data={[{type: "bar", orientation: "h", x: [...distribution.data.counts].reverse(), y: [...distribution.data.topics].reverse(), marker: {color: palette.kind.bertopic}, hovertemplate: "topic %{y}<br>%{x:,} docs<extra></extra>"} as Data]} layout={{height: 430, margin: {l: 55, r: 20, t: 8, b: 45}}} />
        ) : null}
      </div>
    </section>
  );
}
