import { FileSearch } from "lucide-react";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tooltip, Typography } from "noor-ui";
import type { FileProfile } from "../../api/types";

const formatBytes = (bytes: number) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log10(Math.max(bytes, 1)) / 3));
  const value = bytes / 1000 ** index;
  return `${value >= 100 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
};

/** Dominant writing system, stated the way a reader of the corpus would. */
function scriptLabel(scripts: FileProfile["text_stats"]["scripts"]) {
  const letters = scripts.arabic + scripts.latin;
  if (letters < 0.05) return "mostly numeric";
  const arabicShare = scripts.arabic / letters;
  if (arabicShare > 0.9) return "Arabic script (Sorani)";
  if (arabicShare > 0.35) return `mixed · ${Math.round(arabicShare * 100)}% Arabic script`;
  return "Latin script";
}

function Metric({label, value, hint}: {label: string; value: string; hint?: string}) {
  const metric = (
    <div>
      <p className="text-caption text-text-muted">{label}</p>
      <p className="mt-0.5 text-heading-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
  return hint ? <Tooltip content={hint}>{metric}</Tooltip> : metric;
}

/**
 * Answers "what did I just upload?" before anything is embedded: the shape of
 * the file, the meaning of each column, and real text from inside it. Nothing
 * here is a control — the user is reading, not configuring.
 */
export function FileProfileCard({profile}: {profile: FileProfile}) {
  const {plan, text_stats: stats} = profile;
  const approx = profile.exact_counts ? "" : "~";
  const unitLabel = profile.kind === "table" ? "rows" : stats.unit === "paragraph" ? "lines" : "lines";

  return (
    // min-w-0: a grid child sizes to its content by default, and one unbroken
    // line of Sorani would otherwise widen the whole page.
    <section className="min-w-0 rounded-xl bg-surface shadow-sm">
      <div className="flex flex-wrap items-center gap-3 px-4 pt-4">
        <span className="grid size-7 place-items-center rounded-md bg-surface-raised text-caption font-semibold">02</span>
        <FileSearch className="size-4" />
        <Typography variant="label">What&rsquo;s in this file</Typography>
        <Badge variant="neutral">{profile.kind === "table" ? "Tabular data" : "Plain text"}</Badge>
        <Badge variant="neutral">{profile.format.toUpperCase()}</Badge>
        <span className="text-caption text-text-muted">{formatBytes(profile.size)}</span>
      </div>

      <div className="flex flex-wrap gap-x-10 gap-y-4 p-4">
        <Metric
          label={unitLabel}
          value={`${approx}${profile.n_rows.toLocaleString()}`}
          hint={profile.exact_counts ? undefined : `Estimated from the first ${profile.sampled_units.toLocaleString()} ${unitLabel} scanned`}
        />
        {profile.kind === "table" && <Metric label="columns" value={profile.fields.length.toLocaleString()} />}
        <Metric label="median words" value={stats.median_words.toLocaleString()} hint={`Average ${stats.avg_words}, longest ${stats.max_words.toLocaleString()} words`} />
        <Metric label="repeated" value={`${stats.duplicate_pct}%`} hint="Share of exactly duplicated documents in the scanned sample" />
        <div>
          <p className="text-caption text-text-muted">script</p>
          <p className="mt-0.5 text-body-sm font-medium">{scriptLabel(stats.scripts)}</p>
        </div>
      </div>

      {profile.kind === "table" && profile.fields.length > 0 && (
        <div className="overflow-x-auto px-4 pb-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Column</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-end">Filled</TableHead>
                <TableHead className="text-end">Distinct</TableHead>
                <TableHead className="text-end">Avg words</TableHead>
                <TableHead>Example</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profile.fields.map((field) => {
                const role = field.name === plan.text_col ? "Document text" : field.name === plan.label_col ? "Category" : null;
                return (
                  <TableRow key={field.name}>
                    <TableCell>
                      <span className="font-medium">{field.name}</span>
                      {role && <Badge className="ms-2" variant={role === "Document text" ? "info" : "neutral"}>{role}</Badge>}
                    </TableCell>
                    <TableCell className="text-text-secondary">{field.dtype}</TableCell>
                    <TableCell className="text-end tabular-nums">{field.fill_pct}%</TableCell>
                    <TableCell className="text-end tabular-nums">{field.unique.toLocaleString()}</TableCell>
                    <TableCell className="text-end tabular-nums">{field.dtype === "text" ? field.avg_words : "—"}</TableCell>
                    <TableCell className="max-w-[22ch] truncate text-text-secondary" dir="auto" title={field.samples[0] ?? ""}>{field.samples[0] ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {profile.preview.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-caption uppercase tracking-wide text-text-muted">First documents as they will be embedded</p>
          <ol className="mt-2 space-y-1.5">
            {profile.preview.map((document, index) => (
              <li key={index} className="truncate rounded-md bg-surface-raised px-3 py-2 text-body-sm text-text-secondary" dir="auto" title={document}>
                {document}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
