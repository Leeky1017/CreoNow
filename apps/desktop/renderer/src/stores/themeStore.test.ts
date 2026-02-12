import { describe, expect, it } from "vitest";

import type { PreferenceKey, PreferenceStore } from "../lib/preferences";
import { createThemeStore } from "./themeStore";

function createPreferenceStub(
  initial: Partial<Record<PreferenceKey, unknown>>,
): {
  preferences: PreferenceStore;
  setCalls: Array<[PreferenceKey, unknown]>;
  values: Map<PreferenceKey, unknown>;
} {
  const values = new Map<PreferenceKey, unknown>();
  const setCalls: Array<[PreferenceKey, unknown]> = [];

  for (const [key, value] of Object.entries(initial)) {
    values.set(key as PreferenceKey, value);
  }

  const preferences: PreferenceStore = {
    get: <T>(key: PreferenceKey) =>
      values.has(key) ? (values.get(key) as T) : null,
    set: <T>(key: PreferenceKey, value: T) => {
      setCalls.push([key, value as unknown]);
      values.set(key, value);
    },
    remove: (key: PreferenceKey) => {
      values.delete(key);
    },
    clear: () => {
      values.clear();
    },
  };

  return { preferences, setCalls, values };
}

describe("themeStore zod validation and write-back", () => {
  it("should fallback to system when persisted mode is invalid", () => {
    const { preferences, setCalls } = createPreferenceStub({
      "creonow.theme.mode": "neon",
    });
    const store = createThemeStore(preferences);

    expect(store.getState().mode).toBe("system");
    expect(setCalls).toContainEqual(["creonow.theme.mode", "system"]);
  });

  it("should fallback to system when persisted mode is a number", () => {
    const { preferences } = createPreferenceStub({
      "creonow.theme.mode": 42,
    });
    const store = createThemeStore(preferences);

    expect(store.getState().mode).toBe("system");
  });

  it("should accept valid dark mode", () => {
    const { preferences, setCalls } = createPreferenceStub({
      "creonow.theme.mode": "dark",
    });
    const store = createThemeStore(preferences);

    expect(store.getState().mode).toBe("dark");
    const correctionCall = setCalls.find(
      ([key]) => key === "creonow.theme.mode",
    );
    expect(correctionCall).toBeUndefined();
  });

  it("should accept valid light mode", () => {
    const { preferences } = createPreferenceStub({
      "creonow.theme.mode": "light",
    });
    const store = createThemeStore(preferences);

    expect(store.getState().mode).toBe("light");
  });

  it("should accept valid system mode", () => {
    const { preferences } = createPreferenceStub({
      "creonow.theme.mode": "system",
    });
    const store = createThemeStore(preferences);

    expect(store.getState().mode).toBe("system");
  });

  it("should reject invalid mode via setMode and not update state", () => {
    const { preferences } = createPreferenceStub({});
    const store = createThemeStore(preferences);

    store.getState().setMode("neon" as "dark");

    expect(store.getState().mode).toBe("system");
  });

  it("should write corrected value to preferences when stored mode is invalid", () => {
    const { preferences, setCalls } = createPreferenceStub({
      "creonow.theme.mode": "neon",
    });
    createThemeStore(preferences);

    expect(setCalls).toContainEqual(["creonow.theme.mode", "system"]);
  });
});
