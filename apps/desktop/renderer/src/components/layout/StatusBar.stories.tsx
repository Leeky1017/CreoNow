import type { Meta, StoryObj } from "@storybook/react";
import { StatusBar } from "./StatusBar";
import { layoutDecorator } from "./test-utils";

/**
 * StatusBar 组件 Story
 *
 * 设计规范 §5.4: Status bar 高度 28px。
 *
 * 功能：
 * - 固定高度的底部状态栏
 * - 显示自动保存状态
 */
const meta = {
  title: "Layout/StatusBar",
  component: StatusBar,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [layoutDecorator],
} satisfies Meta<typeof StatusBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认状态
 *
 * 固定 28px 高度的底部状态栏
 */
export const Default: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", height: "300px" }}>
      <div
        style={{
          flex: 1,
          backgroundColor: "var(--color-bg-base)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-fg-muted)",
          fontSize: "14px",
        }}
      >
        Main Content Area
      </div>
      <StatusBar />
    </div>
  ),
};

/**
 * 完整宽度展示
 *
 * StatusBar 在全宽布局下的表现
 */
export const FullWidth: Story = {
  render: () => (
    <div style={{ width: "100%" }}>
      <StatusBar />
    </div>
  ),
};
