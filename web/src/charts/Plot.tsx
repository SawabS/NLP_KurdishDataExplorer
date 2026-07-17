import PlotlyPlot from "react-plotly.js";
import type { Config, Data, Layout, PlotMouseEvent } from "plotly.js";
import { usePlotlyTheme } from "./usePlotlyTheme";

interface Props {
  data: Data[];
  layout?: Partial<Layout>;
  className?: string;
  onClick?: (event: PlotMouseEvent) => void;
}

export function Plot({data, layout, className, onClick}: Props) {
  const theme = usePlotlyTheme();
  const config: Partial<Config> = {responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"]};
  return (
    <PlotlyPlot
      data={data}
      layout={{...theme, ...layout, autosize: true}}
      config={config}
      className={className ?? "h-full min-h-[420px] w-full"}
      useResizeHandler
      onClick={onClick}
    />
  );
}
