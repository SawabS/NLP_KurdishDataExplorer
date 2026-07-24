import { X } from "lucide-react";
import { usePalette } from "../../../charts/palette";

export interface LegendTopic { topic: number; count: number; keywords: string }

/** Clickable topic legend for the document map. Selection syncs to ?topic= so
 *  Structure, Search, and Map all highlight the same topic (linked views). */
export function MapLegend({topics, highlight, onToggle}: {topics: LegendTopic[]; highlight?: number; onToggle: (topic?: number) => void}) {
  const palette = usePalette();
  if (!topics.length) return null;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-border px-4 py-2.5" role="group" aria-label="Topic legend">
      {topics.map((item) => {
        const active = highlight === item.topic;
        return (
          <button
            key={item.topic}
            type="button"
            aria-pressed={active}
            title={item.keywords}
            onClick={() => onToggle(active ? undefined : item.topic)}
            className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-caption tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${active ? "border-border-strong bg-surface-active text-text-primary" : "border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary"}`}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{backgroundColor: palette.colorForTopic(item.topic)}} aria-hidden="true" />
            <span>#{item.topic}</span>
            <span className="text-text-muted">{item.count.toLocaleString()}</span>
          </button>
        );
      })}
      {highlight !== undefined && (
        <button
          type="button"
          onClick={() => onToggle(undefined)}
          className="ms-1 flex items-center gap-1 rounded-md px-2 py-1 text-caption text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <X className="size-3" /> Clear highlight
        </button>
      )}
    </div>
  );
}
