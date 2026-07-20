import PlotlyPlot from "react-plotly.js";
import type { Config, Data, Layout, PlotMouseEvent } from "plotly.js";
import { useThemeSignal } from "./palette";
import { usePlotlyTheme } from "./usePlotlyTheme";

interface Props {
  data: Data[];
  layout?: Partial<Layout>;
  className?: string;
  onClick?: (event: PlotMouseEvent) => void;
}

export function Plot({data, layout, className, onClick}: Props) {
  const theme = usePlotlyTheme();
  // react-plotly.js does not re-apply nested layout colors when the palette
  // changes at runtime, so remount the plot once the live tokens update.
  const signal = useThemeSignal();
  // Interactive by default: users can scroll-zoom, drag-pan, and double-click to
  // reset. The mode bar stays visible so the affordance is discoverable instead
  // of hidden until hover.
  const config: Partial<Config> = {
    responsive: true,
    displaylogo: false,
    scrollZoom: true,
    doubleClick: "reset",
    displayModeBar: true,
    modeBarButtonsToRemove: ["lasso2d", "select2d"],
  };
  // Deep-merge the sub-objects a caller commonly customizes (axes, legend) so
  // adding e.g. an axis title never drops the theme's grid/tick/font colors —
  // the bug that made dark-mode legend text and axis ticks disappear.
  const merged: Partial<Layout> = {
    ...theme,
    ...layout,
    autosize: true,
    xaxis: {...theme.xaxis, ...layout?.xaxis},
    yaxis: {...theme.yaxis, ...layout?.yaxis},
    legend: {...theme.legend, ...layout?.legend},
  };
  return (
    <PlotlyPlot
      key={signal}
      data={data}
      layout={merged}
      config={config}
      className={className ?? "h-full min-h-[420px] w-full"}
      useResizeHandler
      onClick={onClick}
    />
  );
}
