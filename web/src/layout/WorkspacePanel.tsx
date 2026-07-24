import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "kurdish-data-explorer-panel-open";

interface WorkspacePanelValue {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

const WorkspacePanelContext = createContext<WorkspacePanelValue | null>(null);

/** Shared state for the collapsible corpus-context panel. The app-shell rail
 *  owns the toggle; the explore workspace reads `open` to show or hide the
 *  panel, so one control governs the whole left region. */
export function WorkspacePanelProvider({children}: {children: ReactNode}) {
  const [open, setOpen] = useState<boolean>(() => localStorage.getItem(STORAGE_KEY) !== "false");
  useEffect(() => { localStorage.setItem(STORAGE_KEY, String(open)); }, [open]);
  const value = useMemo(() => ({open, setOpen, toggle: () => setOpen((value) => !value)}), [open]);
  return <WorkspacePanelContext.Provider value={value}>{children}</WorkspacePanelContext.Provider>;
}

export function useWorkspacePanel() {
  const ctx = useContext(WorkspacePanelContext);
  if (!ctx) throw new Error("useWorkspacePanel must be used within WorkspacePanelProvider");
  return ctx;
}
