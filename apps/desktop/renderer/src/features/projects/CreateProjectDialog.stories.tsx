import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { CreateProjectDialog } from "./CreateProjectDialog";

/**
 * CreateProjectDialog 组件 Story
 *
 * 功能：
 * - 创建项目对话框
 * - 名称输入
 * - 表单验证
 */
const meta: Meta<typeof CreateProjectDialog> = {
  title: "Features/CreateProjectDialog",
  component: CreateProjectDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    open: {
      control: "boolean",
      description: "Whether the dialog is open",
    },
  },
  args: {
    onOpenChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CreateProjectDialog>;

/**
 * 打开状态
 *
 * 创建项目对话框打开
 */
export const Open: Story = {
  args: {
    open: true,
  },
};

/**
 * 关闭状态
 *
 * 创建项目对话框关闭
 */
export const Closed: Story = {
  args: {
    open: false,
  },
  render: (args) => (
    <div
      style={{
        padding: "20px",
        color: "var(--color-fg-muted)",
        textAlign: "center",
      }}
    >
      <CreateProjectDialog {...args} />
      Dialog is closed
    </div>
  ),
};

/**
 * 暗色背景
 *
 * 在暗色背景下的显示效果
 */
export const DarkBackground: Story = {
  args: {
    open: true,
  },
  render: (args) => (
    <div
      style={{
        width: "600px",
        height: "400px",
        backgroundColor: "var(--color-bg-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CreateProjectDialog {...args} />
    </div>
  ),
};
