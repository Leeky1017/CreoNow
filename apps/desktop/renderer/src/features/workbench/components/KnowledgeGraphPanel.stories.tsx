import type { Meta, StoryObj } from "@storybook/react";

import { KnowledgeGraphPanel, type KnowledgeGraphNode } from "./KnowledgeGraphPanel";

const nodes: KnowledgeGraphNode[] = [
  {
    id: "character:char-1",
    name: "雷恩",
    type: "character",
    description: "契约守护者，正在追查崩裂事件。",
    updatedAt: Date.now(),
  },
  {
    id: "character:char-2",
    name: "艾琳娜",
    type: "character",
    description: "联盟档案官，掌握失落契约副本。",
    updatedAt: Date.now() - 3600_000,
  },
  {
    id: "location:loc-1",
    name: "深渊洞窟",
    type: "location",
    description: "已封锁的地下节点，关联多条冲突线索。",
    updatedAt: Date.now() - 7200_000,
  },
];

const links = [
  { id: "link-1", sourceId: "character:char-1", targetId: "location:loc-1", label: "探索" },
  { id: "link-2", sourceId: "character:char-2", targetId: "character:char-1", label: "协作" },
];

const meta: Meta<typeof KnowledgeGraphPanel> = {
  title: "Features/Workbench/KnowledgeGraphPanel",
  component: KnowledgeGraphPanel,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof KnowledgeGraphPanel>;

export const GraphReady: Story = {
  args: {
    errorMessage: null,
    links,
    nodes,
    onQueryChange: () => {},
    onRetry: () => {},
    onViewChange: () => {},
    query: "",
    status: "ready",
    view: "graph",
  },
};

export const SummaryReady: Story = {
  args: {
    ...GraphReady.args,
    view: "summary",
  },
};

export const Loading: Story = {
  args: {
    ...GraphReady.args,
    links: [],
    nodes: [],
    status: "loading",
  },
};

export const ErrorState: Story = {
  args: {
    ...GraphReady.args,
    links: [],
    nodes: [],
    status: "error",
    errorMessage: "知识图谱索引读取失败，请稍后重试。",
  },
};
