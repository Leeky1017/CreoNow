import type { Meta, StoryObj } from "@storybook/react";

import { Plus } from "lucide-react";

import { Button } from "@/components/primitives/Button";

import { SectionHeader } from "./SectionHeader";

const meta: Meta<typeof SectionHeader> = {
  title: "Composites/SectionHeader",
  component: SectionHeader,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof SectionHeader>;

export const Default: Story = {
  args: {
    label: "章节",
  },
};

export const WithAction: Story = {
  args: {
    label: "角色",
    action: (
      <Button tone="ghost">
        <Plus size={12} />
        添加
      </Button>
    ),
  },
};
