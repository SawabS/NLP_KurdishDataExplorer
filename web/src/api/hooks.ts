import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export const useSources = () => useQuery({queryKey: ["sources"], queryFn: api.sources});
export const useModels = () => useQuery({queryKey: ["models"], queryFn: api.models});
export const useRun = (s: string, m: string, enabled = true) => useQuery({queryKey: ["run", s, m], queryFn: () => api.run(s, m), enabled});
export const useTree = (s: string, m: string) => useQuery({queryKey: ["tree", s, m], queryFn: () => api.tree(s, m)});
export const useTopics = (s: string, m: string) => useQuery({queryKey: ["topics", s, m], queryFn: () => api.topics(s, m)});
export const useTopic = (s: string, m: string, t?: number, category?: string) => useQuery({queryKey: ["topic", s, m, t, category], queryFn: () => api.topic(s, m, t!, category), enabled: t !== undefined});
export const usePoints = (s: string, m: string, max: number, category?: string) => useQuery({queryKey: ["points", s, m, max, category], queryFn: () => api.points(s, m, max, category)});
export const useDistribution = (s: string, m: string) => useQuery({queryKey: ["distribution", s, m], queryFn: () => api.distribution(s, m)});
export const useCoherence = (s: string, m: string) => useQuery({queryKey: ["coherence", s, m], queryFn: () => api.coherence(s, m)});
export const useBaselines = (s: string, m: string) => useQuery({queryKey: ["baselines", s, m], queryFn: () => api.baselines(s, m)});
export const useSearch = (s: string, m: string) => useMutation({mutationFn: (q: string) => api.search(s, m, q)});
export function useJob(id?: string) {
  const client = useQueryClient();
  return useQuery({
    queryKey: ["job", id], queryFn: () => api.job(id!), enabled: Boolean(id),
    refetchInterval: (query) => query.state.data && ["done", "error"].includes(query.state.data.status) ? false : 1000,
    meta: {onDone: () => client.invalidateQueries()},
  });
}
