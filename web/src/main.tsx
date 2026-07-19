import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider, TooltipProvider } from "noor-ui";
import { DirectionProvider, isRtlLocale, ThemeProvider } from "noor-ui/providers";
import { App } from "./app/App";
import { JobsProvider } from "./app/JobsProvider";
import { LocaleProvider, useLocale } from "./lib/i18n";
import "./index.css";

const queryClient = new QueryClient({defaultOptions: {queries: {staleTime: 30_000, retry: 1}}});

/** Direction follows the UI locale (ckb → rtl), per noor-ui RTL-first guidance. */
function DirectionFromLocale({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  return <DirectionProvider direction={isRtlLocale(locale) ? "rtl" : "ltr"}>{children}</DirectionProvider>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="kurdish-data-explorer-theme">
      <LocaleProvider>
        <DirectionFromLocale>
          <TooltipProvider>
            <QueryClientProvider client={queryClient}>
              <ToastProvider>
                <JobsProvider>
                  <BrowserRouter><App /></BrowserRouter>
                </JobsProvider>
              </ToastProvider>
            </QueryClientProvider>
          </TooltipProvider>
        </DirectionFromLocale>
      </LocaleProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
