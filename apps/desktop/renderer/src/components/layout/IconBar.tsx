import {
  useLayoutStore,
  LAYOUT_DEFAULTS,
  type LeftPanelType,
} from "../../stores/layoutStore";

const iconButtonBase = [
  "w-10",
  "h-10",
  "flex",
  "items-center",
  "justify-center",
  "rounded-[var(--radius-sm)]",
  "bg-transparent",
  "text-[var(--color-fg-muted)]",
  "border",
  "cursor-pointer",
  "transition-colors",
  "duration-[var(--duration-fast)]",
  "hover:bg-[var(--color-bg-hover)]",
  "hover:text-[var(--color-fg-default)]",
  "focus-visible:outline",
  "focus-visible:outline-[length:var(--ring-focus-width)]",
  "focus-visible:outline-offset-[var(--ring-focus-offset)]",
  "focus-visible:outline-[var(--color-ring-focus)]",
].join(" ");

const iconButtonInactive = "border-transparent";
const iconButtonActive =
  "border-[var(--color-border-focus)] bg-[var(--color-bg-selected)] text-[var(--color-fg-default)]";

/**
 * Icon configuration for each left panel view.
 *
 * Each icon maps to a LeftPanelType and provides:
 * - icon: Display character/emoji (will be replaced with proper icons later)
 * - label: Accessible label for screen readers
 * - testId: Test ID for E2E automation
 */
const LEFT_PANEL_ICONS: Array<{
  panel: LeftPanelType;
  icon: string;
  label: string;
  testId: string;
}> = [
  { panel: "files", icon: "📁", label: "Files", testId: "icon-bar-files" },
  { panel: "search", icon: "🔍", label: "Search", testId: "icon-bar-search" },
  { panel: "outline", icon: "📑", label: "Outline", testId: "icon-bar-outline" },
  { panel: "versionHistory", icon: "📜", label: "Version History", testId: "icon-bar-version-history" },
  { panel: "memory", icon: "🧠", label: "Memory", testId: "icon-bar-memory" },
  { panel: "characters", icon: "👤", label: "Characters", testId: "icon-bar-characters" },
  { panel: "knowledgeGraph", icon: "🕸️", label: "Knowledge Graph", testId: "icon-bar-knowledge-graph" },
  { panel: "settings", icon: "⚙️", label: "Settings", testId: "icon-bar-settings" },
];

/**
 * IconBar is the fixed 48px navigation rail (Windsurf-style).
 *
 * Behavior:
 * - Click an icon: switch to that view and expand sidebar if collapsed
 * - Click the same icon again: toggle sidebar collapse
 *
 * Design spec §5.2: Icon Bar width is 48px, icons are 24px, click area is 40x40px.
 */
export function IconBar(): JSX.Element {
  const sidebarCollapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useLayoutStore((s) => s.setSidebarCollapsed);
  const activeLeftPanel = useLayoutStore((s) => s.activeLeftPanel);
  const setActiveLeftPanel = useLayoutStore((s) => s.setActiveLeftPanel);

  /**
   * Handle icon click with Windsurf-style toggle behavior.
   *
   * - If clicking a different panel: switch to it and expand
   * - If clicking the current panel: toggle collapse
   */
  const handleIconClick = (panel: LeftPanelType) => {
    if (activeLeftPanel !== panel) {
      setActiveLeftPanel(panel);
      if (sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div
      className="flex flex-col items-center pt-2 gap-1 bg-[var(--color-bg-surface)] border-r border-[var(--color-separator)]"
      style={{ width: LAYOUT_DEFAULTS.iconBarWidth }}
      data-testid="icon-bar"
    >
      {LEFT_PANEL_ICONS.map(({ panel, icon, label, testId }) => {
        const isActive = activeLeftPanel === panel && !sidebarCollapsed;
        return (
          <button
            key={panel}
            type="button"
            onClick={() => handleIconClick(panel)}
            className={`${iconButtonBase} ${isActive ? iconButtonActive : iconButtonInactive}`}
            aria-label={label}
            aria-pressed={isActive}
            data-testid={testId}
            title={label}
          >
            <span className="text-lg">{icon}</span>
          </button>
        );
      })}
    </div>
  );
}
