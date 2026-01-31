import React from "react";

import { FileTreePanel } from "../../features/files/FileTreePanel";
import { KnowledgeGraphPanel } from "../../features/kg/KnowledgeGraphPanel";
import { SearchPanel } from "../../features/search/SearchPanel";
import { LAYOUT_DEFAULTS } from "../../stores/layoutStore";

type SidebarTab = "files" | "search" | "kg";

/**
 * Sidebar is the left panel container (Files/Outline/etc).
 *
 * Why: P0 wires the Files tab as the minimal documents entry point with stable
 * selectors for Windows E2E.
 */
export function Sidebar(props: {
  width: number;
  collapsed: boolean;
  projectId: string | null;
}): JSX.Element {
  const [activeTab, setActiveTab] = React.useState<SidebarTab>("files");

  if (props.collapsed) {
    return (
      <aside
        data-testid="layout-sidebar"
        style={{ width: 0, display: "none" }}
      />
    );
  }

  return (
    <aside
      data-testid="layout-sidebar"
      style={{
        width: props.width,
        minWidth: LAYOUT_DEFAULTS.sidebar.min,
        maxWidth: LAYOUT_DEFAULTS.sidebar.max,
        background: "var(--color-bg-surface)",
        borderRight: "1px solid var(--color-separator)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "var(--space-1)",
          padding: "var(--space-2)",
          borderBottom: "1px solid var(--color-separator)",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("files")}
          style={{
            fontSize: 12,
            padding: "var(--space-1) var(--space-2)",
            borderRadius: "var(--radius-md)",
            border:
              activeTab === "files"
                ? "1px solid var(--color-border-focus)"
                : "1px solid var(--color-border-default)",
            background:
              activeTab === "files"
                ? "var(--color-bg-selected)"
                : "var(--color-bg-surface)",
            color: "var(--color-fg-default)",
            cursor: "pointer",
          }}
        >
          Files
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("search")}
          style={{
            fontSize: 12,
            padding: "var(--space-1) var(--space-2)",
            borderRadius: "var(--radius-md)",
            border:
              activeTab === "search"
                ? "1px solid var(--color-border-focus)"
                : "1px solid var(--color-border-default)",
            background:
              activeTab === "search"
                ? "var(--color-bg-selected)"
                : "var(--color-bg-surface)",
            color: "var(--color-fg-default)",
            cursor: "pointer",
          }}
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("kg")}
          style={{
            fontSize: 12,
            padding: "var(--space-1) var(--space-2)",
            borderRadius: "var(--radius-md)",
            border:
              activeTab === "kg"
                ? "1px solid var(--color-border-focus)"
                : "1px solid var(--color-border-default)",
            background:
              activeTab === "kg"
                ? "var(--color-bg-selected)"
                : "var(--color-bg-surface)",
            color: "var(--color-fg-default)",
            cursor: "pointer",
          }}
        >
          KG
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {props.projectId && activeTab === "files" ? (
          <FileTreePanel projectId={props.projectId} />
        ) : props.projectId && activeTab === "search" ? (
          <SearchPanel projectId={props.projectId} />
        ) : props.projectId && activeTab === "kg" ? (
          <KnowledgeGraphPanel projectId={props.projectId} />
        ) : (
          <div
            style={{
              padding: "var(--space-3)",
              fontSize: 12,
              color: "var(--color-fg-muted)",
            }}
          >
            Sidebar (no project)
          </div>
        )}
      </div>
    </aside>
  );
}
