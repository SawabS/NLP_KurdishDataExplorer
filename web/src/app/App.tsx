import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Skeleton } from "noor-ui";
import { AppShell } from "../layout/AppShell";
import { ErrorBoundary } from "./ErrorBoundary";

const OverviewPage = lazy(() => import("../features/overview/OverviewPage").then((module) => ({default: module.OverviewPage})));
const ExplorePage = lazy(() => import("../features/explore/ExplorePage").then((module) => ({default: module.ExplorePage})));
const UploadPage = lazy(() => import("../features/upload/UploadPage").then((module) => ({default: module.UploadPage})));

export function App() {
  return (
    <AppShell>
      <ErrorBoundary>
        <Suspense fallback={<LoadingRoute />}>
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/explore/:source/:model/:tab" element={<ExplorePage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="*" element={<Navigate replace to="/" />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  );
}

function LoadingRoute() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-14 w-1/2" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
