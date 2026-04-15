import type { Meta, StoryObj } from "@storybook/react";

import { MemoryPanel, type MemoryPanelEntry } from "./MemoryPanel";

const entries: MemoryPanelEntry[] = [
  {
    id: "mem-1",
    key: "角色设定：艾琳娜的目击者身份",
    value: "雷恩对深渊的第一感官是硫磺味，应与中层裂隙的金属冷味形成对比。",
    category: "character-setting",
    source: "system",
    createdAt: Date.now() - 86_400_000,
    updatedAt: Date.now() - 3_600_000,
  },
  {
    id: "mem-2",
    key: "写作偏好：场景描写先于对白",
    value: "作为唯一生还目击者，她的冷静掩盖了深层创伤。",
    category: "preference",
    source: "user",
    createdAt: Date.now() - 172_800_000,
    updatedAt: Date.now() - 7_200_000,
  },
];

const meta: Meta<typeof MemoryPanel> = {
  title: "Features/Workbench/MemoryPanel",
  component: MemoryPanel,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof MemoryPanel>;

export const Ready: Story = {
  args: {
    entries,
    errorMessage: null,
    onQueryChange: () => {},
    onRetry: () => {},
    query: "",
    status: "ready",
  },
};

export const Loading: Story = {
  args: {
    ...Ready.args,
    entries: [],
    status: "loading",
  },
};

export const ErrorState: Story = {
  args: {
    ...Ready.args,
    entries: [],
    status: "error",
    errorMessage: "记忆索引读取失败，请稍后重试。",
  },
};
