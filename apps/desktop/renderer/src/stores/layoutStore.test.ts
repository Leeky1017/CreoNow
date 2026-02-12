import { describe, expect, it } from "vitest";

import type { PreferenceKey, PreferenceStore } from "../lib/preferences";
import { createLayoutStore, LAYOUT_DEFAULTS } from "./layoutStore";

/**
 * Build an in-memory preference store stub for deterministic layout tests.
 */
function createPreferenceStub(
  initial: Partial<Record<PreferenceKey, unknown>>,
) {
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

  return {
    preferences,
    setCalls,
    values,
  };
}

describe("layoutStore persistence", () => {
  it("should restore sidebarCollapsed and sidebarWidth when persisted layout preferences exist", () => {
    const { preferences } = createPreferenceStub({
      "creonow.layout.sidebarCollapsed": true,
      "creonow.layout.sidebarWidth": 312,
    });

    const store = createLayoutStore(preferences);
    const state = store.getState();

    expect(state.sidebarCollapsed).toBe(true);
    expect(state.sidebarWidth).toBe(312);
  });

  it("should persist sidebarCollapsed key when collapsing sidebar", () => {
    const { preferences, setCalls } = createPreferenceStub({});
    const store = createLayoutStore(preferences);

    store.getState().setSidebarCollapsed(true);

    expect(setCalls).toContainEqual(["creonow.layout.sidebarCollapsed", true]);
    expect(store.getState().sidebarCollapsed).toBe(true);
  });

  it("should persist sidebarWidth key when sidebar width is updated", () => {
    const { preferences, setCalls, values } = createPreferenceStub({});
    const store = createLayoutStore(preferences);

    store.getState().setSidebarWidth(280);

    expect(setCalls).toContainEqual(["creonow.layout.sidebarWidth", 280]);
    expect(values.get("creonow.layout.sidebarWidth")).toBe(280);
  });

  it("should fallback to default sidebar width when persisted width is missing", () => {
    const { preferences } = createPreferenceStub({});
    const store = createLayoutStore(preferences);

    expect(store.getState().sidebarWidth).toBe(LAYOUT_DEFAULTS.sidebar.default);
  });
});
