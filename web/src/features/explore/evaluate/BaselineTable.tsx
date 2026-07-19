import { SegmentedControl, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Typography } from "noor-ui";

interface Props {
  baselines: Record<string, string[][]>;
  selected: string;
  onSelect: (name: string) => void;
}

export function BaselineTable({baselines, selected, onSelect}: Props) {
  const names = Object.keys(baselines);
  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div><Typography variant="label">Baseline vocabulary</Typography><p className="text-caption text-text-muted">Classical topic models retained for comparison</p></div>
        {names.length > 0 && <SegmentedControl aria-label="Baseline" value={selected} options={names.map((value) => ({value, label: value}))} onValueChange={onSelect} />}
      </div>
      {names.length ? (
        <div className="max-h-[440px] overflow-auto">
          <Table>
            <TableHeader><TableRow><TableHead className="w-24">Topic</TableHead><TableHead>Keywords</TableHead></TableRow></TableHeader>
            <TableBody>
              {(baselines[selected] ?? []).map((words, index) => (
                <TableRow key={index}>
                  <TableCell className="tabular-nums">{String(index).padStart(2, "0")}</TableCell>
                  <TableCell dir="auto" lang="ckb" className="corpus-text">{words.join(" · ")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : <p className="p-4 text-body-sm text-text-muted">LDA/NMF baselines were not computed for this run.</p>}
    </section>
  );
}
