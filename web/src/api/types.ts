export interface ModelOption { key: string; label: string; fitted: boolean }
export interface SourceSummary {
  source: string; title: string; has_labels: boolean; categories: string[]; n_docs: number; models: ModelOption[];
}
export interface ModelCard {
  key: string; label: string; name: string; provider: string; hosted: boolean; key_present: boolean;
}
export interface ModelRegistry { default: string; auto: ModelCard; models: ModelCard[] }

/** What the server actually embedded, and with what — written at fit time. */
export interface IngestMeta {
  file: string; format: string; bytes: number; kind: "text" | "table"; unit: string;
  text_col?: string | null; label_col?: string | null; min_words: number; normalized: boolean;
  documents_available: number; documents_embedded: number; sampled: boolean; embedding: ModelCard;
}
export interface RunMeta {
  source: string; title: string; model_key: string; model_name: string; n_docs: number; n_topics: number;
  n_outliers: number; coherence_npmi: Record<string, number>; normalized: boolean; has_labels: boolean;
  has_hierarchy: boolean; seconds: number; categories?: string[]; ingest?: IngestMeta | null;
}

/** Structure the server found in an uploaded file, plus the plan it derived. */
export interface FileField {
  name: string; dtype: "text" | "number" | "date" | "boolean"; fill_pct: number; unique: number;
  avg_words: number; arabic_pct: number; samples: string[];
}
export interface IngestPlan {
  split: "Line" | "Paragraph"; min_words: number; text_col: string | null; label_col: string | null;
  max_docs: number | null; normalize: boolean; estimated_docs: number; estimated_total_docs: number;
  estimated: boolean; notes: Array<{text: string; tone: "ok" | "muted" | "warn"}>;
}
export interface FileProfile {
  path: string; name: string; size: number; format: string; kind: "text" | "table";
  columns: string[]; fields: FileField[]; n_rows: number; exact_counts: boolean; sampled_units: number;
  text_stats: {
    unit: string; blank_line_pct: number; median_words: number; avg_words: number; max_words: number;
    duplicate_pct: number; scripts: {arabic: number; latin: number; digit: number; other: number};
  };
  preview: string[];
  plan: IngestPlan;
}
export interface TreeData {
  ids: string[]; parents: string[]; labels: string[]; values: number[]; kinds: string[]; categories: string[];
  topic_ids: Array<number | null>; samples: string[]; branchvalues: "total";
}
export interface TopicRow { topic: number; count: number; name: string; label?: string | null }
export interface TopicDetail {
  topic_id: number; count: number; label?: string | null; keywords: Array<{word: string; score: number}>;
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
export interface AskCitation {
  rank: number; doc_index: number; similarity: number; text: string; topic_id: number | null;
  topic_label?: string | null; keywords: string[]; category?: string | null;
}
export interface AskResult { query: string; answer: string; citations: AskCitation[]; error?: string | null }
export type ReviewStatus = "pending" | "draft" | "reviewed" | "discarded";
export const QUALITY_FLAGS = ["duplicate", "noisy", "malformed", "off_topic", "low_confidence"] as const;
export type QualityFlag = (typeof QUALITY_FLAGS)[number];

/** A human correction to one document's derived data (the Review workflow). */
export interface DocAnnotation {
  status?: ReviewStatus | null;
  topic_label?: string | null;
  language?: string | null;
  quality?: string[] | null;
  note?: string | null;
  updated_at?: string | null;
}
export interface DocumentRow {
  doc_id: number; text: string; words: number; topic: number; topic_label?: string | null;
  category?: string | null; outlier: boolean; x?: number | null; y?: number | null;
  annotation?: DocAnnotation | null;
}
export interface DocumentsPage { rows: DocumentRow[]; total: number; offset: number; limit: number }
export interface DocNeighbor { doc_id: number; similarity: number; text: string; topic: number; topic_label?: string | null }
export interface DocumentDetail extends DocumentRow { text_en?: string | null; neighbors: DocNeighbor[] }
export interface AnnotationSummary { annotated: number; by_status: Partial<Record<ReviewStatus, number>> }

/** Server-side query for the Documents workspace — every field is URL-serializable. */
export interface DocumentsQuery {
  offset?: number; limit?: number; topic?: number | null; category?: string | null;
  q?: string | null; status?: ReviewStatus | "unreviewed" | null;
  sort?: "doc_id" | "topic" | "words"; order?: "asc" | "desc";
}

export interface Job {
  id: string; kind: string; status: "queued" | "running" | "done" | "error"; message: string; fraction: number;
  created_at: string; updated_at: string; result?: {source: string; model: string; n_docs: number; n_topics: number}; error?: string;
}
