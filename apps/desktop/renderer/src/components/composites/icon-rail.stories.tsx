import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconRail } from "./icon-rail";

const meta: Meta<typeof IconRail> = {
  title: "Composites/IconRail",
  component: IconRail,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className="h-screen">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IconRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { activeItem: "files", onItemSelect: () => {} },
};

export const DashboardActive: Story = {
  args: { activeItem: "dashboard", onItemSelect: () => {} },
};

export const SettingsActive: Story = {
  args: { activeItem: "settings", onItemSelect: () => {} },
};
