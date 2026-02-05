import type { Meta, StoryObj } from "@storybook/react";

import { createPreferenceStore } from "../../lib/preferences";
import { createThemeStore, ThemeStoreProvider } from "../../stores/themeStore";
import { SettingsDialog } from "./SettingsDialog";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  } satisfies Storage;
}

const preferences = createPreferenceStore(createMemoryStorage());
const themeStore = createThemeStore(preferences);

const meta: Meta<typeof SettingsDialog> = {
  title: "Features/SettingsDialog",
  component: SettingsDialog,
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "dark",
    },
  },
  argTypes: {
    open: { control: "boolean" },
    onOpenChange: { action: "openChange" },
    defaultTab: {
      control: "select",
      options: ["appearance", "proxy", "judge", "analytics"],
    },
  },
  decorators: [
    (Story) => {
      return (
        <ThemeStoreProvider store={themeStore}>
          <div
            className="w-full h-screen bg-[var(--color-bg-base)]"
            data-theme="dark"
          >
            <Story />
          </div>
        </ThemeStoreProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof SettingsDialog>;

export const Appearance: Story = {
  args: { open: true, defaultTab: "appearance" },
};

export const Proxy: Story = {
  args: { open: true, defaultTab: "proxy" },
};

export const Judge: Story = {
  args: { open: true, defaultTab: "judge" },
};

export const Analytics: Story = {
  args: { open: true, defaultTab: "analytics" },
};
