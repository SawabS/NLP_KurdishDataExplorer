import { useMemo } from "react";
import type { Layout } from "plotly.js";
import { useTheme } from "noor-ui/providers";

export const PASTELS = ["#8fb8e8", "#f2a7a0", "#9fd3b4", "#f1cf82", "#c5a6dc", "#8fd0d5", "#eda9c4", "#b7c8e8"];

export function usePlotlyTheme(): Partial<Layout> {
  const { resolvedTheme } = useTheme();
  return useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    const foreground = token("--n-text-primary", resolvedTheme === "dark" ? "#e7eaf2" : "#2b3039");
    const muted = token("--n-text-muted", resolvedTheme === "dark" ? "#9aa3b5" : "#6b7280");
    const soft = token("--n-surface-raised", resolvedTheme === "dark" ? "#272c3a" : "#eef1f7");
    const border = token("--n-border", resolvedTheme === "dark" ? "#2f3547" : "#e4e8f1");
    return {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: {color: foreground, family: "IBM Plex Sans Arabic, Noto Sans Arabic, sans-serif"},
      colorway: PASTELS,
      xaxis: {gridcolor: soft, zerolinecolor: border, tickfont: {color: muted}, title: {font: {color: muted}}},
      yaxis: {gridcolor: soft, zerolinecolor: border, tickfont: {color: muted}, title: {font: {color: muted}}},
      hoverlabel: {bgcolor: token("--n-surface", "#fff"), bordercolor: border, font: {color: foreground}},
      legend: {font: {color: foreground}, title: {font: {color: muted}}},
    };
  }, [resolvedTheme]);
}
