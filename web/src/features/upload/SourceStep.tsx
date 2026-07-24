import { CheckCircle2, FileInput } from "lucide-react";
import { Alert, Button, FileUpload, Input, SegmentedControl, Typography } from "noor-ui";
import type { FileProfile } from "../../api/types";

interface Props {
  method: string;
  onMethodChange: (method: string) => void;
  path: string;
  onPathChange: (path: string) => void;
  profile?: FileProfile;
  uploading: boolean;
  peeking: boolean;
  error?: string;
  onUpload: (file: File) => void;
  onPeek: () => void;
}

export function SourceStep({method, onMethodChange, path, onPathChange, profile, uploading, peeking, error, onUpload, onPeek}: Props) {
  return (
    <section className="min-w-0 rounded-xl bg-surface shadow-sm">
      <div className="flex items-center gap-3 px-4 pt-4">
        <span className="grid size-7 place-items-center rounded-md bg-info-bg text-caption font-semibold text-info">01</span>
        <FileInput className="size-4" />
        <Typography variant="label">Source material</Typography>
      </div>
      <div className="p-4">
        <SegmentedControl className="inline-flex w-auto self-start" aria-label="Input method" value={method} options={[{value: "upload", label: "Upload"}, {value: "path", label: "Server path"}]} onValueChange={onMethodChange} />
        {method === "upload" ? (
          // No size limit: the server streams the file to disk in chunks and
          // profiles only a head sample, so large corpora upload like small ones.
          <FileUpload className="mt-4" accept=".txt,.text,.csv,.tsv,.xlsx,.xls,.parquet" disabled={uploading} onFilesSelected={(files) => files[0] && onUpload(files[0])} label={uploading ? "Uploading…" : "Choose or drop a file"} helperText="TXT, CSV, TSV, Excel or Parquet · any size" />
        ) : (
          <div className="mt-4 space-y-2">
            <Input aria-label="Absolute server path" value={path} onChange={(event) => onPathChange(event.target.value)} placeholder="/home/.../corpus.csv" />
            <Button fullWidth variant="secondary" loading={peeking} onClick={onPeek}>Inspect path</Button>
          </div>
        )}
        {error && <Alert className="mt-3" variant="danger" description={error} />}
        {profile && (
          <div className="mt-4 flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
            <div className="min-w-0">
              <p className="truncate text-label">{profile.name}</p>
              <p className="mt-1 text-caption text-text-muted">Inspected · ready to run</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
