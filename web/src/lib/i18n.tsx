import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "en" | "ckb";
const STORAGE_KEY = "kurdish-data-explorer-locale";

const en = {
  appName: "Kurdish Data Explorer",
  appTagline: "Corpus research workspace",
  navOverview: "Overview",
  navExplore: "Explore",
  navUpload: "Upload",
  language: "Language",
  corpus: "Corpus",
  documents: "Documents",
  topics: "Topics",
  outliers: "Outliers",
  outliersHint: "Documents HDBSCAN left unassigned (topic −1). High counts suggest a lower minimum cluster size.",
  npmiHint: "Normalized pointwise mutual information of top topic terms. Higher = more coherent topics.",
  tabStructure: "Structure",
  tabMap: "Map",
  tabSearch: "Search",
  tabEvaluate: "Evaluate",
  commandPlaceholder: "Jump to a source, workspace, or topic…",
  activeFit: "Fit in progress",
  viewChart: "Chart",
  viewTable: "Table",
  viewCards: "Cards",
  viewRows: "Rows",
  models: "Models",
  labeled: "Labeled",
};

export type Dict = Record<keyof typeof en, string>;

const ckb: Dict = {
  appName: "گەڕۆکی داتای کوردی",
  appTagline: "شوێنی کاری لێکۆڵینەوەی کۆرپەس",
  navOverview: "گشتبینی",
  navExplore: "دۆزینەوە",
  navUpload: "بارکردن",
  language: "زمان",
  corpus: "کۆرپەس",
  documents: "بەڵگەنامەکان",
  topics: "بابەتەکان",
  outliers: "لادەرەکان",
  outliersHint: "ئەو بەڵگەنامانەی HDBSCAN بۆ هیچ بابەتێک تەرخانی نەکردوون (بابەتی −1).",
  npmiHint: "پێوانەی NPMI بۆ وشە سەرەکییەکانی بابەتەکان؛ بەرزتر باشترە.",
  tabStructure: "پێکهاتە",
  tabMap: "نەخشە",
  tabSearch: "گەڕان",
  tabEvaluate: "هەڵسەنگاندن",
  commandPlaceholder: "بازدان بۆ سەرچاوە، شوێنی کار، یان بابەت…",
  activeFit: "پرۆسەی فیت لە جێبەجێکردندایە",
  viewChart: "هێڵکاری",
  viewTable: "خشتە",
  viewCards: "کارتەکان",
  viewRows: "ڕیزەکان",
  models: "مۆدێلەکان",
  labeled: "پۆلێنکراو",
};

const dictionaries: Record<Locale, Dict> = { en, ckb };

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof Dict) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    return stored === "ckb" ? "ckb" : "en";
  });
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.setAttribute("lang", locale);
  }, [locale]);
  const t = useCallback((key: keyof Dict) => dictionaries[locale][key], [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
