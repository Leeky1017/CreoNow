import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";

import type { DragState, LeftPanelId, RightPanelId } from "./types";

const LAYOUT_STORAGE_KEYS = {
  activeLeftPanel: "creonow.layout.activeLeftPanel",
  activeRightPanel: "creonow.layout.activePanelTab",
  panelCollapsed: "creonow.layout.panelCollapsed",
  panelWidth: "creonow.layout.panelWidth",
  sidebarCollapsed: "creonow.layout.sidebarCollapsed",
  sidebarWidth: "creonow.layout.sidebarWidth",
  zenMode: "creonow.layout.zenMode",
} as const;

const LEFT_SIDEBAR_BOUNDS = {
  /** @why 260px matches the golden design source (figma_design/前端完整参考/layout.tsx line 176). */
  defaultWidth: 260,
  minWidth: 180,
  maxWidth: 400,
} as const;

const RIGHT_PANEL_BOUNDS = {
  defaultWidth: 320,
  minWidth: 280,
  maxWidth: 480,
} as const;

const LEFT_PANEL_IDS: LeftPanelId[] = [
  "dashboard",
  "files",
  "search",
  "calendar",
  "outline",
  "scenarios",
  "versionHistory",
  "memory",
  "characters",
  "knowledgeGraph",
  "settings",
];

const RIGHT_PANEL_IDS = ["ai", "info", "quality"] as const satisfies readonly RightPanelId[];

function clampWidth(value: number, bounds: { minWidth: number; maxWidth: number }): number {
  return Math.min(bounds.maxWidth, Math.max(bounds.minWidth, Math.round(value)));
}

function readLayoutValue(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLayoutValue(key: string, value: boolean | number | string): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage failures in constrained environments.
  }
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  const value = readLayoutValue(key);
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}

function readStoredPanelId<TPanel extends string>(key: string, allowed: readonly TPanel[], fallback: TPanel): TPanel {
  const value = readLayoutValue(key);
  if (value !== null && allowed.includes(value as TPanel)) {
    return value as TPanel;
  }
  return fallback;
}

function readStoredWidth(
  key: string,
  bounds: { defaultWidth: number; minWidth: number; maxWidth: number },
): number {
  const value = Number(readLayoutValue(key));
  if (Number.isFinite(value)) {
    return clampWidth(value, bounds);
  }
  return bounds.defaultWidth;
}

export { LEFT_SIDEBAR_BOUNDS, RIGHT_PANEL_BOUNDS, RIGHT_PANEL_IDS };

