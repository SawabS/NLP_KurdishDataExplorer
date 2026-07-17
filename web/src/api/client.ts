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

export const api = {
  sources: () => request<SourceSummary[]>("/sources"),
  models: () => request<ModelRegistry>("/models"),
  run: (source: string, model: string) => request<RunMeta>(run(source, model)),
  tree: (source: string, model: string) => request<TreeData>(`${run(source, model)}/tree`),
  topics: (source: string, model: string) => request<{topics: TopicRow[]}>(`${run(source, model)}/topics`),
  topic: (source: string, model: string, topic: number, category?: string) => request<TopicDetail>(`${run(source, model)}/topics/${topic}${category && category !== "(all)" ? `?category=${encodeURIComponent(category)}` : ""}`),
  points: (source: string, model: string, max: number, category?: string) => request<PointsData>(`${run(source, model)}/points?max_points=${max}${category && category !== "(all)" ? `&category=${encodeURIComponent(category)}` : ""}`),
  distribution: (source: string, model: string) => request<Distribution>(`${run(source, model)}/distribution`),
  coherence: (source: string, model: string) => request<Coherence>(`${run(source, model)}/coherence`),
  baselines: (source: string, model: string) => request<{baselines: Record<string, string[][]>}>(`${run(source, model)}/baselines`),
  estimate: (source: string, model: string) => request<{n_docs: number; model: string; estimated_tokens?: number; safe_tpm?: number; minimum_minutes?: number}>(`${run(source, model)}/estimate`),
  search: (source: string, model: string, query: string) => request<SearchResult>(`${run(source, model)}/search`, { method: "POST", body: JSON.stringify({query}) }),
  upload: (file: File) => { const body = new FormData(); body.append("file", file); return request<{path: string; name: string; size: number; columns: string[]}>("/uploads", {method: "POST", body}); },
  peek: (path: string) => request<{path: string; name: string; size: number; columns: string[]; kind: "text" | "table"}>("/uploads/peek", {method: "POST", body: JSON.stringify({path})}),
  fitRun: (body: {source: string; model: string; reference_model?: string}) => request<{job_id: string}>("/jobs/fit-run", {method: "POST", body: JSON.stringify(body)}),
  fitUpload: (body: Record<string, unknown>) => request<{job_id: string}>("/jobs/fit-upload", {method: "POST", body: JSON.stringify(body)}),
  job: (id: string) => request<Job>(`/jobs/${id}`),
  jobs: () => request<Job[]>("/jobs"),
};
