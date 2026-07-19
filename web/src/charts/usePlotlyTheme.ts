import { useMemo } from "react";
import type { Layout } from "plotly.js";
import { useTheme } from "noor-ui/providers";
import { cssToken, TOKEN_FALLBACKS, usePalette } from "./palette";

export function usePlotlyTheme(): Partial<Layout> {
  const { resolvedTheme } = useTheme();
  const palette = usePalette();
  return useMemo(() => {
    const mode = resolvedTheme === "dark" ? "dark" : "light";
    const token = (name: string) => cssToken(name, TOKEN_FALLBACKS[name]?.[mode] ?? "");
    const foreground = token("--n-text-primary");
    const muted = token("--n-text-muted");
    const soft = token("--n-surface-raised");
    const border = token("--n-border");
    return {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: {color: foreground, family: "IBM Plex Sans Arabic, Noto Sans Arabic, sans-serif"},
      colorway: palette.categorical,
      xaxis: {gridcolor: soft, zerolinecolor: border, tickfont: {color: muted}, title: {font: {color: muted}}},
      yaxis: {gridcolor: soft, zerolinecolor: border, tickfont: {color: muted}, title: {font: {color: muted}}},
      hoverlabel: {bgcolor: token("--n-surface"), bordercolor: border, font: {color: foreground}},
      legend: {font: {color: foreground}, title: {font: {color: muted}}},
    };
  }, [palette, resolvedTheme]);
}
