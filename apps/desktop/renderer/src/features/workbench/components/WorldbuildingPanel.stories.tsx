import type { Meta, StoryObj } from "@storybook/react";

import {
  WorldbuildingPanel,
  type WorldbuildingEntry,
} from "./WorldbuildingPanel";

const entries: WorldbuildingEntry[] = [
  {
    id: "loc-1",
    name: "阿卡迪亚",
    typeLabel: "设定 / 都市",
    description: "阶级分化严重的霓虹都市，主线冲突爆发地。",
    status: "detailed",
    updatedAt: Date.now(),
  },
  {
    id: "loc-2",
    name: "地下回廊",
    typeLabel: "地点设定",
    description: "",
    status: "draft",
    updatedAt: Date.now() - 86400000,
  },
];

const meta: Meta<typeof WorldbuildingPanel> = {
  title: "Features/Workbench/WorldbuildingPanel",
  component: WorldbuildingPanel,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof WorldbuildingPanel>;

export const EncyclopediaReady: Story = {
  args: {
    entries,
    errorMessage: null,
    onCreateEntry: () => {},
    onQueryChange: () => {},
    onRetry: () => {},
    onTabChange: () => {},
    query: "",
    status: "ready",
    tab: "encyclopedia",
  },
};

export const Loading: Story = {
  args: {
    ...EncyclopediaReady.args,
    status: "loading",
  },
};

export const ErrorState: Story = {
  args: {
    ...EncyclopediaReady.args,
    status: "error",
    errorMessage: "读取世界观数据失败，请稍后重试。",
  },
};

export const MapView: Story = {
  args: {
    ...EncyclopediaReady.args,
    tab: "map",
  },
};
