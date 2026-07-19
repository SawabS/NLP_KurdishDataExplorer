import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "noor-ui";
import { invalidateRun, useActiveJobs } from "../api/hooks";
import type { Job } from "../api/types";

interface JobsContextValue {
  /** Fit jobs that are currently queued or running, app-wide. */
  active: Job[];
}

const JobsContext = createContext<JobsContextValue>({active: []});
export const useJobs = () => useContext(JobsContext);

/**
 * Single owner of background-fit lifecycle: polls /jobs, toasts on completion
 * or failure from ANY page, and performs the scoped cache invalidation that
 * used to be duplicated across page-level useEffects.
 */
export function JobsProvider({ children }: { children: ReactNode }) {
  const jobs = useActiveJobs();
  const client = useQueryClient();
  const { toast } = useToast();
  const seen = useRef(new Map<string, Job["status"]>());

  useEffect(() => {
    for (const job of jobs.data ?? []) {
      const previous = seen.current.get(job.id);
      if (previous && previous !== job.status) {
        if (job.status === "done") {
          toast({variant: "success", title: "Fit complete", description: job.result ? `${job.result.source} · ${job.result.n_topics} topics from ${job.result.n_docs.toLocaleString()} documents` : job.message});
          invalidateRun(client, job.result?.source, job.result?.model);
        } else if (job.status === "error") {
          toast({variant: "danger", title: "Fit failed", description: job.error ?? job.message});
        }
      }
      seen.current.set(job.id, job.status);
    }
  }, [client, jobs.data, toast]);

  const value = useMemo(() => ({
    active: (jobs.data ?? []).filter((job) => !["done", "error"].includes(job.status)),
  }), [jobs.data]);

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}
