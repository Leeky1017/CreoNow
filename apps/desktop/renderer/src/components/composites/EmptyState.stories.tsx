import type { Meta, StoryObj } from "@storybook/react";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/primitives/Button";

import { EmptyState } from "./EmptyState";

const meta: Meta<typeof EmptyState> = {
  title: "Composites/EmptyState",
  component: EmptyState,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    icon: <Sparkles size={24} />,
    title: "还没有内容",
    description: "纸上得来终觉浅，绝知此事要躬行。",
  },
};

export const WithAction: Story = {
  args: {
    icon: <Sparkles size={24} />,
    title: "开始你的第一个项目",
    description: "创建一个新项目来开始写作。",
    action: <Button tone="primary">新建项目</Button>,
  },
};
