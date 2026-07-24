import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Search, Sparkles } from "lucide-react";
import { Alert, Badge, Button, Input, Progress, Skeleton, Typography } from "noor-ui";
import { useAskQuery } from "../../../api/hooks";

interface Props {source: string; model: string; params: URLSearchParams; setParams: (params: URLSearchParams) => void}

/**
 * RAG chat: the question is embedded, matched against the corpus's own
 * per-document vectors (not topic centroids), and the retrieved passages are
 * handed to the chat LLM to synthesize a grounded answer with citations.
 * Fully URL-driven (?q=) so a shared link reproduces the exact answer.
 */
export function SearchView({source, model, params, setParams}: Props) {
  const submitted = params.get("q") ?? "";
  const [draft, setDraft] = useState(submitted);
  const ask = useAskQuery(source, model, submitted);
  const navigate = useNavigate();

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setDraft(trimmed);
    const next = new URLSearchParams(params);
    next.set("q", trimmed);
    setParams(next);
  };

  return (
    <div className="p-4 md:p-6">
      <section className="pb-5">
        <div className="flex items-center gap-2 text-text-secondary"><Sparkles className="size-4" /><Typography variant="label">Ask the corpus</Typography></div>
        <p className="mt-1 max-w-4xl text-body-sm text-text-secondary">Ask a question in Sorani or English — the answer is generated from the corpus's own documents, with citations back to what was found.</p>
        <form className="mt-3 flex max-w-4xl gap-2" onSubmit={(event) => {event.preventDefault(); submit(draft);}}>
          <div className="min-w-0 flex-1"><Input aria-label="Question" value={draft} onChange={(event) => setDraft(event.target.value)} leadingIcon={<Search className="size-4" />} placeholder="e.g. what happened with election results?" /></div>
          <Button type="submit" loading={ask.isFetching}>Ask</Button>
        </form>
      </section>

      {ask.isFetching && !ask.data && (
        <div className="mt-6 max-w-4xl space-y-3">
          <p className="text-body-sm text-text-secondary" aria-live="polite">Retrieving matching documents and generating an answer…</p>
          <Progress value={null} label="Thinking" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}
      {ask.isError && <Alert className="mt-5 max-w-4xl" variant="danger" title="Ask failed" description={ask.error.message} />}

      {ask.data && (
        <div className="mt-5 max-w-4xl space-y-5">
          <section className="rounded-xl bg-surface p-4 shadow-sm md:p-5">
            <div className="flex items-center gap-2 text-text-secondary"><Sparkles className="size-4" /><Typography variant="label">Answer</Typography></div>
            {ask.data.answer ? (
              <p className="corpus-text mt-3 whitespace-pre-wrap text-body-md" dir="auto">{ask.data.answer}</p>
            ) : (
              <Alert
                className="mt-3"
                variant="warning"
                title="Couldn't generate an answer"
                description={ask.data.error ?? "The chat model didn't return a response — the passages below were still found and may help."}
              />
            )}
          </section>

          {ask.data.citations.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <Typography variant="label">Sources</Typography>
                <span className="text-caption text-text-muted">{ask.data.citations.length} passages</span>
              </div>
              <div className="divide-y divide-border overflow-hidden rounded-xl bg-surface shadow-sm">
                {ask.data.citations.map((citation) => (
                  <div key={citation.rank} className="grid gap-3 p-4 sm:grid-cols-[28px_minmax(0,1fr)_auto] sm:items-start">
                    <span className="text-caption tabular-nums text-text-muted">[{citation.rank}]</span>
                    <div className="min-w-0">
                      <p dir="auto" className="corpus-text text-body-sm">{citation.text}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {citation.topic_label && <Badge variant="info">{citation.topic_label}</Badge>}
                        {citation.category && <Badge>{citation.category}</Badge>}
                        <span className="text-caption text-text-muted">{Math.round(citation.similarity * 100)}% match</span>
                      </div>
                    </div>
                    {citation.topic_id !== null && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/explore/${encodeURIComponent(source)}/${encodeURIComponent(model)}/map?topic=${citation.topic_id}`)}
                      >
                        Locate <ArrowUpRight className="size-4 rtl:rotate-180" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
