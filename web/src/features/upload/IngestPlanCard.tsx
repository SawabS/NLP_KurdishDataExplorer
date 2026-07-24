import { Check, Cpu, Info, Minus, SlidersHorizontal } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Badge, FormField, Select, Typography } from "noor-ui";
import type { FileProfile, ModelCard } from "../../api/types";

export interface Overrides {textCol?: string; labelCol?: string}

interface Props {
  profile: FileProfile;
  model?: ModelCard;
  overrides: Overrides;
  onOverrides: (value: Overrides) => void;
}

/**
 * The contract of the run, stated before it starts: how many documents, cut
 * from what, embedded by which model. Every automatic choice is visible here,
 * and the one guess that can be wrong on an unfamiliar dataset — which column
 * holds the text — stays correctable without turning this into a settings form.
 */
export function IngestPlanCard({profile, model, overrides, onOverrides}: Props) {
  const {plan} = profile;
  const textCol = overrides.textCol ?? plan.text_col ?? "";
  const labelCol = overrides.labelCol ?? plan.label_col ?? "(none)";
  const approx = plan.estimated ? "~" : "";
  const columnOptions = profile.fields.map((field) => ({value: field.name, label: field.name}));

  return (
    <section className="min-w-0 rounded-xl bg-surface shadow-sm">
      <div className="flex items-center gap-3 px-4 pt-4">
        <span className="grid size-7 place-items-center rounded-md bg-surface-raised text-caption font-semibold">03</span>
        <Cpu className="size-4" />
        <Typography variant="label">What gets embedded</Typography>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-heading-lg font-semibold tabular-nums">{approx}{plan.estimated_docs.toLocaleString()}</span>
          <span className="text-body-sm text-text-secondary">
            documents · one per {profile.kind === "table" ? "row" : profile.text_stats.unit}
            {plan.max_docs && plan.estimated_total_docs > plan.max_docs
              ? ` · sampled from ${approx}${plan.estimated_total_docs.toLocaleString()}`
              : ""}
          </span>
        </div>

        <ul className="mt-4 space-y-1.5">
          {[...plan.notes, ...(plan.normalize ? [{text: "Sorani text is KLPT-normalized before embedding", tone: "ok" as const}] : [])].map((note) => {
            const Icon = note.tone === "warn" ? Info : note.tone === "muted" ? Minus : Check;
            const tint = note.tone === "warn" ? "text-warning" : note.tone === "muted" ? "text-text-muted" : "text-success";
            return (
              <li key={note.text} className="flex gap-2 text-body-sm text-text-secondary">
                <Icon className={`mt-0.5 size-4 shrink-0 ${tint}`} /><span>{note.text}</span>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 rounded-lg bg-surface-raised p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-caption uppercase tracking-wide text-text-muted">Embedding model</p>
            {model?.hosted && <Badge variant="warning">hosted API · may incur cost</Badge>}
          </div>
          <p className="mt-1 text-body-sm">
            <span className="font-medium">{model ? model.provider : "…"}</span>
            {model && <span className="text-text-secondary"> · {model.name}</span>}
          </p>
          <p className="mt-1 text-caption text-text-muted">
            Chosen automatically from the providers configured on the server; recorded with the run.
          </p>
        </div>

        {profile.kind === "table" && columnOptions.length > 1 && (
          <Accordion type="single" collapsible className="mt-2">
            <AccordionItem value="columns" className="border-0">
              <AccordionTrigger className="text-body-sm text-text-secondary">
                <span className="flex items-center gap-2"><SlidersHorizontal className="size-4" />Wrong column? Change it</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 pt-1 sm:grid-cols-2">
                  <FormField label="Document text">
                    <Select aria-label="Document text column" value={textCol} options={columnOptions} onValueChange={(value) => onOverrides({...overrides, textCol: value})} />
                  </FormField>
                  <FormField label="Category label">
                    <Select aria-label="Category label column" value={labelCol} options={[{value: "(none)", label: "No label"}, ...columnOptions]} onValueChange={(value) => onOverrides({...overrides, labelCol: value})} />
                  </FormField>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    </section>
  );
}
