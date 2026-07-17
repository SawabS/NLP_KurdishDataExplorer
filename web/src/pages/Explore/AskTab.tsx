import { useEffect, useState } from "react";
import { ArrowUpRight, Search, Sparkles } from "lucide-react";
import { Alert, Badge, Button, Input, Progress, Skeleton, Typography } from "noor-ui";
import { useNavigate } from "react-router-dom";
import { useSearch } from "../../api/hooks";

const EXAMPLES = ["ئەنجامی یاری تۆپی پێ", "نرخی نەوت و دۆلار", "کۆرۆنا و ڤاکسین", "smartphones and technology"];

interface Props {source: string; model: string; params: URLSearchParams; setParams: (params: URLSearchParams) => void}

export function AskTab({source, model, params, setParams}: Props) {
  const initial = params.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [selectedTopic, setSelectedTopic] = useState<number>();
  const search = useSearch(source, model);
  const navigate = useNavigate();
  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    const next = new URLSearchParams(params); next.set("q", trimmed); setParams(next);
    search.mutate(trimmed);
  };
  useEffect(() => {
    if (initial && !search.data && !search.isPending) search.mutate(initial);
  }, [initial, search.data, search.isPending, search.mutate]);
  useEffect(() => {
    if (search.data?.results[0]) setSelectedTopic(search.data.results[0].topic_id);
  }, [search.data]);

  const selected = search.data?.results.find((result) => result.topic_id === selectedTopic) ?? search.data?.results[0];

  return (
    <div className="p-4 md:p-5">
      <section className="border-b border-border pb-5">
        <div className="flex items-center gap-2 text-text-secondary"><Sparkles className="size-4 text-accent-primary" /><Typography variant="label">Semantic search</Typography></div>
        <form className="mt-3 flex max-w-4xl gap-2" onSubmit={(event) => {event.preventDefault(); submit(query);}}>
          <div className="min-w-0 flex-1"><Input aria-label="Question or theme" value={query} onChange={(event) => setQuery(event.target.value)} leadingIcon={<Search className="size-4" />} placeholder="Search a question, event, or theme in Sorani or English" /></div>
          <Button type="submit" loading={search.isPending}>Search</Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">{EXAMPLES.map((example) => <button key={example} type="button" onClick={() => submit(example)} className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-caption text-text-secondary transition-colors hover:border-accent-primary hover:text-text-primary"><span dir="auto">{example}</span></button>)}</div>
      </section>

      {search.isPending && <div className="mt-6 space-y-3"><Alert title="Loading embedding model and matching topics" description="The first local-model query can take 10–30 seconds." /><Progress value={null} label="Matching query" /><Skeleton className="h-52 w-full" /></div>}
      {search.isError && <Alert className="mt-5" variant="danger" title="Search failed" description={search.error.message} />}
      {search.data && <div className="mt-5 grid min-h-[560px] overflow-hidden rounded-md border border-border bg-surface xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="border-b border-border xl:border-b-0 xl:border-e">
          <div className="border-b border-border px-4 py-3"><Typography variant="label">Ranked topics</Typography><p className="mt-0.5 truncate text-caption text-text-muted" dir="auto">{search.data.query}</p></div>
          <div className="divide-y divide-border">
            {search.data.results.map((result) => {
              const active = selected?.topic_id === result.topic_id;
              return <button key={result.topic_id} type="button" onClick={() => setSelectedTopic(result.topic_id)} className={`w-full px-4 py-4 text-start transition-colors ${active ? "bg-accent-primary/10" : "hover:bg-surface-raised"}`}>
                <div className="flex items-center gap-2"><span className="w-5 text-caption tabular-nums text-text-muted">{String(result.rank).padStart(2, "0")}</span><Typography variant="label">Topic {result.topic_id}</Typography><span className="ms-auto text-label tabular-nums">{Math.round(result.match)}%</span></div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-raised"><span className="block h-full bg-accent-primary" style={{width: `${result.match}%`}} /></div>
                <p dir="auto" lang="ckb" className="corpus-text mt-2 line-clamp-2 text-body-sm text-text-secondary">{result.keywords.join(" · ")}</p>
              </button>;
            })}
          </div>
        </div>

        {selected && <article className="min-w-0 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
            <div><div className="flex items-center gap-2"><Badge variant="info">#{selected.rank}</Badge><Typography variant="heading-sm">Topic {selected.topic_id}</Typography></div><p className="mt-2 corpus-text text-body-sm text-text-secondary" dir="auto" lang="ckb">{selected.keywords.join(" · ")}</p></div>
            <div className="text-end"><p className="text-heading-md font-semibold tabular-nums">{Math.round(selected.match)}%</p><p className="text-caption text-text-muted">semantic match</p></div>
          </div>
          <div className="mt-5 flex items-center justify-between"><Typography variant="label">Representative evidence</Typography><Badge>{selected.count.toLocaleString()} docs</Badge></div>
          <div className="mt-3 divide-y divide-border border-y border-border">
            {selected.samples.map((sample, index) => <div key={index} className="grid gap-2 py-4 md:grid-cols-[28px_minmax(0,1fr)_120px]">
              <span className="text-caption text-text-muted">{String(index + 1).padStart(2, "0")}</span>
              <p dir="auto" lang="ckb" className="corpus-text text-body-sm">{sample.text}</p>
              <span className="text-caption text-text-muted md:text-end">{sample.label ?? "Unlabeled"}</span>
            </div>)}
          </div>
          <Button className="mt-5" size="sm" variant="outline" onClick={() => navigate(`/explore/${encodeURIComponent(source)}/${encodeURIComponent(model)}/map?topic=${selected.topic_id}`)}>Locate on map <ArrowUpRight className="size-4" /></Button>
        </article>}
      </div>}
    </div>
  );
}
