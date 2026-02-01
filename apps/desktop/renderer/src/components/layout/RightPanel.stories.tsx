import type { Meta, StoryObj } from "@storybook/react";
import { RightPanel } from "./RightPanel";
import { layoutDecorator } from "./test-utils";
import { LAYOUT_DEFAULTS } from "../../stores/layoutStore";

/**
 * RightPanel 组件 Story
 *
 * 设计规范 §5.3: 右侧面板默认宽度 320px，最小 240px，最大 600px。
 *
 * 功能：
 * - 可调整宽度的右侧面板
 * - 包含 AI/Memory/Settings 面板
 * - 支持折叠/展开
 */
const meta = {
  title: "Layout/RightPanel",
  component: RightPanel,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [layoutDecorator],
  argTypes: {
    width: {
      control: { type: "range", min: 280, max: 480, step: 10 },
      description: "Panel width in pixels",
    },
    collapsed: {
      control: "boolean",
      description: "Whether panel is collapsed",
    },
  },
} satisfies Meta<typeof RightPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认状态
 *
 * 默认宽度 320px 的展开状态
 */
export const Default: Story = {
  args: {
    width: LAYOUT_DEFAULTS.panel.default,
    collapsed: false,
  },
  render: (args) => (
    <div style={{ display: "flex", height: "400px" }}>
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
      <RightPanel {...args} />
    </div>
  ),
};

/**
 * 折叠状态
 *
 * RightPanel 折叠后隐藏
 */
export const Collapsed: Story = {
  args: {
    width: 0,
    collapsed: true,
  },
  render: (args) => (
    <div style={{ display: "flex", height: "400px" }}>
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
        Right panel is collapsed
      </div>
      <RightPanel {...args} />
    </div>
  ),
};

/**
 * 最小宽度
 *
 * 280px 最小宽度状态
 */
export const MinWidth: Story = {
  args: {
    width: LAYOUT_DEFAULTS.panel.min,
    collapsed: false,
  },
  render: (args) => (
    <div style={{ display: "flex", height: "400px" }}>
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
        Panel at minimum width (280px)
      </div>
      <RightPanel {...args} />
    </div>
  ),
};

/**
 * 最大宽度
 *
 * 480px 最大宽度状态
 */
export const MaxWidth: Story = {
  args: {
    width: LAYOUT_DEFAULTS.panel.max,
    collapsed: false,
  },
  render: (args) => (
    <div style={{ display: "flex", height: "400px" }}>
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
        Panel at maximum width (480px)
      </div>
      <RightPanel {...args} />
    </div>
  ),
};

/**
 * 完整高度
 *
 * 全屏高度状态下的面板
 */
export const FullHeight: Story = {
  args: {
    width: LAYOUT_DEFAULTS.panel.default,
    collapsed: false,
  },
  render: (args) => (
    <div style={{ display: "flex", height: "100vh" }}>
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
        Full height layout
      </div>
      <RightPanel {...args} />
    </div>
  ),
};
