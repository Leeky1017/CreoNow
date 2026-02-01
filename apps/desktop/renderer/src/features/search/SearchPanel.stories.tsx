import type { Meta, StoryObj } from "@storybook/react";
import { SearchPanel } from "./SearchPanel";

/**
 * SearchPanel 组件 Story
 *
 * 功能：
 * - 全文搜索输入
 * - 搜索结果列表
 * - 点击导航到文档
 */
const meta = {
  title: "Features/SearchPanel",
  component: SearchPanel,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    projectId: {
      control: "text",
      description: "Project ID to search within",
    },
  },
} satisfies Meta<typeof SearchPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认状态
 *
 * 空搜索状态
 */
export const Default: Story = {
  args: {
    projectId: "project-1",
  },
  render: (args) => (
    <div style={{ width: "280px", height: "400px", backgroundColor: "var(--color-bg-surface)" }}>
      <SearchPanel {...args} />
    </div>
  ),
};

/**
 * 窄宽度
 *
 * 最小宽度下的布局
 */
export const NarrowWidth: Story = {
  args: {
    projectId: "project-1",
  },
  render: (args) => (
    <div style={{ width: "180px", height: "400px", backgroundColor: "var(--color-bg-surface)" }}>
      <SearchPanel {...args} />
    </div>
  ),
};

/**
 * 宽布局
 *
 * 较宽面板下的布局
 */
export const WideWidth: Story = {
  args: {
    projectId: "project-1",
  },
  render: (args) => (
    <div style={{ width: "400px", height: "400px", backgroundColor: "var(--color-bg-surface)" }}>
      <SearchPanel {...args} />
    </div>
  ),
};

/**
 * 全高度
 *
 * 完整高度场景
 */
export const FullHeight: Story = {
  args: {
    projectId: "project-1",
  },
  render: (args) => (
    <div style={{ width: "280px", height: "100vh", backgroundColor: "var(--color-bg-surface)" }}>
      <SearchPanel {...args} />
    </div>
  ),
};
