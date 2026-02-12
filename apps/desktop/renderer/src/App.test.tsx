import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import React from "react";

import { createThemeStore, type ThemeMode } from "./stores/themeStore";
import type { PreferenceKey, PreferenceStore } from "./lib/preferences";

/**
 * Minimal preference stub for theme tests.
 */
function createPreferenceStub(
  initial: Partial<Record<PreferenceKey, unknown>> = {},
): PreferenceStore {
  const values = new Map<PreferenceKey, unknown>();
  for (const [key, value] of Object.entries(initial)) {
    values.set(key as PreferenceKey, value);
  }
  return {
    get: <T,>(key: PreferenceKey) =>
      values.has(key) ? (values.get(key) as T) : null,
    set: <T,>(key: PreferenceKey, value: T) => {
      values.set(key, value);
    },
    remove: (key: PreferenceKey) => {
      values.delete(key);
    },
    clear: () => {
      values.clear();
    },
  };
}

/**
 * Mock matchMedia that allows programmatic "change" event dispatch.
 */
function createMockMatchMedia(initialDark: boolean) {
  let matches = initialDark;
  const listeners: Array<(e: { matches: boolean }) => void> = [];

  const mql = {
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    addEventListener: (
      _event: string,
      fn: (e: { matches: boolean }) => void,
    ) => {
      listeners.push(fn);
    },
    removeEventListener: (
      _event: string,
      fn: (e: { matches: boolean }) => void,
    ) => {
      const idx = listeners.indexOf(fn);
      if (idx >= 0) listeners.splice(idx, 1);
    },
    dispatchChange: (dark: boolean) => {
      matches = dark;
      for (const fn of listeners) {
        fn({ matches: dark });
      }
    },
    listenerCount: () => listeners.length,
  };

  return mql;
}

/**
 * Isolated component that replicates App.tsx matchMedia wiring for testability.
 *
 * Why: App.tsx bootstraps 12+ stores with IPC mocks which is impractical to
 * fully mock in a unit test. Instead we extract the exact matchMedia logic
 * from App.tsx and test it in isolation.
 */
function ThemeSystemFollower(props: {
  themeStore: ReturnType<typeof createThemeStore>;
}): JSX.Element {
  const { themeStore } = props;

  React.useLayoutEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");

    function resolve(mode: ThemeMode): "dark" | "light" {
      if (mode === "system") {
        return system.matches ? "dark" : "light";
      }
      return mode;
    }

    function apply(mode: ThemeMode): void {
      document.documentElement.setAttribute("data-theme", resolve(mode));
    }

    function onSystemChange(): void {
      if (themeStore.getState().mode === "system") {
        apply("system");
      }
    }

    apply(themeStore.getState().mode);
    const unsubscribe = themeStore.subscribe((state) => apply(state.mode));
    system.addEventListener("change", onSystemChange);

    return () => {
      unsubscribe();
      system.removeEventListener("change", onSystemChange);
    };
  }, [themeStore]);

  return <div data-testid="theme-follower" />;
}

describe("Theme system follow (matchMedia)", () => {
  let originalMatchMedia: typeof window.matchMedia;
  let mockMql: ReturnType<typeof createMockMatchMedia>;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    mockMql = createMockMatchMedia(true);
    window.matchMedia = vi.fn().mockReturnValue(mockMql);
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.documentElement.removeAttribute("data-theme");
  });

  it("should set data-theme=dark when mode is system and OS is dark", () => {
    const prefs = createPreferenceStub({ "creonow.theme.mode": "system" });
    const store = createThemeStore(prefs);

    render(<ThemeSystemFollower themeStore={store} />);

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("should set data-theme=light when mode is system and OS is light", () => {
    mockMql = createMockMatchMedia(false);
    window.matchMedia = vi.fn().mockReturnValue(mockMql);

    const prefs = createPreferenceStub({ "creonow.theme.mode": "system" });
    const store = createThemeStore(prefs);

    render(<ThemeSystemFollower themeStore={store} />);

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("should auto-follow when OS switches from dark to light in system mode", () => {
    const prefs = createPreferenceStub({ "creonow.theme.mode": "system" });
    const store = createThemeStore(prefs);

    render(<ThemeSystemFollower themeStore={store} />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    act(() => {
      mockMql.dispatchChange(false);
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("should auto-follow when OS switches from light to dark in system mode", () => {
    mockMql = createMockMatchMedia(false);
    window.matchMedia = vi.fn().mockReturnValue(mockMql);

    const prefs = createPreferenceStub({ "creonow.theme.mode": "system" });
    const store = createThemeStore(prefs);

    render(<ThemeSystemFollower themeStore={store} />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    act(() => {
      mockMql.dispatchChange(true);
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("should NOT follow OS change when mode is explicitly dark", () => {
    const prefs = createPreferenceStub({ "creonow.theme.mode": "dark" });
    const store = createThemeStore(prefs);

    render(<ThemeSystemFollower themeStore={store} />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    act(() => {
      mockMql.dispatchChange(false);
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("should NOT follow OS change when mode is explicitly light", () => {
    mockMql = createMockMatchMedia(true);
    window.matchMedia = vi.fn().mockReturnValue(mockMql);

    const prefs = createPreferenceStub({ "creonow.theme.mode": "light" });
    const store = createThemeStore(prefs);

    render(<ThemeSystemFollower themeStore={store} />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    act(() => {
      mockMql.dispatchChange(false);
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("should update data-theme when store mode changes from dark to system", () => {
    const prefs = createPreferenceStub({ "creonow.theme.mode": "dark" });
    const store = createThemeStore(prefs);

    render(<ThemeSystemFollower themeStore={store} />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    act(() => {
      store.getState().setMode("system");
    });

    // OS is dark (mockMql default), so system resolves to dark
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("should remove matchMedia listener on unmount", () => {
    const prefs = createPreferenceStub({ "creonow.theme.mode": "system" });
    const store = createThemeStore(prefs);

    const { unmount } = render(<ThemeSystemFollower themeStore={store} />);

    expect(mockMql.listenerCount()).toBe(1);

    unmount();

    expect(mockMql.listenerCount()).toBe(0);
  });
});
