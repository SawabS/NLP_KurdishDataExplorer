import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Copy, X } from "lucide-react";
import { Badge, Button, IconButton, Separator, Skeleton, Tooltip, Typography } from "noor-ui";
import { useDocument } from "../../../api/hooks";
import type { DocumentDetail, DocumentRow } from "../../../api/types";
import { STATUS_META } from "./status";

/** Right-hand inspector: full document text, its metadata and topic membership,
 *  nearest documents in embedding space, and the review controls. Keyboard-first
 *  prev/next steps through the current page for efficient sequential review. */
export function DocumentInspector({source, model, docId, row, onClose, onSelect, onStep, reviewSlot}: {
  source: string; model: string; docId: number; row?: DocumentRow;
  onClose: () => void; onSelect: (docId: number) => void;
  onStep?: (delta: number) => void; reviewSlot: (row: DocumentRow) => ReactNode;
}) {
  const detail = useDocument(source, model, docId);
  // Prefer the list row for an instant paint; the full record (text + neighbors)
  // arrives from the detail query. When a neighbour jump lands off-page there's no
  // list row, so we wait on the detail query alone.
  const data = detail.data ?? row;
  const status = data?.annotation?.status;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Typography variant="label">Document #{docId}</Typography>
          {status && <Badge variant={STATUS_META[status].variant}>{STATUS_META[status].label}</Badge>}
        </div>
        <div className="flex items-center gap-0.5">
          {onStep && (
            <>
              <Tooltip content="Previous"><IconButton aria-label="Previous document" variant="ghost" size="sm" onClick={() => onStep(-1)}><ChevronLeft className="size-4 rtl:rotate-180" /></IconButton></Tooltip>
              <Tooltip content="Next"><IconButton aria-label="Next document" variant="ghost" size="sm" onClick={() => onStep(1)}><ChevronRight className="size-4 rtl:rotate-180" /></IconButton></Tooltip>
            </>
          )}
          <Tooltip content="Copy text"><IconButton aria-label="Copy document text" variant="ghost" size="sm" onClick={() => data && navigator.clipboard?.writeText(data.text)}><Copy className="size-4" /></IconButton></Tooltip>
          <IconButton aria-label="Close inspector" variant="ghost" size="sm" onClick={onClose}><X className="size-4" /></IconButton>
        </div>
      </header>

      {!data ? (
        <div className="space-y-3 p-4"><Skeleton className="h-4 w-24" /><Skeleton className="h-32" /><Skeleton className="h-20" /></div>
      ) : (
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <section>
          <p className="mb-1 text-caption text-text-muted">Text</p>
          <p dir="auto" className="corpus-text whitespace-pre-wrap text-body-sm">{data.text}</p>
          {(data as DocumentDetail).text_en && (
            <p dir="auto" lang="en" className="mt-2 border-s-2 border-border ps-2 text-body-sm text-text-secondary">{(data as DocumentDetail).text_en}</p>
          )}
        </section>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm">
          <Meta term="Topic" value={data.outlier ? "Outlier (−1)" : `#${data.topic}`} />
          <Meta term="Topic name" value={data.topic_label ?? "—"} dir="auto" />
          <Meta term="Category" value={data.category ?? "—"} dir="auto" />
          <Meta term="Words" value={data.words.toLocaleString()} />
        </dl>

        <section>
          <p className="mb-2 text-caption text-text-muted">Nearest documents</p>
          {detail.isLoading ? (
            <div className="space-y-1.5"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
          ) : detail.data && detail.data.neighbors.length > 0 ? (
            <ul className="space-y-1">
              {detail.data.neighbors.map((neighbor) => (
                <li key={neighbor.doc_id}>
                  <button type="button" onClick={() => onSelect(neighbor.doc_id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                    <span className="tabular-nums text-caption text-text-muted">{(neighbor.similarity * 100).toFixed(0)}%</span>
                    <span dir="auto" className="corpus-text line-clamp-1 flex-1 text-body-sm">{neighbor.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-caption text-text-muted">Nearest-document search needs cached embeddings for this run.</p>
          )}
        </section>

        <Separator />
        <section>
          <Typography variant="label" className="mb-3 block">Review</Typography>
          {reviewSlot(data)}
        </section>
      </div>
      )}
    </div>
  );
}

function Meta({term, value, dir}: {term: string; value: string; dir?: "auto"}) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-text-muted">{term}</dt>
      <dd dir={dir} className="truncate">{value}</dd>
    </div>
  );
}
