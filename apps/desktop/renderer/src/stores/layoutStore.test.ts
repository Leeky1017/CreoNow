import { describe, expect, it, vi } from "vitest";
import type { PreferenceStore } from "../lib/preferences";
import { createLayoutStore } from "./layoutStore";

function createPreferenceStoreMock(
  seed: Record<string, unknown> = {},
): PreferenceStore & { setSpy: ReturnType<typeof vi.fn> } {
  const data = new Map<string, unknown>(Object.entries(seed));
  const setSpy = vi.fn((key: string, value: unknown) => {
    data.set(key, value);
  });

  return {
    get<T>(key: string): T | null {
      if (!data.has(key)) {
        return null;
      }
      return data.get(key) as T;
    },
    set: setSpy as PreferenceStore["set"],
    remove(key: string): void {
      data.delete(key);
    },
    clear(): void {
      data.clear();
    },
    setSpy,
  } as PreferenceStore & { setSpy: ReturnType<typeof vi.fn> };
}

describe("layoutStore activeRightPanel persistence", () => {
  it("should persist activeRightPanel when switching tabs", () => {
    const preferences = createPreferenceStoreMock();
    const store = createLayoutStore(preferences);

    store.getState().setActiveRightPanel("info");

    expect(preferences.setSpy).toHaveBeenCalledWith(
      "creonow.layout.activeRightPanel",
      "info",
    );
  });

  it("should restore activeRightPanel from preferences on startup", () => {
    const preferences = createPreferenceStoreMock({
      "creonow.layout.activeRightPanel": "info",
    });
    const store = createLayoutStore(preferences);

    expect(store.getState().activeRightPanel).toBe("info");
  });

  it("should fallback to ai when persisted activeRightPanel is invalid", () => {
    const preferences = createPreferenceStoreMock({
      "creonow.layout.activeRightPanel": "broken-value",
    });
    const store = createLayoutStore(preferences);

    expect(store.getState().activeRightPanel).toBe("ai");
  });
});
