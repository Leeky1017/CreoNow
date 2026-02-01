import type { Meta, StoryObj } from "@storybook/react";
import { AiPanel } from "./AiPanel";

/**
 * AiPanel 组件 Story
 *
 * 功能：
 * - AI 运行/取消控制
 * - 流式/非流式模式切换
 * - 技能选择
 * - 上下文查看
 * - Diff 预览和应用
 */
const meta = {
  title: "Features/AiPanel",
  component: AiPanel,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AiPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认状态
 *
 * 空闲状态的 AI 面板
 */
export const Default: Story = {
  render: () => (
    <div style={{ width: "320px", height: "600px", backgroundColor: "var(--color-bg-surface)" }}>
      <AiPanel />
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
    <div style={{ width: "280px", height: "600px", backgroundColor: "var(--color-bg-surface)" }}>
      <AiPanel />
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
      <AiPanel />
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
    <div style={{ width: "320px", height: "100vh", backgroundColor: "var(--color-bg-surface)" }}>
      <AiPanel />
    </div>
  ),
};
