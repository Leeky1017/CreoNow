import {
  LAYOUT_DEFAULTS,
  useLayoutStore,
  type RightPanelType,
} from "../../stores/layoutStore";
import { AiPanel } from "../../features/ai/AiPanel";
import { QualityGatesPanelContent } from "../../features/quality-gates/QualityGatesPanel";

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
 * InfoPanel placeholder content.
 *
 * TODO: Replace with full implementation showing document info,
 * writing statistics, and context summaries.
 */
function InfoPanelContent(): JSX.Element {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="text-[var(--color-fg-muted)] text-sm">
        Document Info
      </div>
      <div className="text-[var(--color-fg-subtle)] text-xs mt-2">
        Statistics and context will appear here
      </div>
    </div>
  );
}

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
}): JSX.Element {
  const activeRightPanel = useLayoutStore((s) => s.activeRightPanel);
  const setActiveRightPanel = useLayoutStore((s) => s.setActiveRightPanel);

  if (props.collapsed) {
    return <aside data-testid="layout-panel" className="hidden w-0" />;
  }

  /**
   * Render the content for the active tab.
   */
  const renderContent = () => {
    switch (activeRightPanel) {
      case "ai":
        return <AiPanel />;
      case "info":
        return <InfoPanelContent />;
      case "quality":
        return (
          <QualityGatesPanelContent
            checkGroups={[]}
            panelStatus="all-passed"
            showCloseButton={false}
          />
        );
      default: {
        const _exhaustive: never = activeRightPanel;
        return _exhaustive;
      }
    }
  };

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
  );
}
