import { useLayoutStore, LAYOUT_DEFAULTS } from "../../stores/layoutStore";

/**
 * IconBar is the fixed 48px navigation rail. For P0 it provides a minimal
 * toggle for the sidebar and stable sizing for layout E2E.
 *
 * Design spec §5.2: Icon Bar width is 48px, icons are 24px, click area is 40x40px.
 */
export function IconBar(): JSX.Element {
  const sidebarCollapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useLayoutStore((s) => s.setSidebarCollapsed);

  return (
    <div
      className="flex flex-col items-center pt-2 gap-2 bg-[var(--color-bg-surface)] border-r border-[var(--color-separator)]"
      style={{ width: LAYOUT_DEFAULTS.iconBarWidth }}
    >
      <button
        type="button"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="w-10 h-10 rounded-[var(--radius-sm)] bg-transparent text-[var(--color-fg-muted)] border border-[var(--color-border-default)] cursor-pointer hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-fg-default)] transition-colors duration-[var(--duration-fast)] focus-visible:outline focus-visible:outline-[length:var(--ring-focus-width)] focus-visible:outline-offset-[var(--ring-focus-offset)] focus-visible:outline-[var(--color-ring-focus)]"
        aria-label="Toggle sidebar"
      >
        ≡
      </button>
    </div>
  );
}
