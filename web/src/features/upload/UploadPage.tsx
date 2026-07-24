import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileInput, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Typography } from "noor-ui";
import { api } from "../../api/client";
import { useJob, useModels } from "../../api/hooks";
import type { FileProfile } from "../../api/types";
import { JobProgress } from "../explore/JobProgress";
import { FileProfileCard } from "./FileProfileCard";
import { IngestPlanCard, type Overrides } from "./IngestPlanCard";
import { SourceStep } from "./SourceStep";

/**
 * Upload is a two-beat flow: hand over a file, read what the server found in
 * it, run. No tuning is requested up front — the server derives the ingestion
 * plan from the file and this page reports that plan instead of asking for it.
 */
export function UploadPage() {
  const navigate = useNavigate();
  const models = useModels();
  const activeJobs = useQuery({queryKey: ["jobs"], queryFn: ({signal}) => api.jobs(signal), refetchInterval: 2000});
  const [method, setMethod] = useState("upload");
  const [path, setPath] = useState("");
  const [profile, setProfile] = useState<FileProfile>();
  const [overrides, setOverrides] = useState<Overrides>({});
  const [stale, setStale] = useState(false);
  const [jobId, setJobId] = useState<string>();
  const upload = useMutation({mutationFn: api.upload});
  const peek = useMutation({mutationFn: api.peek});
  const fit = useMutation({mutationFn: api.fitUpload});
  const job = useJob(jobId);

  useEffect(() => {
    const payload = upload.data ?? peek.data;
    if (!payload) return;
    // An API that predates file profiling answers without a plan. Say so
    // instead of rendering a half-defined profile and crashing on it.
    setStale(!payload.plan);
    setProfile(payload.plan ? payload : undefined);
    setOverrides({});
  }, [peek.data, upload.data]);
  useEffect(() => { if (fit.data?.job_id) setJobId(fit.data.job_id); }, [fit.data]);
  // Cache invalidation on completion is owned by JobsProvider; this page only navigates.
  useEffect(() => {
    if (job.data?.status === "done" && job.data.result) {
      navigate(`/explore/${encodeURIComponent(job.data.result.source)}/${encodeURIComponent(job.data.result.model)}/tree`);
    }
  }, [job.data, navigate]);

  const auto = models.data?.auto;
  const textCol = overrides.textCol ?? profile?.plan.text_col ?? null;
  const missingText = profile?.kind === "table" && !textCol;
  const attachable = activeJobs.data?.find((item) => item.kind === "fit-upload" && !["done", "error"].includes(item.status));

  const start = () => {
    if (!profile) return;
    fit.mutate({
      path: profile.path,
      display_name: profile.name,
      // Everything else is the server's plan; only a corrected guess travels.
      ...(overrides.textCol ? {text_col: overrides.textCol} : {}),
      ...(overrides.labelCol ? {label_col: overrides.labelCol} : {}),
    });
  };

  return <div className="h-full overflow-y-auto bg-canvas">
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <header className="flex flex-col gap-2 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-caption uppercase text-text-muted">New corpus</p><Typography variant="heading-md">Build an analysis run</Typography></div>
        <p className="max-w-md text-body-sm text-text-secondary">Drop in any text file or dataset. The server reads its structure and tells you what it will embed.</p>
      </header>

      {attachable && !jobId && <Alert className="mt-5" title="A fit is already in progress" description={<span>{attachable.message} <Button className="ms-2" size="sm" variant="link" onClick={() => setJobId(attachable.id)}>Reattach</Button></span>} />}

      {stale && <Alert className="mt-5" variant="danger" title="The API server is running older code" description="It answered without a file profile. Restart it (stop and re-run npm run dev) and inspect the file again." />}

      <div className="mt-5 grid gap-5">
        <SourceStep
          method={method}
          onMethodChange={(value) => {setMethod(value); setProfile(undefined); setStale(false);}}
          path={path}
          onPathChange={setPath}
          profile={profile}
          uploading={upload.isPending}
          peeking={peek.isPending}
          error={(upload.error ?? peek.error)?.message}
          onUpload={(file) => upload.mutate(file)}
          onPeek={() => peek.mutate(path)}
        />

        {profile ? <>
          <FileProfileCard profile={profile} />
          <IngestPlanCard profile={profile} model={auto} overrides={overrides} onOverrides={setOverrides} />
          <footer className="min-w-0 rounded-xl bg-surface px-4 py-4 shadow-sm">
            {!jobId && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* A disabled button always says WHY it's disabled. */}
                <p className="text-caption text-text-muted" aria-live="polite">
                  {missingText
                    ? "To run: choose the column that holds the document text."
                    : "Runs are queued and artifacts are saved automatically."}
                </p>
                <Button disabled={missingText} loading={fit.isPending} onClick={start}><Play className="size-4" />Run pipeline</Button>
              </div>
            )}
            {fit.isError && <Alert variant="danger" title="Could not start fit" description={fit.error.message} />}
            {job.data && <JobProgress job={job.data} />}
          </footer>
        </> : <section className="grid min-h-[220px] place-items-center rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center"><div><FileInput className="mx-auto size-8 text-text-muted" /><Typography className="mt-3" variant="heading-sm">Select source material</Typography><p className="mt-1 text-body-sm text-text-muted">The file&rsquo;s structure appears here once it is inspected.</p></div></section>}
      </div>
    </div>
  </div>;
}
