import type { AnnotationSummary, AskResult, Coherence, DocAnnotation, DocumentDetail, DocumentsPage, DocumentsQuery, Distribution, FileProfile, Job, ModelRegistry, PointsData, RunMeta, SearchResult, SourceSummary, TopicDetail, TopicRow, TreeData } from "./types";

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

/** Only meaningful params are serialized, so cache keys stay stable and shareable. */
export function documentsQueryString(query: DocumentsQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === "" || value === "(all)") return;
    params.set(key, String(value));
  };
  set("offset", query.offset); set("limit", query.limit); set("topic", query.topic);
  set("category", query.category); set("q", query.q); set("status", query.status);
  set("sort", query.sort); set("order", query.order);
  const text = params.toString();
  return text ? `?${text}` : "";
}

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
  ask: (source: string, model: string, query: string, signal?: AbortSignal) => request<AskResult>(`${run(source, model)}/ask`, { method: "POST", body: JSON.stringify({query}), signal }),
  documents: (source: string, model: string, query: DocumentsQuery, signal?: AbortSignal) => request<DocumentsPage>(`${run(source, model)}/documents${documentsQueryString(query)}`, {signal}),
  document: (source: string, model: string, docId: number, signal?: AbortSignal) => request<DocumentDetail>(`${run(source, model)}/documents/${docId}`, {signal}),
  annotationsSummary: (source: string, model: string, signal?: AbortSignal) => request<AnnotationSummary>(`${run(source, model)}/annotations/summary`, {signal}),
  saveAnnotation: (source: string, model: string, docId: number, patch: DocAnnotation) => request<{doc_id: number; annotation: DocAnnotation}>(`${run(source, model)}/annotations/${docId}`, {method: "PUT", body: JSON.stringify(patch)}),
  deleteAnnotation: (source: string, model: string, docId: number) => request<{doc_id: number; annotation: null}>(`${run(source, model)}/annotations/${docId}`, {method: "DELETE"}),
  documentsExportUrl: (source: string, model: string, query: DocumentsQuery) => `/api${run(source, model)}/documents/export.csv${documentsQueryString({...query, offset: undefined, limit: undefined})}`,
  labelTopics: (source: string, model: string) => request<{job_id: string}>(`${run(source, model)}/label`, {method: "POST"}),
  upload: (file: File) => { const body = new FormData(); body.append("file", file); return request<FileProfile>("/uploads", {method: "POST", body}); },
  peek: (path: string) => request<FileProfile>("/uploads/peek", {method: "POST", body: JSON.stringify({path})}),
  fitRun: (body: {source: string; model: string; reference_model?: string}) => request<{job_id: string}>("/jobs/fit-run", {method: "POST", body: JSON.stringify(body)}),
  fitUpload: (body: Record<string, unknown>) => request<{job_id: string}>("/jobs/fit-upload", {method: "POST", body: JSON.stringify(body)}),
  job: (id: string, signal?: AbortSignal) => request<Job>(`/jobs/${id}`, {signal}),
  jobs: (signal?: AbortSignal) => request<Job[]>("/jobs", {signal}),
};
