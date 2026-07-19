import { CheckCircle2, FileInput } from "lucide-react";
import { Alert, Button, FileUpload, Input, SegmentedControl, Typography } from "noor-ui";

export interface SelectedFile {path: string; name: string; size: number; columns: string[]; kind: "text" | "table"}

interface Props {
  method: string;
  onMethodChange: (method: string) => void;
  path: string;
  onPathChange: (path: string) => void;
  selected?: SelectedFile;
  uploading: boolean;
  peeking: boolean;
  error?: string;
  onUpload: (file: File) => void;
  onPeek: () => void;
}

export function SourceStep({method, onMethodChange, path, onPathChange, selected, uploading, peeking, error, onUpload, onPeek}: Props) {
  return (
    <section className="rounded-md border border-border bg-surface">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="grid size-7 place-items-center rounded-md bg-info-bg text-caption font-semibold text-info">01</span>
        <FileInput className="size-4" />
        <Typography variant="label">Source material</Typography>
      </div>
      <div className="p-4">
        <SegmentedControl className="w-full" aria-label="Input method" value={method} options={[{value: "upload", label: "Upload"}, {value: "path", label: "Server path"}]} onValueChange={onMethodChange} />
        {method === "upload" ? (
          <FileUpload className="mt-4" accept=".txt,.text,.csv,.tsv,.xlsx,.xls,.parquet" disabled={uploading} onFilesSelected={(files) => files[0] && onUpload(files[0])} label={uploading ? "Uploading…" : "Choose or drop a file"} helperText="TXT, CSV, TSV, Excel, Parquet · 2 GB max" />
        ) : (
          <div className="mt-4 space-y-2">
            <Input aria-label="Absolute server path" value={path} onChange={(event) => onPathChange(event.target.value)} placeholder="/home/.../corpus.csv" />
            <Button fullWidth variant="secondary" loading={peeking} onClick={onPeek}>Inspect path</Button>
          </div>
        )}
        {error && <Alert className="mt-3" variant="danger" description={error} />}
        {selected && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
              <div className="min-w-0"><p className="truncate text-label">{selected.name}</p><p className="mt-1 text-caption text-text-muted">{(selected.size / 1e6).toFixed(1)} MB · {selected.kind === "table" ? `${selected.columns.length} columns` : "plain text"}</p></div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-3 text-caption">
              <div><dt className="text-text-muted">Format</dt><dd className="mt-1 capitalize text-text-primary">{selected.kind}</dd></div>
              <div><dt className="text-text-muted">Status</dt><dd className="mt-1 text-text-primary">Ready</dd></div>
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}
