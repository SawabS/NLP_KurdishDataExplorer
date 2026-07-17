import { useState } from "react";
import type { Data } from "plotly.js";
import { Activity, Cpu, Network, Tags } from "lucide-react";
import { Alert, Badge, SegmentedControl, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Typography } from "noor-ui";
import { useBaselines, useCoherence } from "../../api/hooks";
import { Plot } from "../../charts/Plot";

const MODEL_DETAILS: Record<string, {provider: string; family: string; note: string}> = {
  openai: {provider: "OpenAI", family: "Hosted embeddings", note: "Documents are embedded through the configured OpenAI provider, then clustered locally."},
  nvidia: {provider: "NVIDIA", family: "Hosted embeddings", note: "Documents are embedded through the configured NVIDIA provider, then clustered locally."},
  "kdx-minilm-tsdae": {provider: "Local", family: "Sorani-adapted MiniLM", note: "A multilingual MiniLM adapted on deduplicated Sorani sentences with TSDAE denoising."},
};

export function ModelTab({source, model}: {source: string; model: string}) {
  const coherence = useCoherence(source, model);
  const baselines = useBaselines(source, model);
  const baselineNames = Object.keys(baselines.data?.baselines ?? {});
  const [baseline, setBaseline] = useState("LDA");
  const details = MODEL_DETAILS[model] ?? {provider: "Configured", family: model, note: "The selected embedding model supplies document vectors; topic discovery and labeling run locally."};
  const rows = coherence.data ? [
    ...coherence.data.comparisons.map((item) => ({name: item.model === "kdx-minilm-tsdae" ? "Sorani MiniLM" : item.model === "minilm" ? "Base multilingual MiniLM" : item.label, value: item.npmi, kind: "BERTopic"})),
    ...Object.entries(coherence.data.scores).filter(([name]) => name !== "BERTopic").map(([name, value]) => ({name, value, kind: "Baseline"})),
  ] : [];
  const selectedBaseline = baselineNames.includes(baseline) ? baseline : baselineNames[0];

  return <div className="p-4 md:p-5">
    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="rounded-md border border-border bg-surface">
        <div className="border-b border-border p-4"><div className="flex items-center gap-2"><Cpu className="size-4 text-accent-primary" /><Typography variant="label">Model dossier</Typography></div><Typography className="mt-3 break-words" variant="heading-sm">{details.family}</Typography><p className="mt-2 text-body-sm text-text-secondary">{details.note}</p></div>
        <dl className="divide-y divide-border text-body-sm">
          <div className="flex items-center justify-between gap-3 p-4"><dt className="text-text-muted">Provider</dt><dd><Badge variant="info">{details.provider}</Badge></dd></div>
          <div className="flex items-center justify-between gap-3 p-4"><dt className="text-text-muted">Topic engine</dt><dd>BERTopic</dd></div>
          <div className="flex items-center justify-between gap-3 p-4"><dt className="text-text-muted">Projection</dt><dd>UMAP</dd></div>
          <div className="flex items-center justify-between gap-3 p-4"><dt className="text-text-muted">Clustering</dt><dd>HDBSCAN</dd></div>
          <div className="flex items-center justify-between gap-3 p-4"><dt className="text-text-muted">Topic terms</dt><dd>c-TF-IDF</dd></div>
        </dl>
        <div className="border-t border-border p-4">
          <p className="text-caption uppercase text-text-muted">Pipeline</p>
          <ol className="mt-3 space-y-3 text-body-sm">
            {[{icon: Cpu, text: "Embed documents"}, {icon: Network, text: "Project and cluster"}, {icon: Tags, text: "Extract topic terms"}].map((item, index) => <li key={item.text} className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-md bg-surface-raised text-caption tabular-nums">{index + 1}</span><item.icon className="size-4 text-text-muted" /><span>{item.text}</span></li>)}
          </ol>
        </div>
      </aside>

      <section className="min-w-0 rounded-md border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><div className="flex items-center gap-2"><Activity className="size-4 text-accent-primary" /><Typography variant="label">Coherence benchmark</Typography></div><p className="mt-0.5 text-caption text-text-muted">NPMI · higher is better</p></div></div>
        <div className="p-3">
          {coherence.isLoading ? <Skeleton className="h-[440px] w-full" /> : rows.length ? <Plot data={[{type: "bar", orientation: "h", y: [...rows].reverse().map((item) => item.name), x: [...rows].reverse().map((item) => item.value), text: [...rows].reverse().map((item) => item.value.toFixed(3)), textposition: "auto", marker: {color: [...rows].reverse().map((_, index) => ["#5a91c8", "#78b79a", "#e09868"][index % 3])}, customdata: [...rows].reverse().map((item) => item.kind), hovertemplate: "%{y}<br>NPMI %{x:.3f}<br>%{customdata}<extra></extra>"} as Data]} layout={{height: 460, margin: {l: 150, r: 30, t: 15, b: 45}, xaxis: {title: {text: "NPMI"}}}} /> : <Alert className="m-3" description="No coherence scores are stored for this source." />}
        </div>
      </section>
    </div>

    <section className="mt-5 min-w-0 overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"><div><Typography variant="label">Baseline vocabulary</Typography><p className="text-caption text-text-muted">Classical topic models retained for comparison</p></div>{baselineNames.length > 0 && <SegmentedControl aria-label="Baseline" value={selectedBaseline} options={baselineNames.map((value) => ({value, label: value}))} onValueChange={setBaseline} />}</div>
      {baselineNames.length ? <div className="max-h-[440px] overflow-auto"><Table><TableHeader><TableRow><TableHead className="w-24">Topic</TableHead><TableHead>Keywords</TableHead></TableRow></TableHeader><TableBody>{(baselines.data?.baselines[selectedBaseline] ?? []).map((words, index) => <TableRow key={index}><TableCell className="tabular-nums">{String(index).padStart(2, "0")}</TableCell><TableCell dir="auto" lang="ckb" className="corpus-text">{words.join(" · ")}</TableCell></TableRow>)}</TableBody></Table></div> : <p className="p-4 text-body-sm text-text-muted">LDA/NMF baselines were not computed for this run.</p>}
    </section>
  </div>;
}
