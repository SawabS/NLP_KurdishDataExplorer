export interface ModelOption { key: string; label: string; fitted: boolean }
export interface SourceSummary {
  source: string; title: string; has_labels: boolean; categories: string[]; n_docs: number; models: ModelOption[];
}
export interface ModelRegistry { default: string; models: Array<{key: string; label: string; key_present: boolean}> }
export interface RunMeta {
  source: string; title: string; model_key: string; model_name: string; n_docs: number; n_topics: number;
  n_outliers: number; coherence_npmi: Record<string, number>; normalized: boolean; has_labels: boolean;
  has_hierarchy: boolean; seconds: number; categories?: string[];
}
export interface TreeData {
  ids: string[]; parents: string[]; labels: string[]; values: number[]; kinds: string[]; categories: string[];
  topic_ids: Array<number | null>; samples: string[]; branchvalues: "total";
}
export interface TopicRow { topic: number; count: number; name: string }
export interface TopicDetail {
  topic_id: number; count: number; keywords: Array<{word: string; score: number}>;
  samples: Array<{text: string; text_en?: string | null; label?: string | null}>;
}
export interface PointsData {
  x: number[]; y: number[]; topic: number[]; keywords: string[]; text: string[]; label?: Array<string | null>;
  shown: number; total: number;
}
export type Distribution =
  | {kind: "heatmap"; topics: string[]; categories: string[]; counts: number[][]; shares: number[][]}
  | {kind: "bar"; topics: string[]; counts: number[]};
export interface Coherence {
  scores: Record<string, number>; comparisons: Array<{model: string; label: string; npmi: number}>;
}
export interface SearchResult {
  query: string; best_topic_id: number | null; results: Array<{rank: number; topic_id: number; count: number; match: number;
  similarity: number; keywords: string[]; samples: Array<{text: string; text_en?: string | null; label?: string | null}>}>;
}
export interface Job {
  id: string; kind: string; status: "queued" | "running" | "done" | "error"; message: string; fraction: number;
  created_at: string; updated_at: string; result?: {source: string; model: string; n_docs: number; n_topics: number}; error?: string;
}
