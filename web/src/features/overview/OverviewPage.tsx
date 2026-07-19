import { ArrowUpRight, Database, FolderUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, Typography } from "noor-ui";
import { useSources } from "../../api/hooks";
import { useLocale } from "../../lib/i18n";
import { compactModelLabel, compactSourceLabel } from "../../lib/labels";

/** Landing overview: orient before drilling in (replaces the old blind redirect). */
export function OverviewPage() {
  const sources = useSources();
  const navigate = useNavigate();
  const { t } = useLocale();

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
        <Button variant="outline" onClick={() => navigate("/upload")}><FolderUp className="size-4" />{t("navUpload")}</Button>
      </header>

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
                <div><dt className="text-caption text-text-muted">Models</dt><dd className="mt-0.5 font-semibold tabular-nums">{fitted.length} / {source.models.length}</dd></div>
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
                  disabled={!first && !source.models.length}
                  onClick={() => {
                    const model = first ?? source.models[0];
                    navigate(`/explore/${encodeURIComponent(source.source)}/${encodeURIComponent(model.key)}/tree`);
                  }}
                >
                  {t("navExplore")} <ArrowUpRight className="size-4 rtl:rotate-180" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
