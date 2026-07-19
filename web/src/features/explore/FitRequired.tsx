import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Button, Checkbox, Dialog } from "noor-ui";
import { api } from "../../api/client";
import { useJob, useModels } from "../../api/hooks";
import { JobProgress } from "./JobProgress";

/** Shown when the selected embedder has no saved artifact. Job-completion cache
 *  invalidation is owned globally by JobsProvider — no local invalidation here. */
export function FitRequired({source, model, referenceModel}: {source: string; model: string; referenceModel?: string}) {
  const models = useModels();
  const [ack, setAck] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [jobId, setJobId] = useState<string>();
  const fit = useMutation({mutationFn: () => api.fitRun({source, model, reference_model: referenceModel})});
  const job = useJob(jobId);
  const registry = models.data?.models.find((item) => item.key === model);
  const needsKey = registry && !registry.key_present;
  const hosted = model === "openai" || model === "nvidia";
  const estimate = useQuery({queryKey: ["estimate", source, model], queryFn: ({signal}) => api.estimate(source, model, signal), enabled: model === "openai" && !needsKey});

  useEffect(() => {
    if (fit.data?.job_id) {
      setJobId(fit.data.job_id);
      setCostOpen(false);
    }
  }, [fit.data]);

  return (
    <div className="mx-auto max-w-content-md space-y-4 p-6 py-10">
      <Alert variant="warning" title="Fit required" description="This source has no saved artifact for the selected embedding model." />
      {needsKey && <Alert variant="danger" title="Provider key unavailable" description={`Configure the required ${model.toUpperCase()} API key in the server environment.`} />}
      <p className="text-body-sm text-text-secondary">Fits run one at a time in a dedicated worker. You can reload this page and reattach from the active job list.</p>
      {!jobId && (hosted ? <Button disabled={Boolean(needsKey) || !referenceModel} onClick={() => setCostOpen(true)}>Review and fit</Button> : <Button disabled={!referenceModel} loading={fit.isPending} onClick={() => fit.mutate()}>Fit selected model</Button>)}
      <Dialog open={costOpen} onOpenChange={setCostOpen} title={`Fit with ${registry?.label ?? model}`} description="The source text will be sent to the selected hosted embedding provider and API charges may apply.">
        <div className="space-y-4">
          <div className="rounded-md bg-surface-raised p-3 text-body-sm text-text-secondary">
            <p>{estimate.data?.n_docs.toLocaleString() ?? "—"} documents</p>
            {model === "openai" && <p aria-live="polite">{estimate.isLoading ? "Estimating tokens…" : estimate.data?.estimated_tokens ? `${estimate.data.estimated_tokens.toLocaleString()} estimated tokens · theoretical minimum ${formatDuration(estimate.data.minimum_minutes ?? 0)}` : "Token estimate unavailable"}</p>}
          </div>
          <Checkbox checked={ack} onCheckedChange={(value) => setAck(value === true)} label="I understand the data-sharing and cost implications" />
          <Button fullWidth disabled={!ack} loading={fit.isPending} onClick={() => fit.mutate()}>Acknowledge and start fit</Button>
        </div>
      </Dialog>
      {fit.isError && <Alert variant="danger" title="Could not start fit" description={fit.error.message} />}
      {job.data && <JobProgress job={job.data} />}
    </div>
  );
}

function formatDuration(minutes: number) {
  return minutes >= 60 ? `${(minutes / 60).toFixed(1)} hours` : `${minutes.toFixed(1)} minutes`;
}
