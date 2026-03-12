import { describe, it, expect, beforeEach } from "vitest";

import {
  createPreferenceStore,
  type PreferenceStore,
} from "../../lib/preferences";
import { defaultGeneralSettings } from "./SettingsGeneral";
import {
  loadGeneralSettings,
  persistGeneralSetting,
} from "./settingsGeneralPersistence";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  } satisfies Storage;
}

describe("Settings General persistence", () => {
  let storage: Storage;
  let store: PreferenceStore;

  beforeEach(() => {
    storage = createMemoryStorage();
    store = createPreferenceStore(storage);
  });

  // ─── AC-3: 未持久化时使用默认值 ───

  describe("loadGeneralSettings — 无持久化数据", () => {
    it("返回 defaultGeneralSettings", () => {
      const settings = loadGeneralSettings(store);
      expect(settings).toEqual(defaultGeneralSettings);
    });
  });

  // ─── AC-3: 已持久化值回读 ───

  describe("loadGeneralSettings — 已有持久化数据", () => {
    it("读取持久化的布尔值", () => {
      store.set("creonow.settings.focusMode" as never, false);
      store.set("creonow.settings.typewriterScroll" as never, true);
      const settings = loadGeneralSettings(store);
      expect(settings.focusMode).toBe(false);
      expect(settings.typewriterScroll).toBe(true);
    });

    it("读取持久化的字符串值", () => {
      store.set("creonow.settings.backupInterval" as never, "1hour");
      store.set("creonow.settings.defaultTypography" as never, "merriweather");
      const settings = loadGeneralSettings(store);
      expect(settings.backupInterval).toBe("1hour");
      expect(settings.defaultTypography).toBe("merriweather");
    });

    it("读取持久化的数值", () => {
      store.set("creonow.settings.interfaceScale" as never, 120);
      const settings = loadGeneralSettings(store);
      expect(settings.interfaceScale).toBe(120);
    });

    it("读取持久化的语言值", () => {
      store.set("creonow.settings.language" as never, "en");
      const settings = loadGeneralSettings(store);
      expect(settings.language).toBe("en");
    });

    it("部分持久化 + 部分缺失 → 混合", () => {
      store.set("creonow.settings.focusMode" as never, false);
      // 不设置其他键
      const settings = loadGeneralSettings(store);
      expect(settings.focusMode).toBe(false);
      expect(settings.typewriterScroll).toBe(false); // default
      expect(settings.smartPunctuation).toBe(true); // default
    });
  });

  // ─── AC-4: 写入即时同步 ───

  describe("persistGeneralSetting — 即时写入", () => {
    it("布尔值写入后可读回", () => {
      persistGeneralSetting(store, "focusMode", false);
      expect(store.get("creonow.settings.focusMode" as never)).toBe(false);
    });

    it("字符串值写入后可读回", () => {
      persistGeneralSetting(store, "backupInterval", "15min");
      expect(store.get("creonow.settings.backupInterval" as never)).toBe("15min");
    });

    it("数值写入后可读回", () => {
      persistGeneralSetting(store, "interfaceScale", 90);
      expect(store.get("creonow.settings.interfaceScale" as never)).toBe(90);
    });

    it("语言写入后可读回", () => {
      persistGeneralSetting(store, "language", "en");
      expect(store.get("creonow.settings.language" as never)).toBe("en");
    });
  });

  // ─── AC-5: 关闭后重新打开保持值 ───

  describe("roundtrip — 写入 → 新 store 实例读取", () => {
    it("全部设置 roundtrip 成功", () => {
      persistGeneralSetting(store, "focusMode", false);
      persistGeneralSetting(store, "typewriterScroll", true);
      persistGeneralSetting(store, "smartPunctuation", false);
      persistGeneralSetting(store, "localAutoSave", false);
      persistGeneralSetting(store, "backupInterval", "1hour");
      persistGeneralSetting(store, "defaultTypography", "jetbrains");
      persistGeneralSetting(store, "interfaceScale", 80);
      persistGeneralSetting(store, "language", "en");

      // 模拟重新打开：用同一 storage 创建新 store
      const store2 = createPreferenceStore(storage);
      const loaded = loadGeneralSettings(store2);

      expect(loaded).toEqual({
        focusMode: false,
        typewriterScroll: true,
        smartPunctuation: false,
        localAutoSave: false,
        backupInterval: "1hour",
        defaultTypography: "jetbrains",
        interfaceScale: 80,
        language: "en",
      });
    });
  });

  // ─── AC-7: 损坏 JSON 回退到默认值 ───

  describe("loadGeneralSettings — 损坏数据", () => {
    it("损坏的 JSON 回退到默认值", () => {
      // 直接向 storage 写入非法 JSON
      storage.setItem("creonow.settings.focusMode", "NOT_VALID_JSON{{{");
      const settings = loadGeneralSettings(store);
      // PreferenceStore 自动处理损坏值（removeItem + return null）
      expect(settings.focusMode).toBe(defaultGeneralSettings.focusMode);
    });
  });

  // ─── AC-1: PreferenceKey 包含 settings 键 ───

  describe("PreferenceKey — settings 键可用", () => {
    it("set/get creonow.settings.focusMode 成功", () => {
      store.set("creonow.settings.focusMode" as never, true);
      expect(store.get("creonow.settings.focusMode" as never)).toBe(true);
    });

    it("set/get creonow.settings.language 成功", () => {
      store.set("creonow.settings.language" as never, "zh-CN");
      expect(store.get("creonow.settings.language" as never)).toBe("zh-CN");
    });
  });
});
