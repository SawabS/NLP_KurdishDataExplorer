import { useMemo } from "react";
import DeckGL from "@deck.gl/react";
import { OrthographicView, type PickingInfo } from "@deck.gl/core";
import { ScatterplotLayer } from "@deck.gl/layers";
import { HexagonLayer } from "@deck.gl/aggregation-layers";
import type { Palette } from "../../../charts/palette";
import type { PointsData } from "../../../api/types";

interface Row {x: number; y: number; topic: number; keywords: string; text: string; label: string | null}

interface Props {
  data: PointsData;
  mode: "points" | "density";
  colorBy: "topic" | "category";
  highlight?: number;
  palette: Palette;
  onSelectTopic: (topic: number) => void;
}

/** #rrggbb or rgb(a)(...) -> deck.gl's [r,g,b,a] byte array. Values coming out
 *  of usePalette resolve CSS custom properties at runtime, so both forms
 *  need to be handled (browsers don't agree on which they normalize to). */
function toRGBA(color: string, alpha: number): [number, number, number, number] {
  if (color.startsWith("#")) {
    const hex = color.length === 4
      ? color.slice(1).split("").map((c) => c + c).join("")
      : color.slice(1);
    const value = parseInt(hex, 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha];
  }
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (match) {
    const [r, g, b] = match[1].split(",").map((part) => parseFloat(part.trim()));
    return [r, g, b, alpha];
  }
  return [128, 128, 128, alpha];
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[char]!));
}

/** WebGL point-cloud renderer for the semantic map, replacing the flat Plotly
 *  scattergl trace. Two modes: raw points (one dot per document) and a
 *  density aggregation (HexagonLayer) — a first step toward the "density-first,
 *  not every-point-equal" reading from the visualization research, without yet
 *  committing to automatic zoom-dependent level-of-detail. */
export function DeckMap({data, mode, colorBy, highlight, palette, onSelectTopic}: Props) {
  const rows: Row[] = useMemo(() => data.x.map((x, index) => ({
    x, y: data.y[index], topic: data.topic[index], keywords: data.keywords[index],
    text: data.text[index], label: data.label?.[index] ?? null,
  })), [data]);

  const bounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const row of rows) {
      if (row.x < minX) minX = row.x;
      if (row.x > maxX) maxX = row.x;
      if (row.y < minY) minY = row.y;
      if (row.y > maxY) maxY = row.y;
    }
    if (!Number.isFinite(minX)) return {spanX: 1, spanY: 1, centerX: 0, centerY: 0};
    return {
      spanX: Math.max(maxX - minX, 1e-6), spanY: Math.max(maxY - minY, 1e-6),
      centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2,
    };
  }, [rows]);

  const initialViewState = useMemo(() => ({
    target: [bounds.centerX, bounds.centerY, 0] as [number, number, number],
    zoom: Math.min(Math.log2(720 / bounds.spanX), Math.log2(600 / bounds.spanY)) - 0.3,
  }), [bounds]);

  // The highlighted set takes the SAME color as its topic everywhere else in the
  // app (Structure treemap, Insights bars) — not a generic warning tone — so a
  // selection reads as "this topic" rather than just "something is selected".
  const activeColor = highlight !== undefined ? toRGBA(palette.colorForTopic(highlight), 242) : undefined;
  const dimColor = toRGBA(palette.highlight.dim, 90);

  const layer = mode === "density"
    ? new HexagonLayer<Row>({
        id: "density",
        data: rows,
        getPosition: (row) => [row.x, row.y],
        radius: Math.max(bounds.spanX, bounds.spanY) / 32,
        colorRange: palette.sequential.map(([, color]) => toRGBA(color, 255).slice(0, 3) as [number, number, number]),
        pickable: true,
        extruded: false,
      })
    : new ScatterplotLayer<Row>({
        id: "points",
        data: rows,
        getPosition: (row) => [row.x, row.y],
        radiusUnits: "pixels",
        getRadius: (row) => highlight !== undefined ? (row.topic === highlight ? 5 : 3) : 3.5,
        getFillColor: (row) => {
          if (highlight !== undefined) return row.topic === highlight ? activeColor! : dimColor;
          const base = colorBy === "category"
            ? (row.label ? palette.colorForCategory(row.label) : palette.outlier)
            : palette.colorForTopic(row.topic);
          return toRGBA(base, row.topic < 0 ? 130 : 190);
        },
        pickable: true,
        updateTriggers: {getFillColor: [colorBy, highlight], getRadius: [highlight]},
      });

  const getTooltip = (info: PickingInfo) => {
    if (mode === "density") {
      const points = (info.object as {points?: unknown[]} | undefined)?.points;
      if (!points) return null;
      return {html: `<div>${points.length.toLocaleString()} documents</div>`, style: tooltipStyle};
    }
    const row = info.object as Row | undefined;
    if (!row) return null;
    return {
      html: `<div dir="auto" style="max-width:260px"><b>#${row.topic}</b> ${escapeHtml(row.keywords)}<br/>${escapeHtml(row.text)}</div>`,
      style: tooltipStyle,
    };
  };

  return (
    <DeckGL
      key={rows.length}
      views={new OrthographicView({id: "map"})}
      initialViewState={initialViewState}
      controller
      layers={[layer]}
      getTooltip={getTooltip}
      onClick={(info) => {
        if (mode === "points" && info.object) onSelectTopic((info.object as Row).topic);
      }}
      style={{position: "relative", width: "100%", height: "100%"}}
    />
  );
}

const tooltipStyle = {
  backgroundColor: "var(--n-surface-raised)", color: "var(--n-text-primary)",
  fontSize: "12px", borderRadius: "6px", padding: "6px 8px", border: "1px solid var(--n-border)",
};
