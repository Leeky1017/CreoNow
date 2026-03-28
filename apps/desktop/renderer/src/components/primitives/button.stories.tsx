import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Search } from "lucide-react";

const meta = {
  title: "Primitives/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Button" },
};

export const Ghost: Story = {
  args: { variant: "ghost", children: "Ghost Button" },
};

export const Destructive: Story = {
  args: { variant: "destructive", children: "Delete" },
};

export const Outline: Story = {
  args: { variant: "outline", children: "Outline" },
};

export const Small: Story = {
  args: { size: "sm", children: "Small" },
};

export const Large: Story = {
  args: { size: "lg", children: "Large" },
};

export const Icon: Story = {
  args: { variant: "ghost", size: "icon", children: <Search size={18} /> },
};

export const Loading: Story = {
  args: { loading: true, children: "Saving..." },
};

export const Disabled: Story = {
  args: { disabled: true, children: "Disabled" },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center">
        <Button>Default</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
      </div>
      <div className="flex gap-2 items-center">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
        <Button variant="ghost" size="icon">
          <Search size={18} />
        </Button>
      </div>
      <div className="flex gap-2 items-center">
        <Button loading>Loading...</Button>
        <Button disabled>Disabled</Button>
        <Button variant="destructive" disabled>
          Disabled Destructive
        </Button>
      </div>
    </div>
  ),
};
