import { Alert, Progress } from "noor-ui";
import type { Job } from "../../api/types";

/** Shared fit-progress panel (Explore's FitRequired + Upload). Live region so
 *  screen readers hear stage changes without interruption spam. */
export function JobProgress({job}: {job: Job}) {
  const percent = Math.round(job.fraction * 100);
  return (
    <div className="space-y-2 rounded-md border border-border bg-surface p-4">
      <div className="flex justify-between gap-3 text-body-sm">
        <span aria-live="polite">{job.status === "queued" ? "Queued behind the current fit" : job.message}</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <Progress value={percent} label={job.message} />
      {job.error && <Alert variant="danger" title="Fit failed" description={job.error} />}
    </div>
  );
}
