import { ArrowDown, ArrowUp } from "lucide-react";
import { Badge, Checkbox, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "noor-ui";
import type { DocumentRow } from "../../../api/types";
import { STATUS_META } from "./status";

type SortKey = "doc_id" | "topic" | "words";

export function DocumentTable({rows, selectedDocId, onSelect, selected, onToggle, onToggleAll, sort, order, onSort}: {
  rows: DocumentRow[]; selectedDocId?: number; onSelect: (docId: number) => void;
  selected: Set<number>; onToggle: (docId: number) => void; onToggleAll: (on: boolean) => void;
  sort: SortKey; order: "asc" | "desc"; onSort: (key: SortKey) => void;
}) {
  const pageIds = rows.map((row) => row.doc_id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someChecked = pageIds.some((id) => selected.has(id));

  const SortHead = ({label, column, className}: {label: string; column: SortKey; className?: string}) => (
    <TableHead className={className}>
      <button type="button" onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-xs"
        aria-label={`Sort by ${label}`} aria-sort={sort === column ? (order === "asc" ? "ascending" : "descending") : "none"}>
        {label}
        {sort === column && (order === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </TableHead>
  );

  return (
    <div className="overflow-auto rounded-md border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox aria-label="Select all on this page"
                checked={allChecked ? true : someChecked ? "indeterminate" : false}
                onCheckedChange={(value) => onToggleAll(value === true)} />
            </TableHead>
            <SortHead label="#" column="doc_id" className="w-16" />
            <TableHead>Text</TableHead>
            <SortHead label="Topic" column="topic" className="w-40" />
            <TableHead className="w-28">Category</TableHead>
            <SortHead label="Words" column="words" className="w-20" />
            <TableHead className="w-24">Review</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const status = row.annotation?.status;
            return (
              <TableRow key={row.doc_id}
                data-state={row.doc_id === selectedDocId ? "selected" : undefined}
                className="cursor-pointer data-[state=selected]:bg-info-bg"
                onClick={() => onSelect(row.doc_id)}>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <Checkbox aria-label={`Select document ${row.doc_id}`}
                    checked={selected.has(row.doc_id)} onCheckedChange={() => onToggle(row.doc_id)} />
                </TableCell>
                <TableCell className="tabular-nums text-text-muted">{row.doc_id}</TableCell>
                <TableCell>
                  <p dir="auto" className="corpus-text line-clamp-2 max-w-2xl text-body-sm">{row.text}</p>
                </TableCell>
                <TableCell>
                  {row.outlier
                    ? <Badge variant="outline">Outlier</Badge>
                    : <span dir="auto" className="corpus-text line-clamp-1 text-body-sm">{row.topic_label ?? `#${row.topic}`}</span>}
                </TableCell>
                <TableCell><span dir="auto" className="text-body-sm text-text-secondary">{row.category ?? "—"}</span></TableCell>
                <TableCell className="tabular-nums text-text-secondary">{row.words.toLocaleString()}</TableCell>
                <TableCell>
                  {status
                    ? <Badge variant={STATUS_META[status].variant}>{STATUS_META[status].label}</Badge>
                    : <span className="text-caption text-text-muted">—</span>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
