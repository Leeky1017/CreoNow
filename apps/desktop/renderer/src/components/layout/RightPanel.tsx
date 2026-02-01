import { LAYOUT_DEFAULTS } from "../../stores/layoutStore";
import { AiPanel } from "../../features/ai/AiPanel";
import { MemoryPanel } from "../../features/memory/MemoryPanel";
import { SettingsPanel } from "../../features/settings/SettingsPanel";

/**
 * RightPanel is the right-side panel container (AI/Info). P0 wires visibility
 * and resizing; feature content comes in later task cards.
 *
 * Design spec §5.3: Right panel default width 320px, min 240px, max 600px.
 */
export function RightPanel(props: {
  width: number;
  collapsed: boolean;
}): JSX.Element {
  if (props.collapsed) {
    return <aside data-testid="layout-panel" className="hidden w-0" />;
  }

  return (
    <aside
      data-testid="layout-panel"
      className="flex flex-col bg-[var(--color-bg-surface)] border-l border-[var(--color-separator)]"
      style={{
        width: props.width,
        minWidth: LAYOUT_DEFAULTS.panel.min,
        maxWidth: LAYOUT_DEFAULTS.panel.max,
      }}
    >
      <SettingsPanel />
      <div className="h-px bg-[var(--color-separator)]" />
      <MemoryPanel />
      <div className="h-px bg-[var(--color-separator)]" />
      <AiPanel />
    </aside>
  );
}
