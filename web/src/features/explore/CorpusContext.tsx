import { Sparkles } from "lucide-react";
import { Badge, DataList, FormField, Select, Typography } from "noor-ui";
import type { RunMeta, SourceSummary } from "../../api/types";
import { compactModelLabel, compactSourceLabel } from "../../lib/labels";

interface Props {
  source: string;
  model: string;
  category: string;
  sourceInfo: SourceSummary;
  sources: SourceSummary[];
  run?: RunMeta;
  onSourceChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

export function CorpusContext({source, model, category, sourceInfo, sources, run, onSourceChange, onModelChange, onCategoryChange}: Props) {
  const fitted = sourceInfo.models.find((item) => item.key === model)?.fitted;
  return (
    <div className="p-5">
      <div className="flex items-center gap-2"><Sparkles className="size-4 text-text-secondary" /><Typography variant="label">Corpus context</Typography></div>
      <div className="mt-5 space-y-5">
        <FormField label="Source">
          <Select aria-label="Source" value={source} options={sources.map((item) => ({value: item.source, label: compactSourceLabel(item.title)}))} onValueChange={onSourceChange} />
        </FormField>
        <FormField label="Embedding model">
          <Select aria-label="Embedding model" value={model} options={sourceInfo.models.map((item) => ({value: item.key, label: `${compactModelLabel(item.key, item.label)}${item.fitted ? "" : " · fit required"}`}))} onValueChange={onModelChange} />
        </FormField>
        <FormField label="Category">
          <Select aria-label="Category" disabled={!sourceInfo.has_labels} value={category} options={[{value: "(all)", label: "All categories"}, ...sourceInfo.categories.map((value) => ({value, label: value}))]} onValueChange={onCategoryChange} />
        </FormField>
      </div>
      <div className="mt-7 border-t border-border pt-5">
        <p className="text-caption uppercase text-text-muted">Active artifact</p>
        <DataList
          className="mt-3"
          items={[
            {label: "Status", value: <Badge variant={fitted ? "success" : "warning"}>{fitted ? "Ready" : "Not fitted"}</Badge>},
            {label: "Corpus size", value: <span className="tabular-nums">{sourceInfo.n_docs.toLocaleString()}</span>},
            ...(run ? [{label: "Fit time", value: <span className="tabular-nums">{run.seconds}s</span>}] : []),
          ]}
        />
      </div>
    </div>
  );
}
