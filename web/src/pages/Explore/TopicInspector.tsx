import { FileText, Hash } from "lucide-react";
import { Badge, EmptyState, Select, Skeleton, Typography } from "noor-ui";
import { useTopic } from "../../api/hooks";

export function TopicInspector({source, model, topicId, category, options, onChange}: {source: string; model: string; topicId?: number; category?: string; options: Array<{value: string; label: string}>; onChange: (id: number) => void}) {
  const detail = useTopic(source, model, topicId, category);
  if (!topicId && topicId !== 0) return <EmptyState heading="Select a leaf topic" description="Choose a topic from the hierarchy." />;

  return (
    <section className="flex h-full min-h-[560px] flex-col bg-surface">
      <div className="border-b border-border p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Hash className="size-4 text-accent-primary" /><Typography variant="label">Topic lens</Typography></div>
          {detail.data && <Badge>{detail.data.count.toLocaleString()} docs</Badge>}
        </div>
        <Select aria-label="Topic" value={String(topicId)} options={options} onValueChange={(value) => onChange(Number(value))} />
      </div>

      {detail.isLoading ? <Skeleton className="m-4 h-72" /> : detail.data ? <>
        <div className="border-b border-border p-4">
          <p className="mb-3 text-caption uppercase text-text-muted">Defining terms</p>
          <div className="flex flex-wrap gap-2" dir="auto" lang="ckb">
            {detail.data.keywords.map((item, index) => (
              <span key={item.word} className={`corpus-text rounded-md border px-2.5 py-1 text-body-sm ${index < 3 ? "border-accent-primary/30 bg-accent-primary/10 text-text-primary" : "border-border bg-surface-raised text-text-secondary"}`}>{item.word}</span>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center gap-2 text-caption uppercase text-text-muted"><FileText className="size-3.5" />Representative documents</div>
          <div className="space-y-3">
            {detail.data.samples.map((sample, index) => <article key={index} className="border-s-2 border-border ps-3">
              <p dir="auto" lang="ckb" className="corpus-text text-body-sm text-text-primary">{sample.text}</p>
              <div className="mt-1 flex items-center gap-2 text-caption text-text-muted">
                <span>{String(index + 1).padStart(2, "0")}</span>
                {sample.label && <><span>·</span><span>{sample.label}</span></>}
              </div>
              {sample.text_en && <p className="mt-1 text-caption text-text-muted">{sample.text_en}</p>}
            </article>)}
          </div>
        </div>
      </> : null}
    </section>
  );
}
