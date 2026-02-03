import React from "react";

import { FileTreePanel } from "../../features/files/FileTreePanel";
import { KnowledgeGraphPanel } from "../../features/kg/KnowledgeGraphPanel";
import { MemoryPanel } from "../../features/memory/MemoryPanel";
import { OutlinePanel } from "../../features/outline/OutlinePanel";
import { SearchPanel } from "../../features/search/SearchPanel";
import { LAYOUT_DEFAULTS, type LeftPanelType } from "../../stores/layoutStore";

type SidebarTab = "files" | "outline" | "search" | "kg";

/**
 * Sidebar tab button styles.
 * Active state uses focus border + selected background.
 */
const tabButtonBase = [
  "text-xs",
  "px-2",
  "py-1",
  "rounded-[var(--radius-md)]",
  "border",
  "text-[var(--color-fg-default)]",
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
  "border-[var(--color-border-focus)] bg-[var(--color-bg-selected)]";
const tabButtonInactive =
  "border-[var(--color-border-default)] bg-[var(--color-bg-surface)]";

/**
 * Sidebar is the left panel container (Files/Outline/Memory/etc).
 *
 * Why: P0 wires the Files tab as the minimal documents entry point with stable
 * selectors for Windows E2E. Memory panel can be shown here via activePanel prop.
 */
export function Sidebar(props: {
  width: number;
  collapsed: boolean;
  projectId: string | null;
  activePanel: LeftPanelType;
}): JSX.Element {
  const [activeTab, setActiveTab] = React.useState<SidebarTab>("files");

  if (props.collapsed) {
    return <aside data-testid="layout-sidebar" className="hidden w-0" />;
  }

  // Memory panel mode: render MemoryPanel instead of file tabs
  if (props.activePanel === "memory") {
    return (
      <aside
        data-testid="layout-sidebar"
        className="flex flex-col bg-[var(--color-bg-surface)] border-r border-[var(--color-separator)]"
        style={{
          width: props.width,
          minWidth: LAYOUT_DEFAULTS.sidebar.min,
          maxWidth: LAYOUT_DEFAULTS.sidebar.max,
        }}
      >
        <MemoryPanel />
      </aside>
    );
  }

  return (
    <aside
      data-testid="layout-sidebar"
      className="flex flex-col bg-[var(--color-bg-surface)] border-r border-[var(--color-separator)]"
      style={{
        width: props.width,
        minWidth: LAYOUT_DEFAULTS.sidebar.min,
        maxWidth: LAYOUT_DEFAULTS.sidebar.max,
      }}
    >
      {/* Tab bar */}
      <div className="flex gap-1 p-2 border-b border-[var(--color-separator)]">
        <button
          type="button"
          onClick={() => setActiveTab("files")}
          className={`${tabButtonBase} ${activeTab === "files" ? tabButtonActive : tabButtonInactive}`}
        >
          Files
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("outline")}
          className={`${tabButtonBase} ${activeTab === "outline" ? tabButtonActive : tabButtonInactive}`}
        >
          Outline
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("search")}
          className={`${tabButtonBase} ${activeTab === "search" ? tabButtonActive : tabButtonInactive}`}
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("kg")}
          className={`${tabButtonBase} ${activeTab === "kg" ? tabButtonActive : tabButtonInactive}`}
        >
          KG
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {props.projectId && activeTab === "files" ? (
          <FileTreePanel projectId={props.projectId} />
        ) : props.projectId && activeTab === "outline" ? (
          <OutlinePanel
            items={[]}
            activeId={null}
            onNavigate={(id) => {
              // TODO: Wire to editor scroll position
              console.log("Navigate to outline item:", id);
            }}
          />
        ) : props.projectId && activeTab === "search" ? (
          <SearchPanel projectId={props.projectId} />
        ) : props.projectId && activeTab === "kg" ? (
          <KnowledgeGraphPanel projectId={props.projectId} />
        ) : (
          <div className="p-3 text-xs text-[var(--color-fg-muted)]">
            Sidebar (no project)
          </div>
        )}
      </div>
    </aside>
  );
}
