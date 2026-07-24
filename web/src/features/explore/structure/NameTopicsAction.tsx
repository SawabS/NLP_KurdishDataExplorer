import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Button, Spinner, Tooltip } from "noor-ui";
import { api } from "../../../api/client";
import { invalidateRun, useJob } from "../../../api/hooks";
import type { TopicRow } from "../../../api/types";

/** Generates (or regenerates) LLM topic names for an already-fitted run,
 *  purely from saved artifacts — no re-embedding. Only surfaced when some
 *  topics still show their raw keyword name instead of a real one. */
export function NameTopicsAction({source, model, topics}: {source: string; model: string; topics: TopicRow[]}) {
  const client = useQueryClient();
  const [jobId, setJobId] = useState<string>();
  const trigger = useMutation({
    mutationFn: () => api.labelTopics(source, model),
    onSuccess: (data) => setJobId(data.job_id),
  });
  const job = useJob(jobId);
  const running = trigger.isPending || (job.data && !["done", "error"].includes(job.data.status));

  useEffect(() => {
    if (job.data?.status === "done") {
      invalidateRun(client, source, model);
      setJobId(undefined);
    }
  }, [job.data?.status, client, source, model]);

  const unnamed = topics.some((item) => !item.label);
  if (!unnamed && !running) return null;

  return (
    <Tooltip content="Ask the chat model to name each topic in plain language, from its keywords and example documents.">
      <Button size="sm" variant="outline" disabled={running} onClick={() => trigger.mutate()}>
        {running ? <Spinner size="sm" /> : <Sparkles className="size-4" />}
        {running ? "Naming topics…" : "Name topics"}
      </Button>
    </Tooltip>
  );
}
