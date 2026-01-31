import { LAYOUT_DEFAULTS } from "../../stores/layoutStore";

/**
 * RightPanel is the right-side panel container (AI/Info). P0 wires visibility
 * and resizing; feature content comes in later task cards.
 */
export function RightPanel(props: {
  width: number;
  collapsed: boolean;
}): JSX.Element {
  if (props.collapsed) {
    return (
      <aside data-testid="layout-panel" style={{ width: 0, display: "none" }} />
    );
  }

  return (
    <aside
      data-testid="layout-panel"
      style={{
        width: props.width,
        minWidth: LAYOUT_DEFAULTS.panel.min,
        maxWidth: LAYOUT_DEFAULTS.panel.max,
        background: "var(--color-bg-surface)",
        borderLeft: "1px solid var(--color-separator)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{ padding: 12, fontSize: 12, color: "var(--color-fg-muted)" }}
      >
        Right panel (placeholder)
      </div>
    </aside>
  );
}
