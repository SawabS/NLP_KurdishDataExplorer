import { Database } from "lucide-react";
import { Badge, DataList, FormField, Select, Typography } from "noor-ui";
import type { RunMeta, SourceSummary } from "../../api/types";
import { useLocale } from "../../lib/i18n";
import { compactSourceLabel } from "../../lib/labels";

interface Props {
  source: string;
  category: string;
  sourceInfo: SourceSummary;
  sources: SourceSummary[];
  run?: RunMeta;
  onSourceChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

/** Left rail: what corpus am I looking at, and how do I slice it. The embedding
 *  model is deliberately not shown — the app is about the data, not the backend. */
export function CorpusContext({source, category, sourceInfo, sources, run, onSourceChange, onCategoryChange}: Props) {
  const { t } = useLocale();
  return (
    <div className="p-5">
      <div className="flex items-center gap-2"><Database className="size-4 text-text-secondary" /><Typography variant="label">{t("corpus")}</Typography></div>
      <div className="mt-5 space-y-5">
        <FormField label={t("corpus")}>
          <Select aria-label={t("corpus")} value={source} options={sources.map((item) => ({value: item.source, label: compactSourceLabel(item.title)}))} onValueChange={onSourceChange} />
        </FormField>
        <FormField label={t("categories")}>
          <Select aria-label={t("categories")} disabled={!sourceInfo.has_labels} value={category} options={[{value: "(all)", label: sourceInfo.has_labels ? "All categories" : "No categories"}, ...sourceInfo.categories.map((value) => ({value, label: value}))]} onValueChange={onCategoryChange} />
        </FormField>
      </div>
      <div className="mt-7 border-t border-border pt-5">
        <p className="text-caption uppercase text-text-muted">{t("glance")}</p>
        <DataList
          className="mt-3"
          items={[
            {label: t("documents"), value: <span className="tabular-nums">{sourceInfo.n_docs.toLocaleString()}</span>},
            ...(run ? [{label: t("topics"), value: <span className="tabular-nums">{run.n_topics.toLocaleString()}</span>}] : []),
            {label: t("categories"), value: sourceInfo.has_labels ? <Badge variant="info">{sourceInfo.categories.length}</Badge> : <span className="text-text-muted">—</span>},
          ]}
        />
      </div>
    </div>
  );
}
