import { beforeEach, describe, expect, it, vi } from "vitest";

import { createPreferenceStore } from "./preferences";

type StoreRecord = Record<string, string>;

function createMockStorage(
  seed: StoreRecord = {},
  overrides: {
    getItem?: (key: string) => string | null;
    setItem?: (key: string, value: string) => void;
    removeItem?: (key: string) => void;
  } = {},
): Storage {
  const store: StoreRecord = { ...seed };

  const defaultGetItem = (key: string) => store[key] ?? null;
  const defaultSetItem = (key: string, value: string) => {
    store[key] = value;
  };
  const defaultRemoveItem = (key: string) => {
    delete store[key];
  };

  return {
    getItem: (key: string) => (overrides.getItem ?? defaultGetItem)(key),
    setItem: (key: string, value: string) => (overrides.setItem ?? defaultSetItem)(key, value),
    removeItem: (key: string) => (overrides.removeItem ?? defaultRemoveItem)(key),
    clear: () => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe("createPreferenceStore", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("迁移写入版本失败时不应抛出异常", () => {
    const migrationError = new Error("quota exceeded");
    const storage = createMockStorage({}, {
      setItem: (key, value) => {
        if (key === "creonow.version") {
          throw migrationError;
        }
        void value;
      },
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => createPreferenceStore(storage)).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith("PreferenceStore.migrate failed", {
      error: migrationError,
    });
  });

  it("迁移时只清理 creonow 键并写入最新版本", () => {
    const storage = createMockStorage({
      "creonow.version": '"0"',
      "creonow.layout.sidebarWidth": "320",
      "other.app.key": "keep",
    });

    createPreferenceStore(storage);

    expect(storage.getItem("creonow.layout.sidebarWidth")).toBeNull();
    expect(storage.getItem("other.app.key")).toBe("keep");
    expect(storage.getItem("creonow.version")).toBe("1");
  });
});
