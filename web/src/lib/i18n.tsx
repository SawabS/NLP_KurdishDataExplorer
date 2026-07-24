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
  theme: "Color theme",
  corpus: "Corpus",
  documents: "Documents",
  topics: "Topics",
  outliers: "Outliers",
  outliersHint: "Documents HDBSCAN left unassigned (topic −1). High counts suggest a lower minimum cluster size.",
  npmiHint: "Normalized pointwise mutual information of top topic terms. Higher = more coherent topics.",
  tabStructure: "Structure",
  tabMap: "Map",
  tabDocuments: "Documents",
  tabSearch: "Ask",
  tabInsights: "Insights",
  commandPlaceholder: "Jump to a source, workspace, or topic…",
  activeFit: "Fit in progress",
  viewChart: "Chart",
  viewTable: "Table",
  viewCards: "Cards",
  viewRows: "Rows",
  labeled: "Labeled",
  expand: "Expand",
  collapse: "Collapse",
  overview: "Overview",
  coverage: "Coverage",
  clustered: "Clustered",
  unclustered: "Unclustered",
  categories: "Categories",
  largestTopic: "Largest topic",
  topicSizes: "Topic sizes",
  topicSizesHint: "Documents per topic, largest first. A steep drop means a few themes dominate the corpus.",
  cumulativeCoverage: "Cumulative coverage",
  composition: "Category composition",
  compositionHint: "How each category's documents spread across the leading topics.",
  concentration: "Concentration",
  glance: "Corpus at a glance",
};

export type Dict = Record<keyof typeof en, string>;

const ckb: Dict = {
  appName: "گەڕۆکی داتای کوردی",
  appTagline: "شوێنی کاری لێکۆڵینەوەی کۆرپەس",
  navOverview: "گشتبینی",
  navExplore: "دۆزینەوە",
  navUpload: "بارکردن",
  language: "زمان",
  theme: "ڕەنگ",
  corpus: "کۆرپەس",
  documents: "بەڵگەنامەکان",
  topics: "بابەتەکان",
  outliers: "لادەرەکان",
  outliersHint: "ئەو بەڵگەنامانەی HDBSCAN بۆ هیچ بابەتێک تەرخانی نەکردوون (بابەتی −1).",
  npmiHint: "پێوانەی NPMI بۆ وشە سەرەکییەکانی بابەتەکان؛ بەرزتر باشترە.",
  tabStructure: "پێکهاتە",
  tabMap: "نەخشە",
  tabDocuments: "بەڵگەنامەکان",
  tabSearch: "پرسیار",
  tabInsights: "تێڕوانین",
  commandPlaceholder: "بازدان بۆ سەرچاوە، شوێنی کار، یان بابەت…",
  activeFit: "پرۆسەی فیت لە جێبەجێکردندایە",
  viewChart: "هێڵکاری",
  viewTable: "خشتە",
  viewCards: "کارتەکان",
  viewRows: "ڕیزەکان",
  labeled: "پۆلێنکراو",
  expand: "فراوانکردن",
  collapse: "کۆکردنەوە",
  overview: "گشتبینی",
  coverage: "گشتگیری",
  clustered: "پۆلێنکراو",
  unclustered: "پۆلێننەکراو",
  categories: "پۆلەکان",
  largestTopic: "گەورەترین بابەت",
  topicSizes: "قەبارەی بابەتەکان",
  topicSizesHint: "ژمارەی بەڵگەنامە بۆ هەر بابەتێک، گەورەترین لەپێش. دابەزینێکی توند واتە چەند بابەتێک زاڵن.",
  cumulativeCoverage: "گشتگیری کۆمەڵ",
  composition: "پێکهاتەی پۆلەکان",
  compositionHint: "چۆن بەڵگەنامەکانی هەر پۆلێک بەسەر بابەتە سەرەکییەکاندا دابەشدەبن.",
  concentration: "چڕی",
  glance: "کۆرپەس بە کورتی",
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
