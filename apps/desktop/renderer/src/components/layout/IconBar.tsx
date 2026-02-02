import { useLayoutStore, LAYOUT_DEFAULTS } from "../../stores/layoutStore";

const iconButtonBase = [
  "w-10",
  "h-10",
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

const iconButtonInactive = "border-[var(--color-border-default)]";
const iconButtonActive =
  "border-[var(--color-border-focus)] bg-[var(--color-bg-selected)]";

/**
 * IconBar is the fixed 48px navigation rail. For P0 it provides a minimal
 * toggle for the sidebar and stable sizing for layout E2E.
 *
 * Design spec §5.2: Icon Bar width is 48px, icons are 24px, click area is 40x40px.
 */
export function IconBar(): JSX.Element {
  const sidebarCollapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useLayoutStore((s) => s.setSidebarCollapsed);
  const activeLeftPanel = useLayoutStore((s) => s.activeLeftPanel);
  const setActiveLeftPanel = useLayoutStore((s) => s.setActiveLeftPanel);

  const handleSidebarToggle = () => {
    if (activeLeftPanel !== "sidebar") {
      setActiveLeftPanel("sidebar");
      if (sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleMemoryClick = () => {
    if (activeLeftPanel !== "memory") {
      setActiveLeftPanel("memory");
      if (sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div
      className="flex flex-col items-center pt-2 gap-2 bg-[var(--color-bg-surface)] border-r border-[var(--color-separator)]"
      style={{ width: LAYOUT_DEFAULTS.iconBarWidth }}
    >
      {/* Sidebar toggle button */}
      <button
        type="button"
        onClick={handleSidebarToggle}
        className={`${iconButtonBase} ${activeLeftPanel === "sidebar" && !sidebarCollapsed ? iconButtonActive : iconButtonInactive}`}
        aria-label="Toggle sidebar"
      >
        ≡
      </button>

      {/* Memory panel button */}
      <button
        type="button"
        onClick={handleMemoryClick}
        className={`${iconButtonBase} ${activeLeftPanel === "memory" && !sidebarCollapsed ? iconButtonActive : iconButtonInactive}`}
        aria-label="Memory"
        data-testid="icon-bar-memory"
      >
        🧠
      </button>
    </div>
  );
}
