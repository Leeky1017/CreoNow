import { LAYOUT_DEFAULTS } from "../../stores/layoutStore";

/**
 * StatusBar is the fixed 28px bottom bar. P0 keeps it minimal but stable for
 * layout E2E selectors.
 */
export function StatusBar(): JSX.Element {
  return (
    <div
      data-testid="layout-statusbar"
      style={{
        height: LAYOUT_DEFAULTS.statusBarHeight,
        background: "var(--color-bg-surface)",
        borderTop: "1px solid var(--color-separator)",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        fontSize: 11,
        color: "var(--color-fg-muted)",
      }}
    >
      Status: ready
    </div>
  );
}
