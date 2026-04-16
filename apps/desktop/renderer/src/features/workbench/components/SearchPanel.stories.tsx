import type { Meta, StoryObj } from "@storybook/react";

import { SearchPanel, type SearchPanelResult } from "./SearchPanel";

const results: SearchPanelResult[] = [
  {
    id: "doc-1/chunk-1",
    documentId: "doc-1",
    title: "雨夜仓库",
    snippet: "林远在雨夜追踪线索，旧仓库门锁被人动过，灯光在积水中反复闪烁。",
    score: 0.9234,
    strategy: "hybrid",
    updatedAt: Date.now() - 3_600_000,
  },
  {
    id: "doc-2/chunk-7",
    documentId: "doc-2",
    title: "人物档案",
    snippet: "退休刑警与主角父辈旧案存在交叉，成为后续章节冲突引线。",
    score: 0.8123,
    strategy: "semantic",
    updatedAt: Date.now() - 7_200_000,
  },
];

const meta: Meta<typeof SearchPanel> = {
  title: "Features/Workbench/SearchPanel",
  component: SearchPanel,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof SearchPanel>;

export const Ready: Story = {
  args: {
    errorMessage: null,
    onQueryChange: () => {},
    onRetry: () => {},
    onStrategyChange: () => {},
    query: "仓库",
    results,
    status: "ready",
    strategy: "hybrid",
  },
};

export const Loading: Story = {
  args: {
    ...Ready.args,
    query: "林远",
    results: [],
    status: "loading",
  },
};

export const ErrorState: Story = {
  args: {
    ...Ready.args,
    query: "线索",
    results: [],
    status: "error",
    errorMessage: "search.panel.error",
  },
};

export const Empty: Story = {
  args: {
    ...Ready.args,
    query: "",
    results: [],
    status: "ready",
  },
};

export const NoMatch: Story = {
  args: {
    ...Ready.args,
    query: "不存在关键词",
    results,
    status: "ready",
  },
};
