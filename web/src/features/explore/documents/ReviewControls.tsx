import { useEffect, useState } from "react";
import { Button, Checkbox, Input, Label, SegmentedControl, Textarea } from "noor-ui";
import { useDeleteAnnotation, useSaveAnnotation } from "../../../api/hooks";
import { QUALITY_FLAGS, type DocAnnotation, type ReviewStatus } from "../../../api/types";

const STATUSES: ReviewStatus[] = ["pending", "draft", "reviewed", "discarded"];
const QUALITY_LABELS: Record<string, string> = {
  duplicate: "Duplicate", noisy: "Noisy", malformed: "Malformed",
  off_topic: "Off-topic", low_confidence: "Low confidence",
};

interface Form { status: ReviewStatus; topic_label: string; language: string; quality: string[]; note: string }

function toForm(annotation?: DocAnnotation | null): Form {
  return {
    status: annotation?.status ?? "pending",
    topic_label: annotation?.topic_label ?? "",
    language: annotation?.language ?? "",
    quality: annotation?.quality ?? [],
    note: annotation?.note ?? "",
  };
}

/** Persistence-backed correction of one document's derived data. Every change is
 *  explicit (Save writes annotations.json server-side; survives refresh) — no
 *  correction silently lost, per the review-workflow requirement. */
export function ReviewControls({source, model, docId, annotation, onSaved}: {
  source: string; model: string; docId: number; annotation?: DocAnnotation | null; onSaved?: () => void;
}) {
  const save = useSaveAnnotation(source, model);
  const remove = useDeleteAnnotation(source, model);
  const [form, setForm] = useState<Form>(() => toForm(annotation));

  // Reseed when a different record (or a fresh server value) arrives.
  useEffect(() => { setForm(toForm(annotation)); }, [docId, annotation]);

  const patch = <K extends keyof Form>(key: K, value: Form[K]) => setForm((prev) => ({...prev, [key]: value}));
  const toggleFlag = (flag: string, on: boolean) =>
    setForm((prev) => ({...prev, quality: on ? [...prev.quality, flag] : prev.quality.filter((item) => item !== flag)}));

  const submit = () =>
    save.mutate(
      {docId, patch: {status: form.status, topic_label: form.topic_label.trim() || null,
        language: form.language.trim() || null, quality: form.quality, note: form.note.trim() || null}},
      {onSuccess: onSaved},
    );

  const savedAt = annotation?.updated_at ? new Date(annotation.updated_at) : null;

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-1.5 block text-caption text-text-muted">Review status</Label>
        <SegmentedControl
          aria-label="Review status"
          value={form.status}
          onValueChange={(value) => patch("status", value as ReviewStatus)}
          options={STATUSES.map((value) => ({value, label: value[0].toUpperCase() + value.slice(1)}))}
        />
      </div>

      <div>
        <Label htmlFor="review-topic" className="mb-1.5 block text-caption text-text-muted">Corrected topic name</Label>
        <Input id="review-topic" value={form.topic_label} placeholder="Override the derived topic name…"
          dir="auto" onChange={(event) => patch("topic_label", event.target.value)} />
      </div>

      <div>
        <Label htmlFor="review-language" className="mb-1.5 block text-caption text-text-muted">Language / dialect</Label>
        <Input id="review-language" value={form.language} placeholder="e.g. ckb, kmr, sdh, ar, en"
          onChange={(event) => patch("language", event.target.value)} />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-caption text-text-muted">Data-quality flags</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {QUALITY_FLAGS.map((flag) => (
            <Checkbox key={flag} label={QUALITY_LABELS[flag]} checked={form.quality.includes(flag)}
              onCheckedChange={(value) => toggleFlag(flag, value === true)} />
          ))}
        </div>
      </fieldset>

      <div>
        <Label htmlFor="review-note" className="mb-1.5 block text-caption text-text-muted">Note</Label>
        <Textarea id="review-note" value={form.note} rows={2} dir="auto" placeholder="Optional reviewer note…"
          onChange={(event) => patch("note", event.target.value)} />
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save review"}</Button>
        {annotation && (
          <Button variant="ghost" onClick={() => remove.mutate(docId)} disabled={remove.isPending}>Clear</Button>
        )}
        {savedAt && <span className="text-caption text-text-muted" aria-live="polite">Saved {savedAt.toLocaleString()}</span>}
      </div>
      {save.isError && <p className="text-caption text-danger" role="alert">{(save.error as Error).message}</p>}
    </div>
  );
}
