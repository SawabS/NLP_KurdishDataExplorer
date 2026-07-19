import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Typography } from "noor-ui";
import type { SearchResult } from "../../../api/types";

type Result = SearchResult["results"][number];

export function ResultDetail({source, model, result}: {source: string; model: string; result: Result}) {
  const navigate = useNavigate();
  return (
    <article className="min-w-0 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2"><Badge variant="info">#{result.rank}</Badge><Typography variant="heading-sm">Topic {result.topic_id}</Typography></div>
          <p className="corpus-text mt-2 text-body-sm text-text-secondary" dir="auto" lang="ckb">{result.keywords.join(" · ")}</p>
        </div>
        <div className="text-end"><p className="text-heading-md font-semibold tabular-nums">{Math.round(result.match)}%</p><p className="text-caption text-text-muted">semantic match</p></div>
      </div>
      <div className="mt-5 flex items-center justify-between"><Typography variant="label">Representative evidence</Typography><Badge>{result.count.toLocaleString()} docs</Badge></div>
      <div className="mt-3 divide-y divide-border border-y border-border">
        {result.samples.map((sample, index) => (
          <div key={index} className="grid gap-2 py-4 md:grid-cols-[28px_minmax(0,1fr)_120px]">
            <span className="text-caption text-text-muted">{String(index + 1).padStart(2, "0")}</span>
            <p dir="auto" lang="ckb" className="corpus-text text-body-sm">{sample.text}</p>
            <span className="text-caption text-text-muted md:text-end">{sample.label ?? "Unlabeled"}</span>
          </div>
        ))}
      </div>
      <Button className="mt-5" size="sm" variant="outline" onClick={() => navigate(`/explore/${encodeURIComponent(source)}/${encodeURIComponent(model)}/map?topic=${result.topic_id}`)}>
        Locate on map <ArrowUpRight className="size-4 rtl:rotate-180" />
      </Button>
    </article>
  );
}
