import type { Meta, StoryObj } from "@storybook/react";
import type { ComponentProps } from "react";

import { KnowledgeGraphPanel } from "@/features/workbench/components/KnowledgeGraphPanel";

type KnowledgeGraphPanelProps = ComponentProps<typeof KnowledgeGraphPanel>;

const nodes: KnowledgeGraphPanelProps["nodes"] = [
  {
    attributes: { 年龄: "28", 身份: "前特种兵" },
    description: "冷静克制，擅长追踪。",
    id: "node-linyuan",
    name: "林远",
    type: "character",
  },
  {
    attributes: { 阵营: "巡夜会" },
    description: "档案管理员，掌握旧城地图。",
    id: "node-zhangwei",
    name: "张薇",
    type: "character",
  },
  {
    attributes: { 区域: "旧城北区" },
    description: "雨夜追逐的关键场景。",
    id: "node-clocktower",
    name: "旧钟楼",
    type: "location",
  },
  {
    attributes: { 危险级别: "高" },
    description: "触发主线反转的爆炸案。",
    id: "node-explosion",
    name: "码头爆炸",
    type: "event",
  },
  {
    attributes: { 密级: "绝密" },
    description: "决定阵营走向的硬盘。",
    id: "node-drive",
    name: "密钥硬盘",
    type: "item",
  },
  {
    attributes: { 立场: "中立偏敌对" },
    description: "控制旧城地下网络。",
    id: "node-faction",
    name: "黑曜会",
    type: "faction",
  },
];

const edges: KnowledgeGraphPanelProps["edges"] = [
  {
    id: "edge-ally",
    label: "盟友",
    sourceId: "node-linyuan",
    targetId: "node-zhangwei",
  },
  {
    id: "edge-located",
    label: "位于",
    sourceId: "node-drive",
    targetId: "node-clocktower",
  },
  {
    id: "edge-participates",
    label: "参与",
    sourceId: "node-linyuan",
    targetId: "node-explosion",
  },
  {
    id: "edge-enemy",
    label: "敌对",
    sourceId: "node-zhangwei",
    targetId: "node-faction",
  },
];

const meta = {
  title: "Workbench/KnowledgeGraphPanel",
  component: KnowledgeGraphPanel,
  args: {
    edges,
    errorMessage: null,
    nodes,
    status: "ready",
  },
} satisfies Meta<typeof KnowledgeGraphPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    status: "loading",
  },
};

export const Empty: Story = {
  args: {
    edges: [],
    nodes: [],
    status: "ready",
  },
};

export const ErrorState: Story = {
  args: {
    errorMessage: "图谱加载失败，请稍后重试。",
    status: "error",
  },
};
