import React from "react";

import { Button } from "../../components/primitives/Button";
import { Heading } from "../../components/primitives/Heading";
import { AnalyticsPage } from "../analytics/AnalyticsPage";
import { AppearanceSection } from "./AppearanceSection";
import { JudgeSection } from "./JudgeSection";
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
      className="flex flex-col gap-3 p-3"
    >
      <div className="flex items-baseline gap-2.5">
        <Heading level="h3" className="font-extrabold">
          Settings
        </Heading>
        <Button
          data-testid="open-analytics"
          variant="secondary"
          size="sm"
          onClick={() => setAnalyticsOpen(true)}
          className="ml-auto"
        >
          Analytics
        </Button>
      </div>
      <AppearanceSection />
      <ProxySection />
      <JudgeSection />

      <AnalyticsPage open={analyticsOpen} onOpenChange={setAnalyticsOpen} />
    </div>
  );
}
