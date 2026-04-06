import type { Meta, StoryObj } from "@storybook/react";

import { SettingsPage } from "./SettingsPage";

const meta: Meta<typeof SettingsPage> = {
  title: "Features/Settings",
  component: SettingsPage,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof SettingsPage>;

export const Default: Story = {
  args: {},
};

export const WithAiBridge: Story = {
  args: {},
};
