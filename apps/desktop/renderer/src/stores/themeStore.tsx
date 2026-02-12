import React from "react";
import { create } from "zustand";
import { z } from "zod";

import type { PreferenceStore } from "../lib/preferences";

const APP_ID = "creonow" as const;

export type ThemeMode = "dark" | "light" | "system";

export type ThemeState = {
  mode: ThemeMode;
};

export type ThemeActions = {
  setMode: (mode: ThemeMode) => void;
};

export type ThemeStore = ThemeState & ThemeActions;

export type UseThemeStore = ReturnType<typeof createThemeStore>;

const ThemeStoreContext = React.createContext<UseThemeStore | null>(null);

/**
 * Build a strongly-typed preference key for theme settings.
 */
function prefKey(name: "mode"): `${typeof APP_ID}.theme.${typeof name}` {
  return `${APP_ID}.theme.${name}` as const;
}

const themeModeSchema = z.enum(["dark", "light", "system"]);

/**
 * Create a zustand store for theme mode.
 *
 * Why: theme must be persistent and applied synchronously to avoid FOUC and to
 * keep Windows E2E deterministic.
 */
export function createThemeStore(preferences: PreferenceStore) {
  const stored = preferences.get<unknown>(prefKey("mode"));
  let initialMode: ThemeMode = "system";
  if (stored != null) {
    const result = themeModeSchema.safeParse(stored);
    if (result.success) {
      initialMode = result.data;
    } else {
      initialMode = "system";
      preferences.set(prefKey("mode"), "system");
    }
  }

  return create<ThemeStore>((set) => ({
    mode: initialMode,

    setMode: (mode) => {
      const result = themeModeSchema.safeParse(mode);
      if (!result.success) {
        return;
      }

      set({ mode: result.data });
      preferences.set(prefKey("mode"), result.data);
    },
  }));
}

/**
 * Provide a theme store instance for the Workbench UI.
 */
export function ThemeStoreProvider(props: {
  store: UseThemeStore;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <ThemeStoreContext.Provider value={props.store}>
      {props.children}
    </ThemeStoreContext.Provider>
  );
}

/**
 * Read values from the injected theme store.
 */
export function useThemeStore<T>(selector: (state: ThemeStore) => T): T {
  const store = React.useContext(ThemeStoreContext);
  if (!store) {
    throw new Error("ThemeStoreProvider is missing");
  }
  return store(selector);
}
