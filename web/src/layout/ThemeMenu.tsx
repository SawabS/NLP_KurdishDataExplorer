import { Check, Palette } from "lucide-react";
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, IconButton } from "noor-ui";
import { themeOptions, useTheme } from "noor-ui/providers";
import { useLocale } from "../lib/i18n";

/** A quick visual preview per palette: [canvas background, accent] so the menu
 *  shows what each theme looks like instead of a bare list of names. */
const SWATCH: Record<string, [string, string]> = {
  system: ["#ffffff", "#0d0d0d"],
  light: ["#ffffff", "#171717"],
  dark: ["#0d0d0d", "#f2f2f2"],
  "github-light": ["#ffffff", "#1f883d"],
  "github-dark": ["#0d1117", "#238636"],
  dracula: ["#282a36", "#bd93f9"],
  "one-dark-pro": ["#282c34", "#61afef"],
  nord: ["#2e3440", "#88c0d0"],
  "catppuccin-mocha": ["#1e1e2e", "#cba6f7"],
};

function Swatch({value}: {value: string}) {
  const [bg, accent] = SWATCH[value] ?? SWATCH.light;
  return (
    <span
      className="grid size-4 shrink-0 place-items-center rounded-full ring-1 ring-black/10"
      style={{background: bg}}
      aria-hidden="true"
    >
      <span className="size-1.5 rounded-full" style={{background: accent}} />
    </span>
  );
}

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();
  const light = themeOptions.filter((option) => option.colorScheme === "light" || option.value === "system");
  const dark = themeOptions.filter((option) => option.colorScheme === "dark");

  const item = (option: (typeof themeOptions)[number]) => (
    <DropdownMenuItem key={option.value} onSelect={() => setTheme(option.value)} icon={<Swatch value={option.value} />}>
      <span className="flex-1">{option.label}</span>
      {theme === option.value && <Check className="size-3.5 text-text-secondary" />}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu
      side="right"
      align="end"
      trigger={
        <IconButton aria-label={t("theme")} title={t("theme")} variant="ghost" size="sm">
          <Palette className="size-4" />
        </IconButton>
      }
    >
      <DropdownMenuLabel>{t("theme")}</DropdownMenuLabel>
      {light.map(item)}
      <div className="my-1 mx-3 h-px bg-border/60" />
      {dark.map(item)}
    </DropdownMenu>
  );
}
