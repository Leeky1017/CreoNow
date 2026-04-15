import type { Meta, StoryObj } from "@storybook/react";

import { SettingsModal } from "./SettingsModal";

const meta: Meta<typeof SettingsModal> = {
  title: "Features/Settings/SettingsModal",
  component: SettingsModal,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof SettingsModal>;

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
  },
};
