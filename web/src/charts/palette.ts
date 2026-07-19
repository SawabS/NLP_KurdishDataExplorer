import { useMemo } from "react";
import { useTheme } from "noor-ui/providers";

/**
 * Single authority for data colors. The ONLY file in web/src allowed to
 * contain hex literals; everything semantic resolves through noor-ui CSS
 * custom properties so charts retheme with the app.
 *
 * Categorical ramp: Okabe–Ito (colorblind-safe) extended to 12, with a
 * lightened dark-theme variant tuned for the noor dark canvas.
 */
const CATEGORICAL_LIGHT = [
  "#0072b2", "#e69f00", "#009e73", "#d55e00", "#cc79a7", "#56b4e9",
  "#b8a11c", "#8c6bb1", "#a6761d", "#1b9e77", "#e7298a", "#666666",
];
const CATEGORICAL_DARK = [
  "#5aa9dd", "#f0b95c", "#4fc49f", "#f08a50", "#dd9fc4", "#8ccbf0",
  "#d4c04a", "#ae93cc", "#c99a56", "#57bfa0", "#f074b0", "#9e9e9e",
];

/** Fallbacks for token reads (SSR/tests); at runtime the CSS custom property wins. */
export const TOKEN_FALLBACKS: Record<string, {light: string; dark: string}> = {
  "--n-text-primary": {light: "#2b3039", dark: "#ececec"},
  "--n-text-muted": {light: "#6b7280", dark: "#9e9e9e"},
  "--n-surface-raised": {light: "#eef1f7", dark: "#303030"},
  "--n-border": {light: "#e4e8f1", dark: "#303030"},
  "--n-border-strong": {light: "#cbd5e1", dark: "#424242"},
  "--n-warning": {light: "#b45309", dark: "#f0b95c"},
  "--n-surface": {light: "#ffffff", dark: "#262626"},
};

export function cssToken(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export interface Palette {
  categorical: string[];
  /** Stable topic→color mapping shared by Structure and Map. Outliers (−1) are always muted grey. */
  colorForTopic: (topicId: number) => string;
  colorForCategory: (name: string) => string;
  outlier: string;
  highlight: { active: string; dim: string };
  /** Theme-aware sequential ramp for heatmaps (canvas → info). */
  sequential: Array<[number, string]>;
  /** Meaningful (not decorative) series colors for the coherence chart. */
  kind: { bertopic: string; baseline: string };
}

const hashString = (value: string) => {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
};

export function usePalette(): Palette {
  const { resolvedTheme } = useTheme();
  return useMemo(() => {
    const dark = resolvedTheme === "dark";
    const categorical = dark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
    const outlier = cssToken("--n-text-muted", dark ? "#9e9e9e" : "#6b7280");
    return {
      categorical,
      colorForTopic: (topicId: number) => topicId < 0 ? outlier : categorical[topicId % categorical.length],
      colorForCategory: (name: string) => categorical[hashString(name) % categorical.length],
      outlier,
      highlight: {
        active: cssToken("--n-warning", dark ? "#f0b95c" : "#b45309"),
        dim: cssToken("--n-border-strong", dark ? "#424242" : "#cbd5e1"),
      },
      sequential: [
        [0, cssToken("--n-surface-raised", dark ? "#303030" : "#eef1f7")],
        [0.5, dark ? "#4a7ba6" : "#8fb8e8"],
        [1, dark ? "#8ccbf0" : "#31629e"],
      ],
      kind: {
        bertopic: dark ? "#5aa9dd" : "#0072b2",
        baseline: cssToken("--n-text-muted", "#6b7280"),
      },
    };
  }, [resolvedTheme]);
}
