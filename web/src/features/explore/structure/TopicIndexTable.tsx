import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Typography } from "noor-ui";
import type { TopicRow } from "../../../api/types";
import { topicDisplayName, topicName } from "../../../lib/labels";

export function TopicIndexTable({topics, onSelect}: {topics: TopicRow[]; onSelect: (topic: number) => void}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div><Typography variant="label">Topic index</Typography><p className="text-caption text-text-muted">{topics.length} leaf topics</p></div>
      </div>
      <div className="max-h-[480px] overflow-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Topic</TableHead><TableHead>Docs</TableHead><TableHead>Name</TableHead></TableRow></TableHeader>
          <TableBody>
            {topics.map((item) => (
              <TableRow key={item.topic}>
                <TableCell><Button variant="link" onClick={() => onSelect(item.topic)}>#{item.topic}</Button></TableCell>
                <TableCell className="tabular-nums">{item.count.toLocaleString()}</TableCell>
                <TableCell>
                  <p dir="auto" className="corpus-text">{topicName(item)}</p>
                  {item.label && <p dir="auto" lang="ckb" className="corpus-text mt-0.5 text-caption text-text-muted">{topicDisplayName(item.name)}</p>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
