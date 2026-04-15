import type { Meta, StoryObj } from "@storybook/react";

import { CalendarPanel } from "./CalendarPanel";

const meta: Meta<typeof CalendarPanel> = {
  title: "Workbench/CalendarPanel",
  component: CalendarPanel,
  args: {
    status: "ready",
    errorMessage: null,
    onRetry: () => undefined,
    milestones: [
      {
        id: "milestone-1",
        dateLabel: "本周",
        title: "主线章节初稿锁定",
        description: "集中完成关键章节并进入自审。",
        status: "active",
      },
      {
        id: "milestone-2",
        dateLabel: "下周",
        title: "角色冲突弧校准",
        description: "逐段比对角色目标与行为一致性。",
        status: "upcoming",
      },
    ],
    events: [
      { id: "event-1", day: 9, title: "第一章修订", type: "fiction" },
      { id: "event-2", day: 9, title: "对白节奏调整", type: "script" },
      { id: "event-3", day: 16, title: "发布稿标题迭代", type: "media" },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof CalendarPanel>;

export const Ready: Story = {};

export const Loading: Story = {
  args: {
    status: "loading",
  },
};

export const ErrorState: Story = {
  args: {
    status: "error",
    errorMessage: "calendar service unavailable",
  },
};

export const Empty: Story = {
  args: {
    milestones: [],
    events: [],
  },
};
