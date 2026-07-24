import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Alert, Button, Dialog, Input, Label } from "noor-ui";
import { useDeleteSource } from "../../api/hooks";
import { compactSourceLabel } from "../../lib/labels";

/** Irreversible corpus deletion, gated behind typing the corpus name — removes
 *  every fitted run, its cached embeddings, and the uploaded source file. */
export function DeleteCorpusDialog({source, title, onDeleted}: {
  source: string; title: string; onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const del = useDeleteSource();
  const name = compactSourceLabel(title);
  const matches = confirm.trim() === name;

  const submit = () => {
    if (!matches) return;
    del.mutate(source, {
      onSuccess: () => { setOpen(false); setConfirm(""); onDeleted(); },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => { setOpen(next); if (!next) { setConfirm(""); del.reset(); } }}
      title="Delete this corpus?"
      description="This permanently removes its embedded documents, topic model, and uploaded file. This cannot be undone."
      trigger={
        <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-bg">
          <Trash2 className="size-4" /> Delete corpus
        </Button>
      }
    >
      <div className="space-y-4">
        <Label htmlFor="confirm-delete" className="block text-body-sm">
          Type <span className="font-semibold" dir="auto">{name}</span> to confirm.
        </Label>
        <Input id="confirm-delete" value={confirm} dir="auto" autoComplete="off"
          placeholder={name} onChange={(event) => setConfirm(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") submit(); }} />
        {del.isError && <Alert variant="danger" title="Could not delete" description={(del.error as Error).message} />}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="danger" disabled={!matches || del.isPending} onClick={submit}>
            {del.isPending ? "Deleting…" : "Delete corpus"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
