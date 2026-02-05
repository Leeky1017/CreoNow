import type { Meta, StoryObj } from "@storybook/react";
import { IconBar } from "./IconBar";
import { layoutDecorator } from "./test-utils";

/**
 * IconBar 组件 Story
 *
 * 设计规范 §5.2: Icon Bar 宽度 48px，图标 24px，点击区域 40x40px。
 *
 * 功能：
 * - 固定宽度的导航栏
 * - 侧边栏折叠/展开切换按钮
 */
const meta = {
  title: "Layout/IconBar",
  component: IconBar,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [layoutDecorator],
} satisfies Meta<typeof IconBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认状态
 *
 * 固定 48px 宽度的垂直导航栏
 */
export const Default: Story = {
  args: { onOpenSettings: () => {} },
  render: (args) => (
    <div style={{ display: "flex", height: "400px" }}>
      <IconBar {...args} />
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
    </div>
  ),
};

/**
 * 完整高度展示
 *
 * 展示 IconBar 在全屏高度下的表现
 */
export const FullHeight: Story = {
  args: { onOpenSettings: () => {} },
  render: (args) => (
    <div style={{ display: "flex", height: "100vh" }}>
      <IconBar {...args} />
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
        Full Height Layout
      </div>
    </div>
  ),
};
