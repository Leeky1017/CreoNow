import { LAYOUT_DEFAULTS } from "../../stores/layoutStore";
import { AiPanel } from "../../features/ai/AiPanel";
import { MemoryPanel } from "../../features/memory/MemoryPanel";
import { SettingsPanel } from "../../features/settings/SettingsPanel";

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
      <SettingsPanel />
      <div style={{ height: 1, background: "var(--color-separator)" }} />
      <MemoryPanel />
      <div style={{ height: 1, background: "var(--color-separator)" }} />
      <AiPanel />
    </aside>
  );
}
