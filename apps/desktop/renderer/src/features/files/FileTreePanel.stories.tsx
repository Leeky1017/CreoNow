import type { Meta, StoryObj } from "@storybook/react";
import { FileTreePanel } from "./FileTreePanel";

/**
 * FileTreePanel 组件 Story
 *
 * 功能：
 * - 显示项目文档列表
 * - 支持创建/重命名/删除文档
 * - 显示空状态、加载状态、错误状态
 */
const meta = {
  title: "Features/FileTreePanel",
  component: FileTreePanel,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    projectId: {
      control: "text",
      description: "Project ID",
    },
  },
} satisfies Meta<typeof FileTreePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认状态
 *
 * 有项目 ID 时的基本状态
 */
export const Default: Story = {
  args: {
    projectId: "project-1",
  },
  render: (args) => (
    <div style={{ width: "280px", height: "400px", backgroundColor: "var(--color-bg-surface)" }}>
      <FileTreePanel {...args} />
    </div>
  ),
};

/**
 * 空状态
 *
 * 无文档时显示提示
 */
export const Empty: Story = {
  args: {
    projectId: "empty-project",
  },
  render: (args) => (
    <div style={{ width: "280px", height: "400px", backgroundColor: "var(--color-bg-surface)" }}>
      <FileTreePanel {...args} />
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
      <FileTreePanel {...args} />
    </div>
  ),
};

/**
 * 超长文件名
 *
 * 测试文本溢出处理
 */
export const LongFileName: Story = {
  args: {
    projectId: "long-names-project",
  },
  render: (args) => (
    <div style={{ width: "240px", height: "400px", backgroundColor: "var(--color-bg-surface)" }}>
      <FileTreePanel {...args} />
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
      <FileTreePanel {...args} />
    </div>
  ),
};
