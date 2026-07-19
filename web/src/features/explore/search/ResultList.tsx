import { Typography } from "noor-ui";
import type { SearchResult } from "../../../api/types";

interface Props {
  data: SearchResult;
  selectedId?: number;
  onSelect: (topicId: number) => void;
}

export function ResultList({data, selectedId, onSelect}: Props) {
  return (
    <div>
      <div className="border-b border-border px-4 py-3">
        <Typography variant="label">Ranked topics</Typography>
        <p className="mt-0.5 truncate text-caption text-text-muted" dir="auto">{data.query}</p>
      </div>
      <div className="divide-y divide-border" role="listbox" aria-label="Ranked topics">
        {data.results.map((result) => {
          const active = selectedId === result.topic_id;
          return (
            <button
              key={result.topic_id}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onSelect(result.topic_id)}
              className={`w-full px-4 py-4 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring ${active ? "bg-info-bg" : "hover:bg-surface-raised"}`}
            >
              <div className="flex items-center gap-2">
                <span className="w-5 text-caption tabular-nums text-text-muted">{String(result.rank).padStart(2, "0")}</span>
                <Typography variant="label">Topic {result.topic_id}</Typography>
                <span className="ms-auto text-label tabular-nums">{Math.round(result.match)}%</span>
              </div>
              <div
                className="mt-2 h-1 overflow-hidden rounded-full bg-surface-raised"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(result.match)}
                aria-label={`Semantic match ${Math.round(result.match)}%`}
              >
                <span className="block h-full bg-primary-action" style={{width: `${result.match}%`}} />
              </div>
              <p dir="auto" lang="ckb" className="corpus-text mt-2 line-clamp-2 text-body-sm text-text-secondary">{result.keywords.join(" · ")}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
