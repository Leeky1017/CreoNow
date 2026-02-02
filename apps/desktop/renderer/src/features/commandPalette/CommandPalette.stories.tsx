import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { CommandPalette } from "./CommandPalette";

/**
 * CommandPalette 组件 Story
 *
 * 功能：
 * - 命令面板弹窗（Cmd/Ctrl+P 触发）
 * - 命令列表
 * - 导出 Markdown 等操作
 */
const meta: Meta<typeof CommandPalette> = {
  title: "Features/CommandPalette",
  component: CommandPalette,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    open: {
      control: "boolean",
      description: "Whether the palette is open",
    },
  },
  args: {
    onOpenChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CommandPalette>;

/**
 * 打开状态
 *
 * 命令面板打开
 */
export const Open: Story = {
  args: {
    open: true,
  },
  render: (args) => (
    <div style={{ width: "600px", height: "300px", position: "relative" }}>
      <CommandPalette {...args} />
    </div>
  ),
};

/**
 * 关闭状态
 *
 * 命令面板关闭（不渲染）
 */
export const Closed: Story = {
  args: {
    open: false,
  },
  render: (args) => (
    <div style={{ width: "600px", height: "300px", position: "relative" }}>
      <CommandPalette {...args} />
      <div style={{ padding: "20px", color: "var(--color-fg-muted)", textAlign: "center" }}>
        Command palette is closed (nothing rendered)
      </div>
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
        width: "800px",
        height: "400px",
        position: "relative",
        backgroundColor: "var(--color-bg-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CommandPalette {...args} />
    </div>
  ),
};
