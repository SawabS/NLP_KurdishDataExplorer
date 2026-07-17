import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "noor-ui";
import { DirectionProvider, ThemeProvider } from "noor-ui/providers";
import { App } from "./App";
import "./index.css";

const queryClient = new QueryClient({defaultOptions: {queries: {staleTime: 30_000, retry: 1}}});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="kurdish-data-explorer-theme">
      <DirectionProvider direction="ltr">
        <TooltipProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter><App /></BrowserRouter>
          </QueryClientProvider>
        </TooltipProvider>
      </DirectionProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
