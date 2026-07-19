import type { Coherence, Distribution, Job, ModelRegistry, PointsData, RunMeta, SearchResult, SourceSummary, TopicDetail, TopicRow, TreeData } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(payload.detail ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

const run = (source: string, model: string) => `/runs/${encodeURIComponent(source)}/${encodeURIComponent(model)}`;

/** Every read endpoint forwards TanStack Query's AbortSignal so switching
 *  source/model/tab mid-flight cancels the request instead of racing the cache. */
export const api = {
  sources: (signal?: AbortSignal) => request<SourceSummary[]>("/sources", {signal}),
  models: (signal?: AbortSignal) => request<ModelRegistry>("/models", {signal}),
  run: (source: string, model: string, signal?: AbortSignal) => request<RunMeta>(run(source, model), {signal}),
  tree: (source: string, model: string, signal?: AbortSignal) => request<TreeData>(`${run(source, model)}/tree`, {signal}),
  topics: (source: string, model: string, signal?: AbortSignal) => request<{topics: TopicRow[]}>(`${run(source, model)}/topics`, {signal}),
  topic: (source: string, model: string, topic: number, category?: string, signal?: AbortSignal) => request<TopicDetail>(`${run(source, model)}/topics/${topic}${category && category !== "(all)" ? `?category=${encodeURIComponent(category)}` : ""}`, {signal}),
  points: (source: string, model: string, max: number, category?: string, signal?: AbortSignal) => request<PointsData>(`${run(source, model)}/points?max_points=${max}${category && category !== "(all)" ? `&category=${encodeURIComponent(category)}` : ""}`, {signal}),
  distribution: (source: string, model: string, signal?: AbortSignal) => request<Distribution>(`${run(source, model)}/distribution`, {signal}),
  coherence: (source: string, model: string, signal?: AbortSignal) => request<Coherence>(`${run(source, model)}/coherence`, {signal}),
  baselines: (source: string, model: string, signal?: AbortSignal) => request<{baselines: Record<string, string[][]>}>(`${run(source, model)}/baselines`, {signal}),
  estimate: (source: string, model: string, signal?: AbortSignal) => request<{n_docs: number; model: string; estimated_tokens?: number; safe_tpm?: number; minimum_minutes?: number}>(`${run(source, model)}/estimate`, {signal}),
  search: (source: string, model: string, query: string, signal?: AbortSignal) => request<SearchResult>(`${run(source, model)}/search`, { method: "POST", body: JSON.stringify({query}), signal }),
  upload: (file: File) => { const body = new FormData(); body.append("file", file); return request<{path: string; name: string; size: number; columns: string[]}>("/uploads", {method: "POST", body}); },
  peek: (path: string) => request<{path: string; name: string; size: number; columns: string[]; kind: "text" | "table"}>("/uploads/peek", {method: "POST", body: JSON.stringify({path})}),
  fitRun: (body: {source: string; model: string; reference_model?: string}) => request<{job_id: string}>("/jobs/fit-run", {method: "POST", body: JSON.stringify(body)}),
  fitUpload: (body: Record<string, unknown>) => request<{job_id: string}>("/jobs/fit-upload", {method: "POST", body: JSON.stringify(body)}),
  job: (id: string, signal?: AbortSignal) => request<Job>(`/jobs/${id}`, {signal}),
  jobs: (signal?: AbortSignal) => request<Job[]>("/jobs", {signal}),
};
