/**
 * Language preference persistence — localStorage-only, no i18n dependency.
 *
 * Reads/writes the unified PreferenceStore key `creonow.settings.language`
 * so that i18n init, onboarding, and Settings General all share one source.
 * Values are JSON-serialized to match PreferenceStore conventions.
 */

const STORAGE_KEY = "creonow.settings.language";
const DEFAULT_LANGUAGE = "zh-CN";

/**
 * Read the persisted language preference from localStorage.
 * Falls back to `"zh-CN"` when absent, corrupted, or localStorage
 * is unavailable.
 */
export function getLanguagePreference(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return DEFAULT_LANGUAGE;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === "en" || parsed === "zh-CN") {
      return parsed;
    }
    return DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/**
 * Persist the language choice to localStorage.
 * Silently fails when localStorage is unavailable.
 */
export function setLanguagePreference(lng: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lng));
  } catch {
    // localStorage may be unavailable in some environments
  }
}
