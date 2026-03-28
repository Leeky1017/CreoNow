import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayoutState {
  sidebarVisible: boolean;
  panelWidths: Record<string, number>;
  isZenMode: boolean;
  isFocusMode: boolean;
  toggleSidebar: () => void;
  setPanelWidth: (panel: string, width: number) => void;
  toggleZenMode: () => void;
  toggleFocusMode: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarVisible: true,
      panelWidths: {},
      isZenMode: false,
      isFocusMode: false,
      toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
      setPanelWidth: (panel, width) =>
        set((s) => ({ panelWidths: { ...s.panelWidths, [panel]: width } })),
      toggleZenMode: () => set((s) => ({ isZenMode: !s.isZenMode })),
      toggleFocusMode: () => set((s) => ({ isFocusMode: !s.isFocusMode })),
    }),
    { name: 'cn-layout' }
  )
);
