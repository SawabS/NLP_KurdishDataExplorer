import { useEffect, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, Circle, FileSearch, ListFilter, MessageSquareText, Search, Sparkles } from "lucide-react";
import { Alert, Badge, Button, Input, Skeleton, Spinner, Typography } from "noor-ui";
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
        <AskLoadingState />
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

const askSteps: Array<{label: string; detail: string; icon: ComponentType<{className?: string}>}> = [
  {label: "Finding evidence", detail: "Searching the corpus for relevant passages", icon: FileSearch},
  {label: "Checking relevance", detail: "Ranking the strongest matches", icon: ListFilter},
  {label: "Writing the answer", detail: "Grounding every claim in a source", icon: MessageSquareText},
];

/** The Ask endpoint performs retrieval, ranking, then generation in one
 * request. Time-based staging communicates that real sequence without showing
 * a fake percentage or an indeterminate full-width progress bar. */
function AskLoadingState() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const rankTimer = window.setTimeout(() => setActiveStep(1), 1_500);
    const answerTimer = window.setTimeout(() => setActiveStep(2), 4_000);
    return () => {
      window.clearTimeout(rankTimer);
      window.clearTimeout(answerTimer);
    };
  }, []);

  return (
    <div className="mt-5 max-w-4xl space-y-4" role="status" aria-live="polite">
      <section className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary-action/10 text-primary-action">
            <Spinner size="sm" label="" />
          </span>
          <div>
            <Typography variant="label">Building a grounded answer</Typography>
            <p className="mt-0.5 text-caption text-text-muted">This can take a moment for a large corpus.</p>
          </div>
        </div>

        <ol className="mt-4 grid gap-2 sm:grid-cols-3">
          {askSteps.map((step, index) => {
            const Icon = step.icon;
            const done = index < activeStep;
            const active = index === activeStep;
            return (
              <li
                key={step.label}
                aria-current={active ? "step" : undefined}
                className={`rounded-lg border p-3 transition-colors ${
                  active ? "border-primary-action/40 bg-primary-action/5" : "border-border bg-surface-raised/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  {done
                    ? <CheckCircle2 className="size-4 shrink-0 text-success" />
                    : active
                      ? <Icon className="size-4 shrink-0 text-primary-action" />
                      : <Circle className="size-4 shrink-0 text-text-muted" />}
                  <span className={`text-body-sm font-medium ${active ? "text-text-primary" : "text-text-secondary"}`}>{step.label}</span>
                </div>
                <p className="mt-1 ps-6 text-caption text-text-muted">{step.detail}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.25fr)_minmax(240px,.75fr)]" aria-hidden="true">
        <section className="rounded-xl bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-2"><Skeleton className="size-4 rounded-full" /><Skeleton className="h-4 w-20" /></div>
          <div className="mt-4 space-y-2.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[92%]" />
            <Skeleton className="h-3 w-[78%]" />
            <Skeleton className="mt-4 h-3 w-[88%]" />
            <Skeleton className="h-3 w-[64%]" />
          </div>
        </section>
        <section className="rounded-xl bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between"><Skeleton className="h-4 w-16" /><Skeleton className="h-3 w-14" /></div>
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex gap-3">
                <Skeleton className="size-6 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
