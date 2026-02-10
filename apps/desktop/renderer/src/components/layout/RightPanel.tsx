import React from "react";

import {
  LAYOUT_DEFAULTS,
  useLayoutStore,
  type RightPanelType,
} from "../../stores/layoutStore";
import { AiPanel } from "../../features/ai/AiPanel";
import { InfoPanel, QualityPanel } from "../../features/rightpanel";

/**
 * Context for opening SettingsDialog from nested components (e.g., SkillPicker).
 */
export const OpenSettingsContext = React.createContext<(() => void) | null>(null);

/**
 * Hook to get the openSettings callback from context.
 */
export function useOpenSettings(): () => void {
  const openSettings = React.useContext(OpenSettingsContext);
  if (!openSettings) {
    // Fallback: no-op if context not provided
    return () => {};
  }
  return openSettings;
}

/**
 * Tab button styles for right panel.
 */
const tabButtonBase = [
  "text-xs",
  "px-3",
  "py-1.5",
  "rounded-[var(--radius-md)]",
  "border",
  "cursor-pointer",
  "transition-colors",
  "duration-[var(--duration-fast)]",
  "hover:bg-[var(--color-bg-hover)]",
  "focus-visible:outline",
  "focus-visible:outline-[length:var(--ring-focus-width)]",
  "focus-visible:outline-offset-[var(--ring-focus-offset)]",
  "focus-visible:outline-[var(--color-ring-focus)]",
].join(" ");

const tabButtonActive =
  "border-[var(--color-border-focus)] bg-[var(--color-bg-selected)] text-[var(--color-fg-default)]";
const tabButtonInactive =
  "border-transparent bg-transparent text-[var(--color-fg-muted)]";

/**
 * Right panel tab configuration.
 */
const RIGHT_PANEL_TABS: Array<{
  type: RightPanelType;
  label: string;
  testId: string;
}> = [
  { type: "ai", label: "AI", testId: "right-panel-tab-ai" },
  { type: "info", label: "Info", testId: "right-panel-tab-info" },
  { type: "quality", label: "Quality", testId: "right-panel-tab-quality" },
];


/**
 * RightPanel is the right-side panel container with 3 tabs:
 * AI Assistant, Info, and Quality Gates.
 *
 * Design spec §5.3: Right panel default width 320px, min 240px, max 600px.
 *
 * Behavior:
 * - Tab switching is controlled by layoutStore.activeRightPanel
 * - Clicking a tab auto-expands the panel if collapsed
 */
export function RightPanel(props: {
  width: number;
  collapsed: boolean;
  /** Callback to open SettingsDialog from nested components */
  onOpenSettings?: () => void;
  /** Callback to open left-panel Version History */
  onOpenVersionHistory?: () => void;
}): JSX.Element {
  const activeRightPanel = useLayoutStore((s) => s.activeRightPanel);
  const setActiveRightPanel = useLayoutStore((s) => s.setActiveRightPanel);

  /**
   * Render the content for the active tab.
   */
  const renderContent = () => {
    switch (activeRightPanel) {
      case "ai":
        return <AiPanel />;
      case "info":
        return <InfoPanel onOpenVersionHistory={props.onOpenVersionHistory} />;
      case "quality":
        return <QualityPanel />;
      default: {
        const _exhaustive: never = activeRightPanel;
        return _exhaustive;
      }
    }
  };

  const openSettings = props.onOpenSettings ?? (() => {});

  // Always wrap in Provider to maintain consistent DOM structure for React reconciliation.
  // This ensures element references remain valid across collapsed/expanded state changes.
  if (props.collapsed) {
    return (
      <OpenSettingsContext.Provider value={openSettings}>
        <aside data-testid="layout-panel" className="hidden w-0" />
      </OpenSettingsContext.Provider>
    );
  }

  return (
    <OpenSettingsContext.Provider value={openSettings}>
      <aside
        data-testid="layout-panel"
        className="flex flex-col bg-[var(--color-bg-surface)] border-l border-[var(--color-separator)]"
        style={{
          width: props.width,
          minWidth: LAYOUT_DEFAULTS.panel.min,
          maxWidth: LAYOUT_DEFAULTS.panel.max,
        }}
      >
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-2 py-2 border-b border-[var(--color-separator)]">
          {RIGHT_PANEL_TABS.map(({ type, label, testId }) => {
            const isActive = activeRightPanel === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActiveRightPanel(type)}
                className={`${tabButtonBase} ${isActive ? tabButtonActive : tabButtonInactive}`}
                aria-pressed={isActive}
                data-testid={testId}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-auto">
          {renderContent()}
        </div>
      </aside>
    </OpenSettingsContext.Provider>
  );
}
