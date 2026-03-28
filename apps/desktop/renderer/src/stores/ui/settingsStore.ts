import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  autoSave: boolean;
  aiTemperature: number;
  updateSetting: <K extends keyof Omit<SettingsState, 'updateSetting'>>(
    key: K,
    value: SettingsState[K],
  ) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontSize: 16,
      fontFamily: 'Source Serif 4',
      lineHeight: 1.6,
      autoSave: true,
      aiTemperature: 0.7,
      updateSetting: (key, value) => set({ [key]: value }),
    }),
    { name: 'cn-settings' },
  ),
);
