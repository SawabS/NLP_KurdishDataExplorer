import { useEffect, useMemo, useState } from "react";
import { CheckCheck, Download, Search, Trash2, X } from "lucide-react";
import { Badge, Button, Drawer, EmptyState, ErrorState, Input, Pagination, SegmentedControl, Skeleton } from "noor-ui";
import { api } from "../../../api/client";
import { useAnnotationSummary, useDeleteAnnotation, useDocuments, useSaveAnnotation } from "../../../api/hooks";
import type { DocumentRow, DocumentsQuery, ReviewStatus } from "../../../api/types";
import { DocumentInspector } from "./DocumentInspector";
import { DocumentTable } from "./DocumentTable";
import { ReviewControls } from "./ReviewControls";
import { STATUS_META } from "./status";

const LIMIT = 50;
type SortKey = "doc_id" | "topic" | "words";
const STATUS_FILTERS: Array<{value: string; label: string}> = [
  {value: "all", label: "All"}, {value: "unreviewed", label: "Unreviewed"},
  {value: "draft", label: "Draft"}, {value: "reviewed", label: "Reviewed"}, {value: "discarded", label: "Discarded"},
];

interface Props {source: string; model: string; category: string; params: URLSearchParams; setParams: (params: URLSearchParams) => void}

export function DocumentsView({source, model, category, params, setParams}: Props) {
  const page = Number(params.get("page") ?? 0);
  const topic = params.has("topic") ? Number(params.get("topic")) : undefined;
  const dq = params.get("dq") ?? "";
  const status = (params.get("status") ?? "all") as ReviewStatus | "unreviewed" | "all";
  const sort = (params.get("sort") ?? "doc_id") as SortKey;
  const order = (params.get("order") ?? "asc") as "asc" | "desc";
  const selectedDoc = params.has("doc") ? Number(params.get("doc")) : undefined;

  const query: DocumentsQuery = {
    offset: page * LIMIT, limit: LIMIT, topic, category: category === "(all)" ? undefined : category,
    q: dq || undefined, status: status === "all" ? undefined : status, sort, order,
  };
  const documents = useDocuments(source, model, query);
  const summary = useAnnotationSummary(source, model);
  const save = useSaveAnnotation(source, model);
  const remove = useDeleteAnnotation(source, model);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [draftQuery, setDraftQuery] = useState(dq);
  const wide = useWide();

  // Debounced text search → URL (resets to the first page), matching the app's
  // cancel-safe, URL-driven query convention.
  useEffect(() => {
    const handle = setTimeout(() => { if (draftQuery !== dq) update({dq: draftQuery || null, page: null}); }, 300);
    return () => clearTimeout(handle);
  }, [draftQuery]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setDraftQuery(dq); }, [dq]);

  function update(patch: Record<string, string | number | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, String(value));
    }
    setParams(next);
  }

  const rows = documents.data?.rows ?? [];
  const total = documents.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const onSort = (key: SortKey) =>
    update({sort: key, order: sort === key && order === "asc" ? "desc" : "asc", page: null});

  const toggle = (docId: number) =>
    setSelected((prev) => { const next = new Set(prev); next.has(docId) ? next.delete(docId) : next.add(docId); return next; });
  const toggleAll = (on: boolean) =>
    setSelected((prev) => { const next = new Set(prev); rows.forEach((row) => (on ? next.add(row.doc_id) : next.delete(row.doc_id))); return next; });

  const bulkStatus = (value: ReviewStatus) => {
    selected.forEach((docId) => save.mutate({docId, patch: {status: value}}));
    setSelected(new Set());
  };
  const bulkClear = () => { selected.forEach((docId) => remove.mutate(docId)); setSelected(new Set()); };

  // Trigger the server-side CSV export of the current filtered set (an explicit
  // user action — the one place a full, non-paginated result is transferred).
  const exportCsv = () => {
    const link = document.createElement("a");
    link.href = api.documentsExportUrl(source, model, query);
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const activeFilters = useMemo(() => {
    const chips: Array<{key: string; label: string; clear: () => void}> = [];
    if (topic !== undefined) chips.push({key: "topic", label: topic === -1 ? "Outliers" : `Topic #${topic}`, clear: () => update({topic: null, page: null})});
    if (category !== "(all)") chips.push({key: "category", label: `Category: ${category}`, clear: () => update({category: null, page: null})});
    if (dq) chips.push({key: "dq", label: `“${dq}”`, clear: () => { setDraftQuery(""); update({dq: null, page: null}); }});
    if (status !== "all") chips.push({key: "status", label: STATUS_FILTERS.find((item) => item.value === status)?.label ?? status, clear: () => update({status: null, page: null})});
    return chips;
  }, [topic, category, dq, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const reviewSlot = (row: DocumentRow) => (
    <ReviewControls source={source} model={model} docId={row.doc_id} annotation={row.annotation} />
  );
  const step = (delta: number) => {
    if (selectedDoc === undefined) return;
    const index = rows.findIndex((row) => row.doc_id === selectedDoc);
    const nextRow = rows[index + delta];
    if (nextRow) update({doc: nextRow.doc_id});
  };
  const selectedRow = rows.find((row) => row.doc_id === selectedDoc);

  const inspector = selectedDoc !== undefined && (
    <DocumentInspector
      source={source} model={model} docId={selectedDoc} row={selectedRow}
      onClose={() => update({doc: null})} onSelect={(docId) => update({doc: docId})}
      onStep={selectedRow ? step : undefined} reviewSlot={reviewSlot}
    />
  );

  if (documents.isError) return <ErrorState heading="Could not load documents" description={documents.error.message} onRetry={() => documents.refetch()} />;

  return (
    <div className="flex h-full min-w-0">
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
        {/* Toolbar: text search, review-status filter, progress, export */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-text-muted" />
              <Input aria-label="Search document text" value={draftQuery} dir="auto"
                placeholder="Search within documents…" className="ps-9"
                onChange={(event) => setDraftQuery(event.target.value)} />
            </div>
            <SegmentedControl aria-label="Filter by review status" value={status}
              options={STATUS_FILTERS} onValueChange={(value) => update({status: value === "all" ? null : value, page: null})} />
          </div>
          <div className="flex items-center gap-3">
            {summary.data && summary.data.annotated > 0 && (
              <span className="text-caption text-text-muted">
                {(summary.data.by_status.reviewed ?? 0).toLocaleString()} reviewed · {summary.data.annotated.toLocaleString()} annotated
              </span>
            )}
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="size-4" /> Export CSV
            </Button>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption text-text-muted">Filters:</span>
            {activeFilters.map((chip) => (
              <button key={chip.key} type="button" onClick={chip.clear}
                className="inline-flex items-center gap-1 rounded-full bg-surface-raised px-2.5 py-1 text-caption text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                {chip.label}<X className="size-3" />
              </button>
            ))}
          </div>
        )}

        {/* Bulk-review action bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2">
            <Badge variant="info">{selected.size} selected</Badge>
            <Button size="sm" variant="ghost" onClick={() => bulkStatus("reviewed")}><CheckCheck className="size-4" /> Mark reviewed</Button>
            <Button size="sm" variant="ghost" onClick={() => bulkStatus("discarded")}>Discard</Button>
            <Button size="sm" variant="ghost" onClick={bulkClear}><Trash2 className="size-4" /> Clear review</Button>
            <Button size="sm" variant="link" onClick={() => setSelected(new Set())}>Deselect all</Button>
          </div>
        )}

        {documents.isLoading && !documents.data ? (
          <div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-64" /></div>
        ) : rows.length === 0 ? (
          <EmptyState heading="No documents match" description="Adjust or clear the filters to see records." />
        ) : (
          <>
            <p className="text-caption text-text-muted">
              {total.toLocaleString()} documents{activeFilters.length > 0 ? " (filtered)" : ""} · page {page + 1} of {totalPages}
            </p>
            <DocumentTable
              rows={rows} selectedDocId={selectedDoc} onSelect={(docId) => update({doc: docId})}
              selected={selected} onToggle={toggle} onToggleAll={toggleAll}
              sort={sort} order={order} onSort={onSort}
            />
            {totalPages > 1 && (
              <Pagination currentPage={page + 1} totalPages={totalPages}
                onPageChange={(next) => { update({page: next - 1 === 0 ? null : next - 1}); }} />
            )}
          </>
        )}
      </div>

      {/* Inspector: persistent side panel on wide screens, Drawer below — mounted
          once (never both) so element ids stay unique and only one detail query runs. */}
      {wide
        ? inspector && <aside className="w-[400px] shrink-0 overflow-hidden border-s border-border bg-surface">{inspector}</aside>
        : (
          <Drawer open={selectedDoc !== undefined} onOpenChange={(open) => !open && update({doc: null})}
            side="end" title={`Document #${selectedDoc}`}>
            {selectedDoc !== undefined ? inspector : null}
          </Drawer>
        )}
    </div>
  );
}

/** Single-mount breakpoint for the inspector (xl = 1280px). */
function useWide() {
  const query = "(min-width: 1280px)";
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setWide(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);
  return wide;
}
