import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "./client";

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
      model: [
        {key: ["coherence", s, m], fn: (sig) => api.coherence(s, m, sig)},
        {key: ["baselines", s, m], fn: (sig) => api.baselines(s, m, sig)},
      ],
    };
    for (const {key, fn} of fetchers[tab] ?? []) {
      void client.prefetchQuery({queryKey: key, queryFn: ({signal}) => fn(signal), ...artifact});
    }
  };
}
