import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { useSources } from "./api/hooks";
import { ErrorState, Skeleton } from "noor-ui";

const ExplorePage = lazy(() => import("./pages/Explore/ExplorePage").then((module) => ({default: module.ExplorePage})));
const UploadPage = lazy(() => import("./pages/Upload/UploadPage").then((module) => ({default: module.UploadPage})));

function Home() {
  const sources = useSources();
  if (sources.isLoading) return <div className="p-6"><Skeleton className="h-24 w-full" /></div>;
  if (sources.isError) return <ErrorState heading="Could not load sources" description={sources.error.message} onRetry={() => sources.refetch()} />;
  const source = sources.data?.[0];
  const model = source?.models.find((item) => item.fitted);
  return source && model ? <Navigate replace to={`/explore/${encodeURIComponent(source.source)}/${encodeURIComponent(model.key)}/tree`} /> : <Navigate replace to="/upload" />;
}

export function App() {
  return (
    <AppShell>
      <Suspense fallback={<LoadingRoute />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore/:source/:model/:tab" element={<ExplorePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

function LoadingRoute() {
  return <div className="space-y-4 p-6"><Skeleton className="h-20 w-full" /><Skeleton className="h-96 w-full" /></div>;
}
