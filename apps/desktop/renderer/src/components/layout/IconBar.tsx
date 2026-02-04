import {
  FolderOpen,
  Search,
  List,
  History,
  Brain,
  Users,
  Network,
  Settings,
  type LucideIcon,
} from "lucide-react";
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
 * Icon configuration type for panel navigation.
 */
type IconConfig = {
  panel: LeftPanelType;
  Icon: LucideIcon;
  label: string;
  testId: string;
};

/**
 * Main navigation icons (displayed at top of IconBar).
 *
 * Each icon maps to a LeftPanelType and provides:
 * - Icon: Lucide icon component
 * - label: Accessible label for screen readers
 * - testId: Test ID for E2E automation
 */
const MAIN_ICONS: IconConfig[] = [
  { panel: "files", Icon: FolderOpen, label: "Files", testId: "icon-bar-files" },
  { panel: "search", Icon: Search, label: "Search", testId: "icon-bar-search" },
  { panel: "outline", Icon: List, label: "Outline", testId: "icon-bar-outline" },
  { panel: "versionHistory", Icon: History, label: "Version History", testId: "icon-bar-version-history" },
  { panel: "memory", Icon: Brain, label: "Memory", testId: "icon-bar-memory" },
  { panel: "characters", Icon: Users, label: "Characters", testId: "icon-bar-characters" },
  { panel: "knowledgeGraph", Icon: Network, label: "Knowledge Graph", testId: "icon-bar-knowledge-graph" },
];

/**
 * Settings icon (displayed at bottom of IconBar, separated from main nav).
 */
const SETTINGS_ICON: IconConfig = {
  panel: "settings",
  Icon: Settings,
  label: "Settings",
  testId: "icon-bar-settings",
};

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

  /**
   * Render a single icon button.
   */
  const renderIconButton = ({ panel, Icon, label, testId }: IconConfig) => {
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
        <Icon size={20} className="text-current" />
      </button>
    );
  };

  return (
    <div
      className="flex flex-col items-center pt-2 pb-2 bg-[var(--color-bg-surface)] border-r border-[var(--color-separator)] h-full"
      style={{ width: LAYOUT_DEFAULTS.iconBarWidth }}
      data-testid="icon-bar"
    >
      {/* Main navigation icons at top */}
      <div className="flex flex-col items-center gap-1">
        {MAIN_ICONS.map(renderIconButton)}
      </div>

      {/* Spacer to push settings to bottom */}
      <div className="flex-1" />

      {/* Settings icon at bottom */}
      <div className="flex flex-col items-center gap-1">
        {renderIconButton(SETTINGS_ICON)}
      </div>
    </div>
  );
}
