import { useLayoutStore, LAYOUT_DEFAULTS } from "../../stores/layoutStore";

/**
 * IconBar is the fixed 48px navigation rail. For P0 it provides a minimal
 * toggle for the sidebar and stable sizing for layout E2E.
 */
export function IconBar(): JSX.Element {
  const sidebarCollapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useLayoutStore((s) => s.setSidebarCollapsed);

  return (
    <div
      style={{
        width: LAYOUT_DEFAULTS.iconBarWidth,
        background: "var(--color-bg-surface)",
        borderRight: "1px solid var(--color-separator)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 8,
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        style={{
          width: 40,
          height: 40,
          borderRadius: "var(--radius-sm)",
          background: "transparent",
          color: "var(--color-fg-muted)",
          border: "1px solid var(--color-border-default)",
          cursor: "pointer",
        }}
        aria-label="Toggle sidebar"
      >
        ≡
      </button>
    </div>
  );
}
