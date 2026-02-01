import type { Meta, StoryObj } from "@storybook/react";
import { MemoryPanel } from "./MemoryPanel";

/**
 * MemoryPanel 组件 Story
 *
 * 功能：
 * - 记忆 CRUD 操作
 * - 设置管理（注入/学习/隐私）
 * - 注入预览
 */
const meta = {
  title: "Features/MemoryPanel",
  component: MemoryPanel,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MemoryPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认状态
 *
 * 空闲状态的记忆面板
 */
export const Default: Story = {
  render: () => (
    <div style={{ width: "320px", height: "700px", backgroundColor: "var(--color-bg-surface)", overflow: "auto" }}>
      <MemoryPanel />
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
    <div style={{ width: "280px", height: "700px", backgroundColor: "var(--color-bg-surface)", overflow: "auto" }}>
      <MemoryPanel />
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
    <div style={{ width: "480px", height: "700px", backgroundColor: "var(--color-bg-surface)", overflow: "auto" }}>
      <MemoryPanel />
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
      <MemoryPanel />
    </div>
  ),
};
