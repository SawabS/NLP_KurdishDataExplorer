import { Database, FolderUp } from "lucide-react";
import { ThemeToggle, Tooltip, Typography } from "noor-ui";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const navigation = [
  {label: "Explore", icon: Database, path: "/", active: (path: string) => path.startsWith("/explore") || path === "/"},
  {label: "Ingest", icon: FolderUp, path: "/upload", active: (path: string) => path === "/upload"},
];

export function AppShell({children}: {children: ReactNode}) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas text-text-primary" dir="ltr">
      <aside className="hidden w-[72px] shrink-0 flex-col items-center border-e border-border bg-surface py-4 md:flex">
        <button
          type="button"
          className="mb-8 grid size-10 place-items-center rounded-md bg-text-primary text-label font-semibold text-canvas"
          aria-label="Kurdish Data Explorer"
          onClick={() => navigate("/")}
        >
          KD
        </button>
        <nav className="flex flex-1 flex-col gap-2" aria-label="Primary navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const selected = item.active(location.pathname);
            return (
              <Tooltip key={item.label} content={item.label} side="right">
                <button
                  type="button"
                  aria-label={item.label}
                  aria-current={selected ? "page" : undefined}
                  onClick={() => navigate(item.path)}
                  className={`grid size-11 place-items-center rounded-md border transition-colors ${selected ? "border-border bg-surface-raised text-text-primary shadow-sm" : "border-transparent text-text-muted hover:bg-surface-raised hover:text-text-primary"}`}
                >
                  <Icon className="size-[18px]" />
                </button>
              </Tooltip>
            );
          })}
        </nav>
        <ThemeToggle />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface/95 px-4 md:px-6">
          <div className="flex min-w-0 items-baseline gap-3">
            <Typography variant="label">Kurdish Data Explorer</Typography>
            <span className="hidden text-caption text-text-muted sm:inline">Corpus research workspace</span>
          </div>
          <div className="md:hidden"><ThemeToggle /></div>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-sticky flex h-16 items-stretch border-t border-border bg-surface md:hidden" aria-label="Primary navigation">
        {navigation.map((item) => {
          const Icon = item.icon;
          const selected = item.active(location.pathname);
          return (
            <button
              key={item.label}
              type="button"
              aria-current={selected ? "page" : undefined}
              onClick={() => navigate(item.path)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-caption ${selected ? "text-text-primary" : "text-text-muted"}`}
            >
              <Icon className="size-[18px]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
