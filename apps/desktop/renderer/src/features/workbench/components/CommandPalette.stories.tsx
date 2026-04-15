import type { Meta, StoryObj } from "@storybook/react";

import { CommandPalette } from "@/features/workbench/components/CommandPalette";

const meta: Meta<typeof CommandPalette> = {
  title: "Workbench/CommandPalette",
  component: CommandPalette,
};

export default meta;

type Story = StoryObj<typeof CommandPalette>;

const groupLabels = {
  actions: "快捷动作",
  documents: "最近文档",
  navigation: "导航",
  scenarios: "场景",
} as const;

const items = [
  { id: "nav-dashboard", group: "navigation" as const, label: "仪表盘", description: "查看项目概览与指标" },
  { id: "nav-files", group: "navigation" as const, label: "文件", description: "切换到文稿列表" },
  { id: "scenario-novel", group: "scenarios" as const, label: "长篇小说", description: "大纲与主线冲突驱动" },
  { id: "doc-1", group: "documents" as const, label: "第一章：风从北方来", description: "03/18 21:14" },
  { id: "action-new-doc", group: "actions" as const, label: "新建文档", description: "创建并打开新文稿" },
];

export const Default: Story = {
  args: {
    emptyLabel: "没有匹配结果。",
    groupLabels,
    items,
    onClose: () => undefined,
    onQueryChange: () => undefined,
    onSelect: () => undefined,
    open: true,
    placeholder: "搜索页面、场景或命令…",
    query: "",
    shortcutHint: "Ctrl/Cmd+K",
    title: "命令面板",
  },
};

export const Filtered: Story = {
  args: {
    ...Default.args,
    query: "文件",
  },
};
