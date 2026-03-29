import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SettingsState {
  language: 'zh-CN' | 'en-US';
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  aiProvider: string;
  aiModel: string;
  autoSave: boolean;
  autoSaveInterval: number;
  setLanguage: (lang: 'zh-CN' | 'en-US') => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setLineHeight: (height: number) => void;
  setAiProvider: (provider: string) => void;
  setAiModel: (model: string) => void;
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'zh-CN',
      fontSize: 16,
      fontFamily: 'Inter',
      lineHeight: 1.6,
      aiProvider: '',
      aiModel: '',
      autoSave: true,
      autoSaveInterval: 5000,
      setLanguage: (language) => set({ language }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setAiProvider: (aiProvider) => set({ aiProvider }),
      setAiModel: (aiModel) => set({ aiModel }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setAutoSaveInterval: (autoSaveInterval) => set({ autoSaveInterval }),
    }),
    { name: 'cn-settings' },
  ),
);
