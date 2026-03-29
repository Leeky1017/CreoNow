import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type LeftPanel = 'files' | 'search' | 'outline';
type RightPanel = 'ai' | 'info' | 'quality';

interface LayoutState {
  sidebarVisible: boolean;
  panelWidths: Record<string, number>;
  isZenMode: boolean;
  isFocusMode: boolean;
  activeLeftPanel: LeftPanel;
  activeRightPanel: RightPanel;
  rightPanelVisible: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  statusBarVisible: boolean;
  toggleSidebar: () => void;
  setPanelWidth: (panel: string, width: number) => void;
  toggleZenMode: () => void;
  toggleFocusMode: () => void;
  setActiveLeftPanel: (panel: LeftPanel) => void;
  setActiveRightPanel: (panel: RightPanel) => void;
  toggleRightPanel: () => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  toggleStatusBar: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarVisible: true,
      panelWidths: {},
      isZenMode: false,
      isFocusMode: false,
      activeLeftPanel: 'files',
      activeRightPanel: 'ai',
      rightPanelVisible: false,
      leftPanelWidth: 260,
      rightPanelWidth: 320,
      statusBarVisible: true,
      toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
      setPanelWidth: (panel, width) =>
        set((s) => ({ panelWidths: { ...s.panelWidths, [panel]: width } })),
      toggleZenMode: () => set((s) => ({ isZenMode: !s.isZenMode })),
      toggleFocusMode: () => set((s) => ({ isFocusMode: !s.isFocusMode })),
      setActiveLeftPanel: (panel) => set({ activeLeftPanel: panel }),
      setActiveRightPanel: (panel) => set({ activeRightPanel: panel }),
      toggleRightPanel: () => set((s) => ({ rightPanelVisible: !s.rightPanelVisible })),
      setLeftPanelWidth: (width) => set({ leftPanelWidth: width }),
      setRightPanelWidth: (width) => set({ rightPanelWidth: width }),
      toggleStatusBar: () => set((s) => ({ statusBarVisible: !s.statusBarVisible })),
    }),
    { name: 'cn-layout' }
  )
);
