import type { PreferenceStore, PreferenceKey } from "../../lib/preferences";
import { defaultGeneralSettings, type GeneralSettings } from "./SettingsGeneral";

type SettingsKeyName =
  | "focusMode"
  | "typewriterScroll"
  | "smartPunctuation"
  | "localAutoSave"
  | "backupInterval"
  | "defaultTypography"
  | "interfaceScale"
  | "language";

function prefKey(name: SettingsKeyName): PreferenceKey {
  return `creonow.settings.${name}` as PreferenceKey;
}

/**
 * 从 PreferenceStore 加载 General 设置；缺失键回退到 defaultGeneralSettings。
 */
export function loadGeneralSettings(store: PreferenceStore): GeneralSettings {
  return {
    focusMode: store.get<boolean>(prefKey("focusMode")) ?? defaultGeneralSettings.focusMode,
    typewriterScroll: store.get<boolean>(prefKey("typewriterScroll")) ?? defaultGeneralSettings.typewriterScroll,
    smartPunctuation: store.get<boolean>(prefKey("smartPunctuation")) ?? defaultGeneralSettings.smartPunctuation,
    localAutoSave: store.get<boolean>(prefKey("localAutoSave")) ?? defaultGeneralSettings.localAutoSave,
    backupInterval: store.get<string>(prefKey("backupInterval")) ?? defaultGeneralSettings.backupInterval,
    defaultTypography: store.get<string>(prefKey("defaultTypography")) ?? defaultGeneralSettings.defaultTypography,
    interfaceScale: store.get<number>(prefKey("interfaceScale")) ?? defaultGeneralSettings.interfaceScale,
    language: store.get<string>(prefKey("language")) ?? defaultGeneralSettings.language,
  };
}

/**
 * 持久化单个 General 设置项。
 */
export function persistGeneralSetting<K extends keyof GeneralSettings>(
  store: PreferenceStore,
  key: K,
  value: GeneralSettings[K],
): void {
  store.set(prefKey(key as SettingsKeyName), value);
}
