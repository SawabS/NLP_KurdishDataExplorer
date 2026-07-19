import { Cpu, Network, Tags } from "lucide-react";
import { Badge, DataList, Typography } from "noor-ui";

const MODEL_DETAILS: Record<string, {provider: string; family: string; note: string}> = {
  openai: {provider: "OpenAI", family: "Hosted embeddings", note: "Documents are embedded through the configured OpenAI provider, then clustered locally."},
  nvidia: {provider: "NVIDIA", family: "Hosted embeddings", note: "Documents are embedded through the configured NVIDIA provider, then clustered locally."},
  "kdx-minilm-tsdae": {provider: "Local", family: "Sorani-adapted MiniLM", note: "A multilingual MiniLM adapted on deduplicated Sorani sentences with TSDAE denoising."},
};

export function ModelDossier({model}: {model: string}) {
  const details = MODEL_DETAILS[model] ?? {provider: "Configured", family: model, note: "The selected embedding model supplies document vectors; topic discovery and labeling run locally."};
  return (
    <aside className="rounded-md border border-border bg-surface">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2"><Cpu className="size-4 text-text-secondary" /><Typography variant="label">Model dossier</Typography></div>
        <Typography className="mt-3 break-words" variant="heading-sm">{details.family}</Typography>
        <p className="mt-2 text-body-sm text-text-secondary">{details.note}</p>
      </div>
      <DataList
        className="p-4"
        items={[
          {label: "Provider", value: <Badge variant="info">{details.provider}</Badge>},
          {label: "Topic engine", value: "BERTopic"},
          {label: "Projection", value: "UMAP"},
          {label: "Clustering", value: "HDBSCAN"},
          {label: "Topic terms", value: "c-TF-IDF"},
        ]}
      />
      <div className="border-t border-border p-4">
        <p className="text-caption uppercase text-text-muted">Pipeline</p>
        <ol className="mt-3 space-y-3 text-body-sm">
          {[{icon: Cpu, text: "Embed documents"}, {icon: Network, text: "Project and cluster"}, {icon: Tags, text: "Extract topic terms"}].map((item, index) => (
            <li key={item.text} className="flex items-center gap-3">
              <span className="grid size-7 place-items-center rounded-md bg-surface-raised text-caption tabular-nums">{index + 1}</span>
              <item.icon className="size-4 text-text-muted" />
              <span>{item.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
