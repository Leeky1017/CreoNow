import type { Meta, StoryObj } from "@storybook/react";
import { ContextViewer } from "./ContextViewer";

/**
 * ContextViewer 组件 Story
 *
 * 功能：
 * - 显示 AI 上下文层级（rules/settings/retrieved/immediate）
 * - 显示 token 预算
 * - 显示 trim/redaction 证据
 */
const meta = {
  title: "Features/ContextViewer",
  component: ContextViewer,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ContextViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认状态
 *
 * 无上下文时的空状态
 */
export const Default: Story = {
  render: () => (
    <div style={{ width: "320px", height: "400px", backgroundColor: "var(--color-bg-surface)" }}>
      <ContextViewer />
    </div>
  ),
};

/**
 * 窄宽度
 *
 * 最小宽度下的布局
 */
export const NarrowWidth: Story = {
  render: () => (
    <div style={{ width: "280px", height: "400px", backgroundColor: "var(--color-bg-surface)" }}>
      <ContextViewer />
    </div>
  ),
};

/**
 * 宽布局
 *
 * 较宽面板下的布局
 */
export const WideWidth: Story = {
  render: () => (
    <div style={{ width: "480px", height: "600px", backgroundColor: "var(--color-bg-surface)" }}>
      <ContextViewer />
    </div>
  ),
};

/**
 * 全高度
 *
 * 完整高度场景
 */
export const FullHeight: Story = {
  render: () => (
    <div style={{ width: "320px", height: "100vh", backgroundColor: "var(--color-bg-surface)", overflow: "auto" }}>
      <ContextViewer />
    </div>
  ),
};
