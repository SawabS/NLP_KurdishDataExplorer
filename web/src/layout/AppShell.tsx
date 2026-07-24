import { useMemo, useState, type ReactNode } from "react";
import { ChartNoAxesCombined, Database, FolderUp, GitBranch, Home, Languages, Map, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { CommandPalette, IconButton, Sidebar, SidebarItem, Spinner, Tooltip, Typography, type CommandPaletteGroup } from "noor-ui";
import { useTheme } from "noor-ui/providers";
import { useSources, useTopics } from "../api/hooks";
import { useJobs } from "../app/JobsProvider";
import { useLocale } from "../lib/i18n";
import { compactSourceLabel, topicName } from "../lib/labels";
import { ThemeMenu } from "./ThemeMenu";
import { useWorkspacePanel } from "./WorkspacePanel";

export function AppShell({children}: {children: ReactNode}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, locale, setLocale } = useLocale();
  const { setTheme, resolvedTheme } = useTheme();
  const { active } = useJobs();
  const sources = useSources();
  const panel = useWorkspacePanel();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const exploreMatch = location.pathname.match(/^\/explore\/([^/]+)\/([^/]+)\/([^/]+)/);
  const currentSource = exploreMatch ? decodeURIComponent(exploreMatch[1]) : "";
  const currentModel = exploreMatch ? decodeURIComponent(exploreMatch[2]) : "";
  const topics = useTopics(currentSource, currentModel, paletteOpen && Boolean(exploreMatch));

  const firstExplorePath = useMemo(() => {
    const source = sources.data?.find((item) => item.models.some((model) => model.fitted));
    const model = source?.models.find((item) => item.fitted);
    return source && model ? `/explore/${encodeURIComponent(source.source)}/${encodeURIComponent(model.key)}/tree` : undefined;
  }, [sources.data]);

  const navigation = [
    {label: t("navOverview"), icon: Home, path: "/", active: location.pathname === "/"},
    {label: t("navExplore"), icon: Database, path: firstExplorePath ?? "/", active: location.pathname.startsWith("/explore"), disabled: !firstExplorePath},
    {label: t("navUpload"), icon: FolderUp, path: "/upload", active: location.pathname === "/upload"},
  ];

  const paletteGroups: CommandPaletteGroup[] = useMemo(() => {
    const groups: CommandPaletteGroup[] = [];
    if (exploreMatch) {
      groups.push({
        group: "Workspaces",
        items: [
          {id: "ws-tree", label: t("tabStructure"), icon: <GitBranch className="size-4" />, onSelect: () => navigate(`/explore/${exploreMatch[1]}/${exploreMatch[2]}/tree`)},
          {id: "ws-map", label: t("tabMap"), icon: <Map className="size-4" />, onSelect: () => navigate(`/explore/${exploreMatch[1]}/${exploreMatch[2]}/map`)},
          {id: "ws-ask", label: t("tabSearch"), icon: <Search className="size-4" />, onSelect: () => navigate(`/explore/${exploreMatch[1]}/${exploreMatch[2]}/ask`)},
          {id: "ws-insights", label: t("tabInsights"), icon: <ChartNoAxesCombined className="size-4" />, onSelect: () => navigate(`/explore/${exploreMatch[1]}/${exploreMatch[2]}/insights`)},
        ],
      });
      if (topics.data) {
        groups.push({
          group: t("topics"),
          items: topics.data.topics.slice(0, 60).map((topic) => ({
            id: `topic-${topic.topic}`,
            label: `#${topic.topic} ${topicName(topic)}`,
            onSelect: () => navigate(`${location.pathname}?topic=${topic.topic}`),
          })),
        });
      }
    }
    if (sources.data?.length) {
      groups.push({
        group: t("corpus"),
        items: sources.data.map((source) => {
          const model = source.models.find((item) => item.fitted) ?? source.models[0];
          return {
            id: `source-${source.source}`,
            label: compactSourceLabel(source.title),
            icon: <Database className="size-4" />,
            onSelect: () => navigate(`/explore/${encodeURIComponent(source.source)}/${encodeURIComponent(model.key)}/tree`),
          };
        }),
      });
    }
    groups.push({
      group: "Actions",
      items: [
        {id: "upload", label: t("navUpload"), icon: <FolderUp className="size-4" />, onSelect: () => navigate("/upload")},
        {id: "language", label: `${t("language")}: ${locale === "en" ? "کوردی" : "English"}`, icon: <Languages className="size-4" />, onSelect: () => setLocale(locale === "en" ? "ckb" : "en")},
        {id: "theme", label: resolvedTheme === "dark" ? "Light theme" : "Dark theme", onSelect: () => setTheme(resolvedTheme === "dark" ? "light" : "dark")},
      ],
    });
    return groups;
  }, [exploreMatch, locale, location.pathname, navigate, resolvedTheme, setLocale, setTheme, sources.data, t, topics.data]);

  const localeToggle = (
    <Tooltip content={`${t("language")} · ${locale === "en" ? "کوردی" : "English"}`} side="right">
      <IconButton
        aria-label={t("language")}
        variant="ghost"
        size="sm"
        onClick={() => setLocale(locale === "en" ? "ckb" : "en")}
      >
        <Languages className="size-4" />
      </IconButton>
    </Tooltip>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas text-text-primary">
      <CommandPalette items={paletteGroups} open={paletteOpen} onOpenChange={setPaletteOpen} enableShortcut placeholder={t("commandPlaceholder")} />

      {/* Fixed-width icon rail — its width never changes, so content stays put. */}
      <Sidebar
        collapsed
        className="hidden shrink-0 md:flex"
        header={
          <button
            type="button"
            className="mx-auto grid size-10 place-items-center rounded-md bg-primary-action text-label font-semibold text-primary-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
            aria-label={t("appName")}
            onClick={() => navigate("/")}
          >
            KD
          </button>
        }
        footer={
          <div className="flex flex-col items-center gap-2">
            {exploreMatch && (
              <Tooltip content={panel.open ? t("collapse") : t("expand")} side="right">
                <IconButton
                  aria-label={panel.open ? t("collapse") : t("expand")}
                  aria-pressed={panel.open}
                  variant="ghost"
                  size="sm"
                  onClick={panel.toggle}
                >
                  {panel.open ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
                </IconButton>
              </Tooltip>
            )}
            {active.length > 0 && (
              <Tooltip content={`${t("activeFit")} · ${Math.round((active[0].fraction ?? 0) * 100)}%`} side="right">
                <button
                  type="button"
                  aria-label={t("activeFit")}
                  onClick={() => navigate("/upload")}
                  className="grid size-9 place-items-center rounded-md text-text-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
                >
                  <Spinner size="sm" />
                </button>
              </Tooltip>
            )}
            {localeToggle}
            <ThemeMenu />
          </div>
        }
      >
        {navigation.map((item) => (
          <SidebarItem key={item.label} icon={item.icon} label={item.label} active={item.active} disabled={item.disabled} onClick={() => navigate(item.path)} />
        ))}
      </Sidebar>

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 md:px-6">
          <div className="flex min-w-0 items-baseline gap-3">
            <Typography variant="label">{t("appName")}</Typography>
            <span className="hidden text-caption text-text-muted sm:inline">{t("appTagline")}</span>
          </div>
          <div className="flex items-center gap-2">
            {active.length > 0 && (
              <button
                type="button"
                onClick={() => navigate("/upload")}
                className="me-1 hidden items-center gap-2 rounded-md border border-border bg-surface-raised px-2.5 py-1 text-caption text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:flex"
              >
                <Spinner size="sm" />
                <span aria-live="polite">{t("activeFit")} · {Math.round((active[0].fraction ?? 0) * 100)}%</span>
              </button>
            )}
            <div className="flex items-center gap-1 md:hidden">{localeToggle}<ThemeMenu /></div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-sticky flex h-16 items-stretch border-t border-border bg-surface md:hidden" aria-label="Primary navigation">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              aria-current={item.active ? "page" : undefined}
              disabled={item.disabled}
              onClick={() => navigate(item.path)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring disabled:opacity-disabled ${item.active ? "text-text-primary" : "text-text-muted"}`}
            >
              <Icon className="size-[18px]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
