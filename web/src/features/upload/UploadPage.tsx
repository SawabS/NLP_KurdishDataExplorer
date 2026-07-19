import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileInput, Play, Settings2, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Checkbox, FormField, Input, SegmentedControl, Select, Slider, Switch, Typography } from "noor-ui";
import { api } from "../../api/client";
import { useJob, useModels } from "../../api/hooks";
import { compactModelLabel } from "../../lib/labels";
import { JobProgress } from "../explore/JobProgress";
import { SourceStep, type SelectedFile } from "./SourceStep";

export function UploadPage() {
  const navigate = useNavigate();
  const models = useModels();
  const activeJobs = useQuery({queryKey: ["jobs"], queryFn: ({signal}) => api.jobs(signal), refetchInterval: 2000});
  const [method, setMethod] = useState("upload");
  const [path, setPath] = useState("");
  const [selected, setSelected] = useState<SelectedFile>();
  const [split, setSplit] = useState("Line");
  const [minWords, setMinWords] = useState(3);
  const [textCol, setTextCol] = useState("");
  const [labelCol, setLabelCol] = useState("(none)");
  const [model, setModel] = useState("");
  const [normalize, setNormalize] = useState(true);
  const [maxDocs, setMaxDocs] = useState(20000);
  const [autoMcs, setAutoMcs] = useState(true);
  const [mcs, setMcs] = useState(50);
  const [baselines, setBaselines] = useState(false);
  const [costAck, setCostAck] = useState(false);
  const [jobId, setJobId] = useState<string>();
  const upload = useMutation({mutationFn: api.upload});
  const peek = useMutation({mutationFn: api.peek});
  const fit = useMutation({mutationFn: api.fitUpload});
  const job = useJob(jobId);

  useEffect(() => { if (models.data && !model) setModel(models.data.default); }, [model, models.data]);
  useEffect(() => {
    const payload = upload.data ?? peek.data;
    if (payload) {
      const kind = "kind" in payload && (payload.kind === "text" || payload.kind === "table")
        ? payload.kind
        : payload.columns.length ? "table" : "text";
      setSelected({...payload, kind});
      setTextCol(payload.columns[0] ?? "");
    }
  }, [peek.data, upload.data]);
  useEffect(() => { if (fit.data?.job_id) setJobId(fit.data.job_id); }, [fit.data]);
  // Cache invalidation on completion is owned by JobsProvider; this page only navigates.
  useEffect(() => {
    if (job.data?.status === "done" && job.data.result) {
      navigate(`/explore/${encodeURIComponent(job.data.result.source)}/${encodeURIComponent(job.data.result.model)}/tree`);
    }
  }, [job.data, navigate]);

  const registry = models.data?.models.find((item) => item.key === model);
  const hosted = model === "openai" || model === "nvidia";
  const blockers = [
    !selected && "select and inspect a source file",
    selected?.kind === "table" && !textCol && "choose a text column",
    Boolean(registry) && !registry!.key_present && "provider key missing on the server",
    hosted && Boolean(registry?.key_present) && !costAck && "acknowledge the hosted-run cost",
  ].filter((value): value is string => Boolean(value));
  const canSubmit = blockers.length === 0 && Boolean(model);
  const attachable = activeJobs.data?.find((item) => item.kind === "fit-upload" && !["done", "error"].includes(item.status));

  const start = () => {
    if (!selected) return;
    fit.mutate({
      path: selected.path,
      display_name: selected.name,
      split,
      min_words: minWords,
      text_col: selected.kind === "table" ? textCol : null,
      label_col: selected.kind === "table" ? labelCol : null,
      model,
      normalize,
      max_docs: maxDocs,
      auto_mcs: autoMcs,
      min_cluster_size: autoMcs ? null : mcs,
      with_baselines: baselines,
    });
  };

  return <div className="h-full overflow-y-auto bg-canvas">
    <div className="mx-auto max-w-[1380px] p-4 md:p-6">
      <header className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-caption uppercase text-text-muted">New corpus</p><Typography variant="heading-md">Build an analysis run</Typography></div>
        <p className="max-w-md text-body-sm text-text-secondary">Raw text or tabular data becomes an isolated, shareable topic workspace.</p>
      </header>

      {attachable && !jobId && <Alert className="mt-5" title="A fit is already in progress" description={<span>{attachable.message} <Button className="ms-2" size="sm" variant="link" onClick={() => setJobId(attachable.id)}>Reattach</Button></span>} />}

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <SourceStep
          method={method}
          onMethodChange={(value) => {setMethod(value); setSelected(undefined);}}
          path={path}
          onPathChange={setPath}
          selected={selected}
          uploading={upload.isPending}
          peeking={peek.isPending}
          error={(upload.error ?? peek.error)?.message}
          onUpload={(file) => upload.mutate(file)}
          onPeek={() => peek.mutate(path)}
        />

        {selected ? <form className="overflow-hidden rounded-md border border-border bg-surface" onSubmit={(event) => {event.preventDefault(); start();}}>
          <section>
            <div className="flex items-center gap-3 border-b border-border px-4 py-3"><span className="grid size-7 place-items-center rounded-md bg-surface-raised text-caption font-semibold">02</span><SlidersHorizontal className="size-4" /><Typography variant="label">Document rules</Typography></div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <FormField label="Minimum words per document"><Input type="number" min={1} max={50} value={minWords} onChange={(event) => setMinWords(Number(event.target.value))} /></FormField>
              {selected.kind === "text" ? <FormField label="Split documents by"><SegmentedControl aria-label="Split documents by" value={split} options={[{value: "Line", label: "Line"}, {value: "Paragraph", label: "Paragraph"}]} onValueChange={setSplit} /></FormField> : <><FormField label="Text column" required><Select aria-label="Text column" value={textCol} options={selected.columns.map((value) => ({value, label: value}))} onValueChange={setTextCol} /></FormField><FormField label="Label column"><Select aria-label="Label column" value={labelCol} options={[{value: "(none)", label: "No label"}, ...selected.columns.map((value) => ({value, label: value}))]} onValueChange={setLabelCol} /></FormField></>}
            </div>
          </section>

          <section className="border-t border-border">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3"><span className="grid size-7 place-items-center rounded-md bg-surface-raised text-caption font-semibold">03</span><Settings2 className="size-4" /><Typography variant="label">Model and fit</Typography></div>
            <div className="p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Embedding model"><Select aria-label="Embedding model" value={model} options={(models.data?.models ?? []).map((item) => ({value: item.key, label: `${compactModelLabel(item.key, item.label)}${item.key_present ? "" : " · key missing"}`, disabled: !item.key_present}))} onValueChange={setModel} /></FormField>
                <FormField label="Documents to embed"><Input type="number" min={500} max={200000} step={500} value={maxDocs} onChange={(event) => setMaxDocs(Number(event.target.value))} /></FormField>
              </div>
              <div className="mt-4 grid border-y border-border md:grid-cols-3 md:divide-x md:divide-border">
                <div className="py-2 md:pe-4"><Switch checked={normalize} onCheckedChange={setNormalize} label="KLPT normalization" description="Normalize raw Sorani" /></div>
                <div className="py-2 md:px-4"><Switch checked={autoMcs} onCheckedChange={setAutoMcs} label="Auto granularity" description="Scale clusters to corpus" /></div>
                <div className="py-2 md:ps-4"><Switch checked={baselines} onCheckedChange={setBaselines} label="LDA/NMF baselines" description="Add comparisons" /></div>
              </div>
              {!autoMcs && <div className="mt-4"><div className="flex justify-between text-body-sm"><span>Minimum cluster size</span><span className="tabular-nums">{mcs}</span></div><Slider className="mt-2" aria-label="Minimum cluster size" min={10} max={500} step={10} value={[mcs]} onValueChange={([value]) => setMcs(value)} /></div>}
              {hosted && <div className="mt-4"><Checkbox checked={costAck} onCheckedChange={(value) => setCostAck(value === true)} label="I understand this hosted embedding run may incur API charges" /></div>}
              {registry && !registry.key_present && <Alert className="mt-4" variant="danger" title="Provider key unavailable" description="Configure the provider key in the FastAPI server environment." />}
            </div>
          </section>

          <footer className="border-t border-border bg-surface-raised px-4 py-4">
            {!jobId && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* A disabled button always says WHY it's disabled. */}
                <p className="text-caption text-text-muted" aria-live="polite">
                  {canSubmit ? "Runs are queued and artifacts are saved automatically." : `To run: ${blockers.join("; ")}.`}
                </p>
                <Button type="submit" disabled={!canSubmit} loading={fit.isPending}><Play className="size-4" />Run pipeline</Button>
              </div>
            )}
            {fit.isError && <Alert variant="danger" title="Could not start fit" description={fit.error.message} />}
            {job.data && <JobProgress job={job.data} />}
          </footer>
        </form> : <section className="grid min-h-[460px] place-items-center rounded-md border border-dashed border-border bg-surface/50 p-8 text-center"><div><FileInput className="mx-auto size-8 text-text-muted" /><Typography className="mt-3" variant="heading-sm">Select source material</Typography><p className="mt-1 text-body-sm text-text-muted">Configuration appears after the file is inspected.</p></div></section>}
      </div>
    </div>
  </div>;
}
