import { LAYOUT_DEFAULTS } from "../../stores/layoutStore";

/**
 * Sidebar is the left panel container. P0 keeps it as a placeholder while
 * exposing stable selectors and correct resize constraints.
 */
export function Sidebar(props: {
  width: number;
  collapsed: boolean;
}): JSX.Element {
  if (props.collapsed) {
    return (
      <aside
        data-testid="layout-sidebar"
        style={{ width: 0, display: "none" }}
      />
    );
  }

  return (
    <aside
      data-testid="layout-sidebar"
      style={{
        width: props.width,
        minWidth: LAYOUT_DEFAULTS.sidebar.min,
        maxWidth: LAYOUT_DEFAULTS.sidebar.max,
        background: "var(--color-bg-surface)",
        borderRight: "1px solid var(--color-separator)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: 12,
          fontSize: 12,
          color: "var(--color-fg-muted)",
        }}
      >
        Sidebar (placeholder)
      </div>
    </aside>
  );
}
