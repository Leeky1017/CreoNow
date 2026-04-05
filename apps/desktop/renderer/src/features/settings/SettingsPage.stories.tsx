import type { Meta, StoryObj } from "@storybook/react";

import { SettingsPage } from "./SettingsPage";
import { mockSettings } from "./mockData";

const meta: Meta<typeof SettingsPage> = {
  title: "Features/Settings",
  component: SettingsPage,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof SettingsPage>;

export const Default: Story = {
  args: {
    settings: mockSettings,
  },
};

export const DarkTheme: Story = {
  args: {
    settings: { ...mockSettings, theme: "dark" },
  },
};
