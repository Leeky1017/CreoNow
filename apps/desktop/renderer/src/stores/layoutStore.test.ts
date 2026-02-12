import { describe, expect, it, vi } from "vitest";

import type { PreferenceKey, PreferenceStore } from "../lib/preferences";
import { createLayoutStore, LAYOUT_DEFAULTS } from "./layoutStore";

/**
 * Build an in-memory preference store stub for deterministic layout tests.
 */
function createPreferenceStub(initial: Partial<Record<PreferenceKey, unknown>>) {
  const values = new Map<PreferenceKey, unknown>();
  for (const [key, value] of Object.entries(initial)) {
    values.set(key as PreferenceKey, value);
  }

  const preferences: PreferenceStore = {
    get: vi.fn(<T,>(key: PreferenceKey) =>
      values.has(key) ? (values.get(key) as T) : null,
    ),
    set: vi.fn(<T,>(key: PreferenceKey, value: T) => {
      values.set(key, value);
    }),
    remove: vi.fn((key: PreferenceKey) => {
      values.delete(key);
    }),
    clear: vi.fn(() => {
      values.clear();
    }),
  };

  return {
    preferences,
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
    const { preferences } = createPreferenceStub({});
    const store = createLayoutStore(preferences);

    store.getState().setSidebarCollapsed(true);

    expect(preferences.set).toHaveBeenCalledWith(
      "creonow.layout.sidebarCollapsed",
      true,
    );
    expect(store.getState().sidebarCollapsed).toBe(true);
  });

  it("should persist sidebarWidth key when sidebar width is updated", () => {
    const { preferences, values } = createPreferenceStub({});
    const store = createLayoutStore(preferences);

    store.getState().setSidebarWidth(280);

    expect(preferences.set).toHaveBeenCalledWith("creonow.layout.sidebarWidth", 280);
    expect(values.get("creonow.layout.sidebarWidth")).toBe(280);
  });

  it("should fallback to default sidebar width when persisted width is missing", () => {
    const { preferences } = createPreferenceStub({});
    const store = createLayoutStore(preferences);

    expect(store.getState().sidebarWidth).toBe(LAYOUT_DEFAULTS.sidebar.default);
  });
});
