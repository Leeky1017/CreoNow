import React from "react";
import { create } from "zustand";

import type { PreferenceStore, PreferenceKey } from "../lib/preferences";

const APP_ID = "creonow" as const;

/**
 * Preference key for onboarding completion status.
 *
 * Note: We use a type assertion here because the PreferenceKey type
 * is defined with a limited set of keys. The onboarding key follows
 * the same pattern but needs to be added explicitly.
 */
const ONBOARDING_KEY = `${APP_ID}.onboarding.completed` as PreferenceKey;

export type OnboardingState = {
  /** Whether the user has completed or skipped onboarding */
  completed: boolean;
  /** Status of store initialization */
  status: "idle" | "ready";
};

export type OnboardingActions = {
  /**
   * Mark onboarding as completed.
   *
   * Persists the completion status to preferences.
   */
  complete: () => void;
  /**
   * Reset onboarding status.
   *
   * Useful for testing or when user wants to see onboarding again.
   */
  reset: () => void;
};

export type OnboardingStore = OnboardingState & OnboardingActions;

export type UseOnboardingStore = ReturnType<typeof createOnboardingStore>;

const OnboardingStoreContext = React.createContext<UseOnboardingStore | null>(
  null,
);

/**
 * Create a zustand store for onboarding state.
 *
 * Why: Track whether the user has completed onboarding to determine
 * the initial screen to show (onboarding vs welcome/dashboard).
 */
export function createOnboardingStore(preferences: PreferenceStore) {
  const initialCompleted = preferences.get<boolean>(ONBOARDING_KEY) ?? false;

  return create<OnboardingStore>((set) => ({
    completed: initialCompleted,
    status: "ready",

    complete: () => {
      set({ completed: true });
      preferences.set(ONBOARDING_KEY, true);
    },

    reset: () => {
      set({ completed: false });
      preferences.remove(ONBOARDING_KEY);
    },
  }));
}

/**
 * Provide an onboarding store instance.
 */
export function OnboardingStoreProvider(props: {
  store: UseOnboardingStore;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <OnboardingStoreContext.Provider value={props.store}>
      {props.children}
    </OnboardingStoreContext.Provider>
  );
}

/**
 * Read values from the injected onboarding store.
 */
export function useOnboardingStore<T>(
  selector: (state: OnboardingStore) => T,
): T {
  const store = React.useContext(OnboardingStoreContext);
  if (!store) {
    throw new Error("OnboardingStoreProvider is missing");
  }
  return store(selector);
}
