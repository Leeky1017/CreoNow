import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconButton } from "./icon-button";
import { Search, Settings, Folder } from "lucide-react";

const meta = {
  title: "Primitives/IconButton",
  component: IconButton,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "sidebar",
      values: [{ name: "sidebar", value: "#000000" }],
    },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { icon: <Search size={18} />, label: "Search" },
};

export const Selected: Story = {
  args: { icon: <Folder size={18} />, label: "Files", selected: true },
};

export const Loading: Story = {
  args: { icon: <Settings size={18} />, label: "Settings", loading: true },
};

export const Disabled: Story = {
  args: { icon: <Search size={18} />, label: "Search", disabled: true },
};

export const AllStates: Story = {
  args: { icon: <Search size={18} />, label: "All States" },
  render: () => (
    <div className="flex flex-col gap-1.5 p-2">
      <IconButton icon={<Search size={18} />} label="Default" />
      <IconButton icon={<Folder size={18} />} label="Selected" selected />
      <IconButton icon={<Settings size={18} />} label="Loading" loading />
      <IconButton icon={<Search size={18} />} label="Disabled" disabled />
    </div>
  ),
};