export function usePanelLayout() {
  const [activeLeftPanel, setActiveLeftPanel] = useState<LeftPanelId>(() =>
    readStoredPanelId(LAYOUT_STORAGE_KEYS.activeLeftPanel, LEFT_PANEL_IDS, "files"),
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    readStoredBoolean(LAYOUT_STORAGE_KEYS.sidebarCollapsed, false),
  );
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    readStoredWidth(LAYOUT_STORAGE_KEYS.sidebarWidth, LEFT_SIDEBAR_BOUNDS),
  );
  const [activeRightPanel, setActiveRightPanel] = useState<RightPanelId>(() =>
    readStoredPanelId(LAYOUT_STORAGE_KEYS.activeRightPanel, RIGHT_PANEL_IDS, "ai"),
  );
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(() =>
    readStoredBoolean(LAYOUT_STORAGE_KEYS.panelCollapsed, false),
  );
  const [rightPanelWidth, setRightPanelWidth] = useState(() =>
    readStoredWidth(LAYOUT_STORAGE_KEYS.panelWidth, RIGHT_PANEL_BOUNDS),
  );
  const [dragState, setDragState] = useState<DragState>(null);
  const [zenMode, setZenMode] = useState(() =>
    readStoredBoolean(LAYOUT_STORAGE_KEYS.zenMode, false),
  );

  useEffect(() => {
    writeLayoutValue(LAYOUT_STORAGE_KEYS.activeLeftPanel, activeLeftPanel);
  }, [activeLeftPanel]);

  useEffect(() => {
    writeLayoutValue(LAYOUT_STORAGE_KEYS.sidebarCollapsed, sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    writeLayoutValue(LAYOUT_STORAGE_KEYS.sidebarWidth, sidebarWidth);
  }, [sidebarWidth]);

  useEffect(() => {
    writeLayoutValue(LAYOUT_STORAGE_KEYS.activeRightPanel, activeRightPanel);
  }, [activeRightPanel]);

  useEffect(() => {
    writeLayoutValue(LAYOUT_STORAGE_KEYS.panelCollapsed, rightPanelCollapsed);
  }, [rightPanelCollapsed]);

  useEffect(() => {
    writeLayoutValue(LAYOUT_STORAGE_KEYS.panelWidth, rightPanelWidth);
  }, [rightPanelWidth]);

  useEffect(() => {
    writeLayoutValue(LAYOUT_STORAGE_KEYS.zenMode, zenMode);
  }, [zenMode]);

  useEffect(() => {
    if (dragState === null) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (dragState.panel === "left") {
        setSidebarWidth(clampWidth(dragState.startWidth + (event.clientX - dragState.startX), LEFT_SIDEBAR_BOUNDS));
        return;
      }

      setRightPanelWidth(clampWidth(dragState.startWidth + (dragState.startX - event.clientX), RIGHT_PANEL_BOUNDS));
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Shift+Z toggles Zen Mode — but only when NOT in an editable field.
      // @why Without this guard, typing uppercase "Z" in the ProseMirror editor,
      // AI textarea, or any <input> would fire preventDefault() and toggle zen
      // mode instead of inserting the character.
      // @risk isContentEditable alone may not be computed in all DOM environments
      // (e.g. jsdom), so we also check the contenteditable attribute directly.
      if (event.shiftKey && event.key.toLowerCase() === "z" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target as HTMLElement;
        if (
          target.isContentEditable
          || target.contentEditable === "true"
          || target.closest?.("[contenteditable='true']") != null
          || target.tagName === "INPUT"
          || target.tagName === "TEXTAREA"
          || target.tagName === "SELECT"
        ) {
          return;
        }
        event.preventDefault();
        setZenMode((current) => !current);
        return;
      }

      if ((event.metaKey || event.ctrlKey) === false || event.altKey || event.shiftKey) {
        return;
      }

      if (event.key === "\\") {
        event.preventDefault();
        setSidebarCollapsed((current) => !current);
        return;
      }

      if (event.key.toLowerCase() === "l") {
        event.preventDefault();
        if (rightPanelCollapsed) {
          setActiveRightPanel("ai");
          setRightPanelCollapsed(false);
          return;
        }

        setRightPanelCollapsed(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [rightPanelCollapsed]);

  const handleLeftPanelSelect = useCallback((panelId: LeftPanelId) => {
    if (activeLeftPanel === panelId) {
      setSidebarCollapsed((current) => !current);
      return;
    }

    setActiveLeftPanel(panelId);
    setSidebarCollapsed(false);
  }, [activeLeftPanel]);

  const handleRightPanelSelect = useCallback((panelId: RightPanelId) => {
    setActiveRightPanel(panelId);
    setRightPanelCollapsed(false);
  }, []);

  const handleToggleRightPanel = useCallback(() => {
    setRightPanelCollapsed((current) => !current);
  }, []);

  const toggleZenMode = useCallback(() => {
    setZenMode((current) => !current);
  }, []);

  const startResize = useCallback((panel: "left" | "right") => (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    if (panel === "left") {
      setDragState({ panel, startX: event.clientX, startWidth: sidebarWidth });
      return;
    }

    setDragState({ panel, startX: event.clientX, startWidth: rightPanelWidth });
  }, [sidebarWidth, rightPanelWidth]);

  return {
    activeLeftPanel,
    activeRightPanel,
    dragState,
    handleLeftPanelSelect,
    handleRightPanelSelect,
    handleToggleRightPanel,
    rightPanelCollapsed,
    rightPanelWidth,
    setActiveLeftPanel,
    setActiveRightPanel,
    setRightPanelCollapsed,
    setRightPanelWidth,
    setSidebarCollapsed,
    setSidebarWidth,
    sidebarCollapsed,
    sidebarWidth,
    startResize,
    toggleZenMode,
    zenMode,
  };
}
