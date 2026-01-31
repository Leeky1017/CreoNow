import { JudgeSection } from "./JudgeSection";

/**
 * SettingsPanel is the minimal Settings surface rendered in the right panel.
 *
 * Why: P0 requires an always-available, E2E-testable entry point for judge state.
 */
export function SettingsPanel(): JSX.Element {
  return (
    <div
      data-testid="settings-panel"
      style={{
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800 }}>Settings</div>
      <JudgeSection />
    </div>
  );
}
