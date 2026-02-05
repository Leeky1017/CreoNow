import React from "react";
import { create } from "zustand";

import type { PreferenceStore } from "../lib/preferences";

const APP_ID = "creonow" as const;

export const LAYOUT_DEFAULTS = {
  iconBarWidth: 48,
  statusBarHeight: 28,
  sidebar: { min: 180, max: 400, default: 240 },
  panel: { min: 280, max: 480, default: 320 },
  mainMinWidth: 400,
} as const;

/**
 * Left panel view types.
 *
 * Each type corresponds to an icon in IconBar and a view in LeftPanel.
 */
export type LeftPanelType =
  | "files"
  | "search"
  | "outline"
  | "versionHistory"
  | "memory"
  | "characters"
  | "knowledgeGraph";

/**
 * Right panel tab types.
 *
 * Only AI Assistant, Info, and Quality Gates are shown in the right panel.
 */
export type RightPanelType = "ai" | "info" | "quality";

export type LayoutState = {
  sidebarWidth: number;
  panelWidth: number;
  sidebarCollapsed: boolean;
  panelCollapsed: boolean;
  zenMode: boolean;
  activeLeftPanel: LeftPanelType;
  activeRightPanel: RightPanelType;
};

export type LayoutActions = {
  setSidebarWidth: (width: number) => void;
  setPanelWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setPanelCollapsed: (collapsed: boolean) => void;
  setZenMode: (enabled: boolean) => void;
  resetSidebarWidth: () => void;
  resetPanelWidth: () => void;
  setActiveLeftPanel: (panel: LeftPanelType) => void;
  /**
   * Set the active right panel tab.
   *
   * If the panel is collapsed, it will be automatically expanded.
   */
  setActiveRightPanel: (panel: RightPanelType) => void;
};

export type LayoutStore = LayoutState & LayoutActions;

export type UseLayoutStore = ReturnType<typeof createLayoutStore>;

const LayoutStoreContext = React.createContext<UseLayoutStore | null>(null);

/**
 * Build a strongly-typed preference key for layout settings.
 */
function prefKey(
  name: "sidebarWidth" | "panelWidth" | "sidebarCollapsed" | "panelCollapsed",
): `${typeof APP_ID}.layout.${typeof name}` {
  return `${APP_ID}.layout.${name}` as const;
}

/**
 * Create a zustand store for layout.
 *
 * Why: layout state must be shared between AppShell and resizers, and must
 * persist synchronously to keep E2E stable and avoid drag jank.
 */
export function createLayoutStore(preferences: PreferenceStore) {
  let zenRestore: {
    sidebarCollapsed: boolean;
    panelCollapsed: boolean;
  } | null = null;

  const initialSidebarWidth =
    preferences.get<number>(prefKey("sidebarWidth")) ??
    LAYOUT_DEFAULTS.sidebar.default;
  const initialPanelWidth =
    preferences.get<number>(prefKey("panelWidth")) ??
    LAYOUT_DEFAULTS.panel.default;
  const initialSidebarCollapsed =
    preferences.get<boolean>(prefKey("sidebarCollapsed")) ?? false;
  const initialPanelCollapsed =
    preferences.get<boolean>(prefKey("panelCollapsed")) ?? false;

  return create<LayoutStore>((set, get) => ({
    sidebarWidth: initialSidebarWidth,
    panelWidth: initialPanelWidth,
    sidebarCollapsed: initialSidebarCollapsed,
    panelCollapsed: initialPanelCollapsed,
    zenMode: false,
    activeLeftPanel: "files",
    activeRightPanel: "ai",

    setSidebarWidth: (width) => {
      set({ sidebarWidth: width });
      preferences.set(prefKey("sidebarWidth"), width);
    },
    setPanelWidth: (width) => {
      set({ panelWidth: width });
      preferences.set(prefKey("panelWidth"), width);
    },
    setSidebarCollapsed: (collapsed) => {
      set({ sidebarCollapsed: collapsed });
      preferences.set(prefKey("sidebarCollapsed"), collapsed);
    },
    setPanelCollapsed: (collapsed) => {
      set({ panelCollapsed: collapsed });
      preferences.set(prefKey("panelCollapsed"), collapsed);
    },
    setZenMode: (enabled) => {
      if (enabled) {
        const current = get();
        if (current.zenMode) {
          return;
        }
        zenRestore = {
          sidebarCollapsed: current.sidebarCollapsed,
          panelCollapsed: current.panelCollapsed,
        };
        set({ zenMode: true, sidebarCollapsed: true, panelCollapsed: true });
        return;
      }

      const current = get();
      if (!current.zenMode) {
        return;
      }

      set({
        zenMode: false,
        sidebarCollapsed:
          zenRestore?.sidebarCollapsed ?? current.sidebarCollapsed,
        panelCollapsed: zenRestore?.panelCollapsed ?? current.panelCollapsed,
      });
      zenRestore = null;
    },
    resetSidebarWidth: () => {
      set({ sidebarWidth: LAYOUT_DEFAULTS.sidebar.default });
      preferences.set(prefKey("sidebarWidth"), LAYOUT_DEFAULTS.sidebar.default);
    },
    resetPanelWidth: () => {
      set({ panelWidth: LAYOUT_DEFAULTS.panel.default });
      preferences.set(prefKey("panelWidth"), LAYOUT_DEFAULTS.panel.default);
    },
    setActiveLeftPanel: (panel) => {
      set({ activeLeftPanel: panel });
    },
    setActiveRightPanel: (panel) => {
      const current = get();
      // Auto-expand if collapsed when switching tabs
      if (current.panelCollapsed) {
        set({ activeRightPanel: panel, panelCollapsed: false });
      } else {
        set({ activeRightPanel: panel });
      }
    },
  }));
}

/**
 * Provide a layout store instance for the Workbench UI.
 */
export function LayoutStoreProvider(props: {
  store: UseLayoutStore;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <LayoutStoreContext.Provider value={props.store}>
      {props.children}
    </LayoutStoreContext.Provider>
  );
}

/**
 * Read values from the injected layout store.
 */
export function useLayoutStore<T>(selector: (state: LayoutStore) => T): T {
  const store = React.useContext(LayoutStoreContext);
  if (!store) {
    throw new Error("LayoutStoreProvider is missing");
  }
  return store(selector);
}
