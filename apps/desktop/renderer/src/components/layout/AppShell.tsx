import React from "react";

import { useLayoutStore, LAYOUT_DEFAULTS } from "../../stores/layoutStore";
import { IconBar } from "./IconBar";
import { RightPanel } from "./RightPanel";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";
import { Resizer } from "./Resizer";
import { CommandPalette } from "../../features/commandPalette/CommandPalette";
import { WelcomeScreen } from "../../features/welcome/WelcomeScreen";

/**
 * Clamp a value between min/max bounds.
 */
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Compute maximum available sidebar width given current window width.
 *
 * Why: we must keep main content usable (min 400px) even on small windows.
 */
function computeSidebarMax(
  windowWidth: number,
  panelWidth: number,
  panelCollapsed: boolean,
): number {
  const panel = panelCollapsed ? 0 : panelWidth;
  const max =
    windowWidth -
    LAYOUT_DEFAULTS.iconBarWidth -
    panel -
    LAYOUT_DEFAULTS.mainMinWidth;
  return Math.max(
    LAYOUT_DEFAULTS.sidebar.min,
    Math.min(LAYOUT_DEFAULTS.sidebar.max, max),
  );
}

/**
 * Compute maximum available panel width given current window width.
 */
function computePanelMax(
  windowWidth: number,
  sidebarWidth: number,
  sidebarCollapsed: boolean,
): number {
  const sidebar = sidebarCollapsed ? 0 : sidebarWidth;
  const max =
    windowWidth -
    LAYOUT_DEFAULTS.iconBarWidth -
    sidebar -
    LAYOUT_DEFAULTS.mainMinWidth;
  return Math.max(
    LAYOUT_DEFAULTS.panel.min,
    Math.min(LAYOUT_DEFAULTS.panel.max, max),
  );
}

/**
 * AppShell renders the Workbench three-column layout (IconBar + Sidebar + Main
 * + RightPanel) and wires resizing, persistence, and P0 keyboard shortcuts.
 */
export function AppShell(): JSX.Element {
  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth);
  const panelWidth = useLayoutStore((s) => s.panelWidth);
  const sidebarCollapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const panelCollapsed = useLayoutStore((s) => s.panelCollapsed);
  const zenMode = useLayoutStore((s) => s.zenMode);

  const setSidebarWidth = useLayoutStore((s) => s.setSidebarWidth);
  const setPanelWidth = useLayoutStore((s) => s.setPanelWidth);
  const setSidebarCollapsed = useLayoutStore((s) => s.setSidebarCollapsed);
  const setPanelCollapsed = useLayoutStore((s) => s.setPanelCollapsed);
  const setZenMode = useLayoutStore((s) => s.setZenMode);
  const resetSidebarWidth = useLayoutStore((s) => s.resetSidebarWidth);
  const resetPanelWidth = useLayoutStore((s) => s.resetPanelWidth);

  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "F11") {
        e.preventDefault();
        setZenMode(!zenMode);
        return;
      }

      if (zenMode && e.key === "Escape") {
        e.preventDefault();
        setZenMode(false);
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) {
        return;
      }

      if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if (e.key === "\\") {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
        return;
      }

      if (e.key.toLowerCase() === "l") {
        e.preventDefault();
        setPanelCollapsed(!panelCollapsed);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    panelCollapsed,
    setPanelCollapsed,
    setSidebarCollapsed,
    setZenMode,
    sidebarCollapsed,
    zenMode,
  ]);

  const effectiveSidebarWidth = sidebarCollapsed ? 0 : sidebarWidth;
  const effectivePanelWidth = panelCollapsed ? 0 : panelWidth;

  return (
    <div
      data-testid="app-shell"
      style={{
        display: "flex",
        height: "100%",
        background: "var(--color-bg-base)",
      }}
    >
      <IconBar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", minWidth: 0 }}>
          <Sidebar width={effectiveSidebarWidth} collapsed={sidebarCollapsed} />

          {!sidebarCollapsed ? (
            <Resizer
              testId="resize-handle-sidebar"
              onDrag={(deltaX, startWidth) => {
                const nextRaw = startWidth + deltaX;
                const max = computeSidebarMax(
                  window.innerWidth,
                  panelWidth,
                  panelCollapsed,
                );
                return clamp(nextRaw, LAYOUT_DEFAULTS.sidebar.min, max);
              }}
              onCommit={(nextWidth) => setSidebarWidth(nextWidth)}
              onDoubleClick={() => resetSidebarWidth()}
              getStartWidth={() => sidebarWidth}
            />
          ) : null}

          <main
            style={{
              flex: 1,
              minWidth: LAYOUT_DEFAULTS.mainMinWidth,
              background: "var(--color-bg-base)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-fg-muted)",
              fontSize: 13,
            }}
          >
            <WelcomeScreen />
          </main>

          {!panelCollapsed ? (
            <Resizer
              testId="resize-handle-panel"
              onDrag={(deltaX, startWidth) => {
                const nextRaw = startWidth - deltaX;
                const max = computePanelMax(
                  window.innerWidth,
                  sidebarWidth,
                  sidebarCollapsed,
                );
                return clamp(nextRaw, LAYOUT_DEFAULTS.panel.min, max);
              }}
              onCommit={(nextWidth) => setPanelWidth(nextWidth)}
              onDoubleClick={() => resetPanelWidth()}
              getStartWidth={() => panelWidth}
            />
          ) : null}

          <RightPanel width={effectivePanelWidth} collapsed={panelCollapsed} />
        </div>

        <StatusBar />
      </div>

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </div>
  );
}
