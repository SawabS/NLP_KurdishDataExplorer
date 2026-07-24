import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { DocAnnotation, DocumentsQuery } from "./types";

/** Artifact-derived data is immutable per (source, model) until a refit, which
 *  goes through `invalidateRun`. Cache it indefinitely — no spinner on revisit. */
const artifact = { staleTime: Infinity, gcTime: 30 * 60_000 } as const;

export const useSources = () => useQuery({queryKey: ["sources"], queryFn: ({signal}) => api.sources(signal)});
export const useModels = () => useQuery({queryKey: ["models"], queryFn: ({signal}) => api.models(signal)});
export const useRun = (s: string, m: string, enabled = true) => useQuery({queryKey: ["run", s, m], queryFn: ({signal}) => api.run(s, m, signal), enabled, ...artifact});
export const useTree = (s: string, m: string) => useQuery({queryKey: ["tree", s, m], queryFn: ({signal}) => api.tree(s, m, signal), ...artifact});
export const useTopics = (s: string, m: string, enabled = true) => useQuery({queryKey: ["topics", s, m], queryFn: ({signal}) => api.topics(s, m, signal), enabled: enabled && Boolean(s) && Boolean(m), ...artifact});
export const useTopic = (s: string, m: string, t?: number, category?: string) => useQuery({queryKey: ["topic", s, m, t, category], queryFn: ({signal}) => api.topic(s, m, t!, category, signal), enabled: t !== undefined, ...artifact});
export const usePoints = (s: string, m: string, max: number, category?: string) => useQuery({queryKey: ["points", s, m, max, category], queryFn: ({signal}) => api.points(s, m, max, category, signal), ...artifact});
export const useDistribution = (s: string, m: string) => useQuery({queryKey: ["distribution", s, m], queryFn: ({signal}) => api.distribution(s, m, signal), ...artifact});
export const useCoherence = (s: string, m: string) => useQuery({queryKey: ["coherence", s, m], queryFn: ({signal}) => api.coherence(s, m, signal), ...artifact});
export const useBaselines = (s: string, m: string) => useQuery({queryKey: ["baselines", s, m], queryFn: ({signal}) => api.baselines(s, m, signal), ...artifact});

/** Search is a cached, URL-driven query (was a mutation): back/forward works,
 *  repeat queries are instant, and abandoned queries abort. */
export const useSearchQuery = (s: string, m: string, q: string) =>
  useQuery({queryKey: ["search", s, m, q], queryFn: ({signal}) => api.search(s, m, q, signal), enabled: q.trim().length > 0, ...artifact, retry: 0});

/** RAG answer for the Ask tab — same URL-driven caching as search above. */
export const useAskQuery = (s: string, m: string, q: string) =>
  useQuery({queryKey: ["ask", s, m, q], queryFn: ({signal}) => api.ask(s, m, q, signal), enabled: q.trim().length > 0, ...artifact, retry: 0});

/** Documents workspace list. Document *content* is immutable per (source, model),
 *  but human annotations mutate it — so this is a normal cache invalidated by the
 *  annotation mutations below, and keeps the previous page visible while paging. */
export const useDocuments = (s: string, m: string, query: DocumentsQuery, enabled = true) =>
  useQuery({
    queryKey: ["documents", s, m, query], queryFn: ({signal}) => api.documents(s, m, query, signal),
    enabled: enabled && Boolean(s) && Boolean(m), placeholderData: keepPreviousData, staleTime: 15_000,
  });

export const useDocument = (s: string, m: string, docId?: number) =>
  useQuery({queryKey: ["document", s, m, docId], queryFn: ({signal}) => api.document(s, m, docId!, signal), enabled: docId !== undefined, staleTime: 15_000});

export const useAnnotationSummary = (s: string, m: string) =>
  useQuery({queryKey: ["annotations", s, m], queryFn: ({signal}) => api.annotationsSummary(s, m, signal), enabled: Boolean(s) && Boolean(m), staleTime: 15_000});

/** Refresh only the review-affected caches for this (source, model) after a save. */
function invalidateReview(client: QueryClient, s: string, m: string) {
  void client.invalidateQueries({
    predicate: (query) => {
      const [scope, qs, qm] = query.queryKey as [string, string, string];
      return ["documents", "document", "annotations"].includes(scope) && qs === s && qm === m;
    },
  });
}

export function useSaveAnnotation(s: string, m: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({docId, patch}: {docId: number; patch: DocAnnotation}) => api.saveAnnotation(s, m, docId, patch),
    onSuccess: () => invalidateReview(client, s, m),
  });
}

export function useDeleteAnnotation(s: string, m: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (docId: number) => api.deleteAnnotation(s, m, docId),
    onSuccess: () => invalidateReview(client, s, m),
  });
}

/** Permanently delete a corpus (all its runs + embeddings + uploaded file). */
export function useDeleteSource() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (source: string) => api.deleteSource(source),
    onSuccess: () => {
      client.clear(); // every artifact-derived cache referenced the deleted corpus
      void client.invalidateQueries({queryKey: ["sources"]});
    },
  });
}

export function useJob(id?: string) {
  return useQuery({
    queryKey: ["job", id], queryFn: ({signal}) => api.job(id!, signal), enabled: Boolean(id),
    refetchInterval: (query) => query.state.data && ["done", "error"].includes(query.state.data.status) ? false : 1000,
  });
}

/** Global list of background fits, polled while any job is live. */
export function useActiveJobs() {
  return useQuery({
    queryKey: ["jobs"], queryFn: ({signal}) => api.jobs(signal),
    refetchInterval: (query) => query.state.data?.some((job) => !["done", "error"].includes(job.status)) ? 2000 : 15_000,
  });
}

/** Scoped invalidation after a fit completes: refresh registries plus every
 *  cached query for the affected (source, model) — never the whole cache. */
export function invalidateRun(client: QueryClient, source?: string, model?: string) {
  void client.invalidateQueries({
    predicate: (query) => {
      const [scope, s, m] = query.queryKey as [string, ...unknown[]];
      if (["sources", "models", "jobs"].includes(scope)) return true;
      if (!source) return true;
      return s === source && (model === undefined || m === model);
    },
  });
}

/** Prefetch a workspace's data when its tab is hovered/focused. */
export function usePrefetchWorkspace(s: string, m: string) {
  const client = useQueryClient();
  return (tab: string) => {
    const fetchers: Record<string, Array<{key: readonly unknown[]; fn: (signal?: AbortSignal) => Promise<unknown>}>> = {
      tree: [
        {key: ["tree", s, m], fn: (sig) => api.tree(s, m, sig)},
        {key: ["topics", s, m], fn: (sig) => api.topics(s, m, sig)},
        {key: ["distribution", s, m], fn: (sig) => api.distribution(s, m, sig)},
      ],
      map: [{key: ["points", s, m, 12000, "(all)"], fn: (sig) => api.points(s, m, 12000, "(all)", sig)}],
      insights: [
        {key: ["topics", s, m], fn: (sig) => api.topics(s, m, sig)},
        {key: ["distribution", s, m], fn: (sig) => api.distribution(s, m, sig)},
      ],
    };
    for (const {key, fn} of fetchers[tab] ?? []) {
      void client.prefetchQuery({queryKey: key, queryFn: ({signal}) => fn(signal), ...artifact});
    }
  };
}
