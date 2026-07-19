import { useEffect, useState } from "react";
import { ArrowUpRight, Database, FolderUp, LayoutGrid, Rows3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, EmptyState, ErrorState, SegmentedControl, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Typography } from "noor-ui";
import { useSources } from "../../api/hooks";
import type { SourceSummary } from "../../api/types";
import { useLocale } from "../../lib/i18n";
import { compactModelLabel, compactSourceLabel } from "../../lib/labels";

const VIEW_KEY = "kurdish-data-explorer-overview-view";
type View = "cards" | "rows";

/** Landing overview: orient before drilling in (replaces the old blind redirect). */
export function OverviewPage() {
  const sources = useSources();
  const navigate = useNavigate();
  const { t } = useLocale();
  const [view, setView] = useState<View>(() => (localStorage.getItem(VIEW_KEY) === "rows" ? "rows" : "cards"));
  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);

  const openExplorer = (source: SourceSummary) => {
    const model = source.models.find((item) => item.fitted) ?? source.models[0];
    if (model) navigate(`/explore/${encodeURIComponent(source.source)}/${encodeURIComponent(model.key)}/tree`);
  };

  if (sources.isLoading) {
    return (
      <div className="h-full overflow-y-auto p-4 md:p-6">
        <Skeleton className="h-10 w-72" />
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-56" /><Skeleton className="h-56" /><Skeleton className="h-56" />
        </div>
      </div>
    );
  }
  if (sources.isError) return <ErrorState heading="Could not load sources" description={sources.error.message} onRetry={() => sources.refetch()} />;
  if (!sources.data?.length) {
    return (
      <div className="grid h-full place-items-center p-6">
        <EmptyState
          icon={FolderUp}
          heading="No corpora yet"
          description="Upload a text file or dataset to build your first topic workspace."
          action={<Button onClick={() => navigate("/upload")}>{t("navUpload")}</Button>}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-canvas p-4 md:p-6">
      <header className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-caption uppercase text-text-muted">{t("navOverview")}</p>
          <Typography variant="heading-md">{t("appName")}</Typography>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl
            aria-label={`${t("viewCards")} / ${t("viewRows")}`}
            value={view}
            options={[
              {value: "cards", label: <span className="flex items-center gap-1.5"><LayoutGrid className="size-3.5" />{t("viewCards")}</span>},
              {value: "rows", label: <span className="flex items-center gap-1.5"><Rows3 className="size-3.5" />{t("viewRows")}</span>},
            ]}
            onValueChange={(value) => setView(value as View)}
          />
          <Button variant="outline" onClick={() => navigate("/upload")}><FolderUp className="size-4" />{t("navUpload")}</Button>
        </div>
      </header>

      {view === "cards" ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sources.data.map((source) => {
            const fitted = source.models.filter((model) => model.fitted);
            const first = fitted[0];
            return (
              <Card key={source.source} className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-caption text-text-muted"><Database className="size-3.5" /><span>{t("corpus")}</span></div>
                    <Typography variant="heading-sm" className="mt-1 truncate">{compactSourceLabel(source.title)}</Typography>
                  </div>
                  {source.has_labels && <Badge variant="info">{t("labeled")}</Badge>}
                </div>
                <dl className="grid grid-cols-2 gap-3 border-y border-border py-3 text-body-sm">
                  <div><dt className="text-caption text-text-muted">{t("documents")}</dt><dd className="mt-0.5 font-semibold tabular-nums">{source.n_docs.toLocaleString()}</dd></div>
                  <div><dt className="text-caption text-text-muted">{t("models")}</dt><dd className="mt-0.5 font-semibold tabular-nums">{fitted.length} / {source.models.length}</dd></div>
                </dl>
                <div className="flex flex-wrap gap-1.5">
                  {source.models.map((model) => (
                    <Badge key={model.key} variant={model.fitted ? "neutral" : "warning"}>{compactModelLabel(model.key, model.label)}{model.fitted ? "" : " · fit required"}</Badge>
                  ))}
                </div>
                <div className="mt-auto">
                  <Button
                    size="sm"
                    variant={first ? "primary" : "outline"}
                    disabled={!source.models.length}
                    onClick={() => openExplorer(source)}
                  >
                    {t("navExplore")} <ArrowUpRight className="size-4 rtl:rotate-180" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-md border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("corpus")}</TableHead>
                <TableHead className="text-end">{t("documents")}</TableHead>
                <TableHead className="text-end">{t("models")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("tabEvaluate")}</TableHead>
                <TableHead className="relative"><span className="sr-only">{t("navExplore")}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.data.map((source) => {
                const fitted = source.models.filter((model) => model.fitted);
                return (
                  <TableRow key={source.source} className="cursor-pointer" onClick={() => openExplorer(source)}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2">
                        <Database className="size-4 shrink-0 text-text-muted" />
                        <span className="truncate font-medium">{compactSourceLabel(source.title)}</span>
                        {source.has_labels && <Badge variant="info">{t("labeled")}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{source.n_docs.toLocaleString()}</TableCell>
                    <TableCell className="text-end tabular-nums">{fitted.length} / {source.models.length}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1.5">
                        {fitted.map((model) => (
                          <Badge key={model.key} variant="neutral">{compactModelLabel(model.key, model.label)}</Badge>
                        ))}
                        {!fitted.length && <span className="text-caption text-text-muted">fit required</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        size="sm"
                        variant={fitted.length ? "primary" : "outline"}
                        disabled={!source.models.length}
                        onClick={(event) => {event.stopPropagation(); openExplorer(source);}}
                      >
                        {t("navExplore")} <ArrowUpRight className="size-4 rtl:rotate-180" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
