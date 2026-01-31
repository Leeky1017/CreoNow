import React from "react";

import { AnalyticsPage } from "../analytics/AnalyticsPage";
import { JudgeSection } from "./JudgeSection";
import { AppearanceSection } from "./AppearanceSection";
import { ProxySection } from "./ProxySection";

/**
 * SettingsPanel is the minimal Settings surface rendered in the right panel.
 *
 * Why: P0 requires an always-available, E2E-testable entry point for judge state.
 */
export function SettingsPanel(): JSX.Element {
  const [analyticsOpen, setAnalyticsOpen] = React.useState(false);

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
      <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>Settings</div>
        <button
          data-testid="open-analytics"
          type="button"
          onClick={() => setAnalyticsOpen(true)}
          style={{
            marginLeft: "auto",
            height: 28,
            padding: "0 var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-default)",
            background: "var(--color-bg-surface)",
            color: "var(--color-fg-default)",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Analytics
        </button>
      </div>
      <AppearanceSection />
      <ProxySection />
      <JudgeSection />

      <AnalyticsPage open={analyticsOpen} onOpenChange={setAnalyticsOpen} />
    </div>
  );
}
