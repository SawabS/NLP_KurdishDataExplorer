import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Alert, Button, Input, Progress, Skeleton, SuggestedPrompt, Typography } from "noor-ui";
import { useSearchQuery } from "../../../api/hooks";
import { ResultDetail } from "./ResultDetail";
import { ResultList } from "./ResultList";

const EXAMPLES = ["ئەنجامی یاری تۆپی پێ", "نرخی نەوت و دۆلار", "کۆرۆنا و ڤاکسین", "smartphones and technology"];

interface Props {source: string; model: string; params: URLSearchParams; setParams: (params: URLSearchParams) => void}

/**
 * Fully URL-driven: ?q= drives the (cached, abortable) search query and ?sel=
 * drives the selected result, so a shared link reproduces the exact view.
 */
export function SearchView({source, model, params, setParams}: Props) {
  const submitted = params.get("q") ?? "";
  const [draft, setDraft] = useState(submitted);
  const search = useSearchQuery(source, model, submitted);
  const selParam = params.has("sel") ? Number(params.get("sel")) : undefined;

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setDraft(trimmed);
    const next = new URLSearchParams(params);
    next.set("q", trimmed);
    next.delete("sel");
    setParams(next);
  };
  const select = (topicId: number) => {
    const next = new URLSearchParams(params);
    next.set("sel", String(topicId));
    setParams(next);
  };

  const selected = search.data?.results.find((result) => result.topic_id === selParam) ?? search.data?.results[0];

  return (
    <div className="p-4 md:p-5">
      <section className="border-b border-border pb-5">
        <div className="flex items-center gap-2 text-text-secondary"><Sparkles className="size-4" /><Typography variant="label">Semantic search</Typography></div>
        <form className="mt-3 flex max-w-4xl gap-2" onSubmit={(event) => {event.preventDefault(); submit(draft);}}>
          <div className="min-w-0 flex-1"><Input aria-label="Question or theme" value={draft} onChange={(event) => setDraft(event.target.value)} leadingIcon={<Search className="size-4" />} placeholder="Search a question, event, or theme in Sorani or English" /></div>
          <Button type="submit" loading={search.isFetching}>Search</Button>
        </form>
        {!search.data && !search.isFetching && (
          <div className="mt-4 grid max-w-4xl gap-2 sm:grid-cols-2">
            {EXAMPLES.map((example) => (
              <SuggestedPrompt key={example} dir="auto" lang="ckb" label={example} onClick={() => submit(example)} />
            ))}
          </div>
        )}
      </section>

      {search.isFetching && !search.data && (
        <div className="mt-6 space-y-3">
          <p className="text-body-sm text-text-secondary" aria-live="polite">
            Loading the embedding model and matching topics — the first local-model query can take 10–30 seconds.
          </p>
          <Progress value={null} label="Matching query" />
          <Skeleton className="h-52 w-full" />
        </div>
      )}
      {search.isError && <Alert className="mt-5" variant="danger" title="Search failed" description={search.error.message} />}
      {search.data && (
        <div className="mt-5 grid min-h-[560px] overflow-hidden rounded-md border border-border bg-surface xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="border-b border-border xl:border-b-0 xl:border-e">
            <ResultList data={search.data} selectedId={selected?.topic_id} onSelect={select} />
          </div>
          {selected && <ResultDetail source={source} model={model} result={selected} />}
        </div>
      )}
    </div>
  );
}
