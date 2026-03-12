import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createPreferenceStore } from "../../lib/preferences";
import type { PreferenceStore } from "../../lib/preferences";
import { PreferencesProvider } from "../../contexts/PreferencesContext";
import { AppToastProvider } from "../../components/providers/AppToastProvider";
import { SettingsDialog } from "./SettingsDialog";

vi.mock("./SettingsAccount", () => ({
  SettingsAccount: () => <div data-testid="mock-account-section">Account</div>,
  defaultAccountSettings: {
    name: "Test User",
    email: "test@example.com",
    plan: "free",
  },
}));

vi.mock("../settings/AppearanceSection", () => ({
  AppearanceSection: () => (
    <div data-testid="mock-appearance-section">Appearance</div>
  ),
}));

vi.mock("../settings/AiSettingsSection", () => ({
  AiSettingsSection: () => (
    <div data-testid="mock-ai-settings-section">AI Settings</div>
  ),
}));

vi.mock("../settings/JudgeSection", () => ({
  JudgeSection: () => <div data-testid="mock-judge-section">Judge</div>,
}));

vi.mock("../analytics/AnalyticsPage", () => ({
  AnalyticsPageContent: () => (
    <div data-testid="mock-analytics-content">Analytics</div>
  ),
}));

vi.mock("../../i18n/languagePreference", () => ({
  getLanguagePreference: vi.fn(() => "zh-CN"),
  setLanguagePreference: vi.fn(),
}));

vi.mock("../../i18n", () => ({
  i18n: { changeLanguage: vi.fn(() => Promise.resolve()) },
}));

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

function renderWithProviders(ui: JSX.Element, preferences: PreferenceStore) {
  return render(
    <PreferencesProvider value={preferences}>
      <AppToastProvider>{ui}</AppToastProvider>
    </PreferencesProvider>,
  );
}

describe("SettingsDialog — persistence via PreferenceStore", () => {
  it("A0-14-PERSIST-01 toggle writes to PreferenceStore", async () => {
    const user = userEvent.setup();
    const storage = createMockStorage();
    const preferences = createPreferenceStore(storage);

    renderWithProviders(
      <SettingsDialog open={true} onOpenChange={vi.fn()} />,
      preferences,
    );

    // Focus Mode is ON by default, toggle it off
    const focusModeToggle = screen.getByRole("switch", {
      name: /focus mode/i,
    });
    await user.click(focusModeToggle);

    expect(preferences.get<boolean>("creonow.settings.focusMode")).toBe(false);
  });

  it("A0-14-PERSIST-02 reads stored values on open instead of defaults", () => {
    const storage = createMockStorage();
    const preferences = createPreferenceStore(storage);

    // Pre-set non-default values
    preferences.set("creonow.settings.focusMode", false);
    preferences.set("creonow.settings.typewriterScroll", true);

    renderWithProviders(
      <SettingsDialog open={true} onOpenChange={vi.fn()} />,
      preferences,
    );

    // Focus Mode should be off (non-default)
    const focusModeToggle = screen.getByRole("switch", {
      name: /focus mode/i,
    });
    expect(focusModeToggle).not.toBeChecked();

    // Typewriter Scroll should be on (non-default)
    const typewriterToggle = screen.getByRole("switch", {
      name: /typewriter scroll/i,
    });
    expect(typewriterToggle).toBeChecked();
  });

  it("A0-14-DEFAULT-02 shows defaults when no stored values exist", () => {
    const storage = createMockStorage();
    const preferences = createPreferenceStore(storage);

    renderWithProviders(
      <SettingsDialog open={true} onOpenChange={vi.fn()} />,
      preferences,
    );

    // defaults: focusMode=true, typewriterScroll=false
    const focusModeToggle = screen.getByRole("switch", {
      name: /focus mode/i,
    });
    expect(focusModeToggle).toBeChecked();

    const typewriterToggle = screen.getByRole("switch", {
      name: /typewriter scroll/i,
    });
    expect(typewriterToggle).not.toBeChecked();
  });

  it("A0-14-CORRUPT-02 shows defaults when stored values are corrupt", () => {
    const storage = createMockStorage();
    const preferences = createPreferenceStore(storage);

    // Inject corrupt data directly
    storage.setItem("creonow.settings.focusMode", "{bad-json");
    storage.setItem("creonow.settings.typewriterScroll", "not-a-bool");

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithProviders(
      <SettingsDialog open={true} onOpenChange={vi.fn()} />,
      preferences,
    );

    // Should fall back to defaults without crashing
    const focusModeToggle = screen.getByRole("switch", {
      name: /focus mode/i,
    });
    expect(focusModeToggle).toBeChecked(); // default is true

    errorSpy.mockRestore();
  });
});
