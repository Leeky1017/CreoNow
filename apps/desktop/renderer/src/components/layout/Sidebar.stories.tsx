import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Sidebar } from "./Sidebar";
import { layoutDecorator } from "./test-utils";
import { LAYOUT_DEFAULTS } from "../../stores/layoutStore";

/**
 * Sidebar 组件 Story
 *
 * 设计规范: Sidebar 默认宽度 240px，最小 180px，最大 400px。
 *
 * 功能：
 * - 可调整宽度的左侧面板
 * - 包含 Files/Outline/Search/KG 标签页
 * - 支持折叠/展开
 */
const meta = {
  title: "Layout/Sidebar",
  component: Sidebar,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [layoutDecorator],
  argTypes: {
    width: {
      control: { type: "range", min: 180, max: 400, step: 10 },
      description: "Sidebar width in pixels",
    },
    collapsed: {
      control: "boolean",
      description: "Whether sidebar is collapsed",
    },
    projectId: {
      control: "text",
      description: "Current project ID",
    },
    activePanel: {
      control: "select",
      options: ["sidebar", "memory"],
      description: "Active left panel mode",
    },
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认状态
 *
 * 默认宽度 240px 的展开状态
 */
export const Default: Story = {
  args: {
    width: LAYOUT_DEFAULTS.sidebar.default,
    collapsed: false,
    projectId: null,
    activePanel: "sidebar",
  },
  render: (args) => (
    <div style={{ display: "flex", height: "400px" }}>
      <Sidebar {...args} />
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
 * 折叠状态
 *
 * Sidebar 折叠后隐藏
 */
export const Collapsed: Story = {
  args: {
    width: 0,
    collapsed: true,
    projectId: null,
    activePanel: "sidebar",
  },
  render: (args) => (
    <div style={{ display: "flex", height: "400px" }}>
      <Sidebar {...args} />
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
        Sidebar is collapsed
      </div>
    </div>
  ),
};

/**
 * 最小宽度
 *
 * 180px 最小宽度状态
 */
export const MinWidth: Story = {
  args: {
    width: LAYOUT_DEFAULTS.sidebar.min,
    collapsed: false,
    projectId: null,
    activePanel: "sidebar",
  },
  render: (args) => (
    <div style={{ display: "flex", height: "400px" }}>
      <Sidebar {...args} />
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
        Sidebar at minimum width (180px)
      </div>
    </div>
  ),
};

/**
 * 最大宽度
 *
 * 400px 最大宽度状态
 */
export const MaxWidth: Story = {
  args: {
    width: LAYOUT_DEFAULTS.sidebar.max,
    collapsed: false,
    projectId: null,
    activePanel: "sidebar",
  },
  render: (args) => (
    <div style={{ display: "flex", height: "400px" }}>
      <Sidebar {...args} />
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
        Sidebar at maximum width (400px)
      </div>
    </div>
  ),
};

/**
 * 有项目状态
 *
 * 当有项目时显示项目内容
 */
export const WithProject: Story = {
  args: {
    width: LAYOUT_DEFAULTS.sidebar.default,
    collapsed: false,
    projectId: "test-project-id",
    activePanel: "sidebar",
  },
  render: (args) => (
    <div style={{ display: "flex", height: "400px" }}>
      <Sidebar {...args} />
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
        Sidebar with project content
      </div>
    </div>
  ),
};

/**
 * 所有 Tab 切换演示
 *
 * 点击 Files / Outline / Search / KG 切换不同面板
 * - Files: 文件树
 * - Outline: 文档大纲（新增）
 * - Search: 搜索面板
 * - KG: 知识图谱
 */
export const AllTabs: Story = {
  args: {
    width: 280,
    collapsed: false,
    projectId: "demo-project",
    activePanel: "sidebar",
  },
  parameters: {
    docs: {
      description: {
        story: `Sidebar 包含 4 个 Tab: Files / **Outline** / Search / KG。
        
点击 **Outline** Tab 查看文档大纲面板，功能包括：
- 搜索/过滤
- 单节点展开/折叠
- 字数统计
- 拖拽排序
- 多选批量操作
- 键盘导航`,
      },
    },
  },
  render: (args) => (
    <div style={{ display: "flex", height: "600px", width: "100%" }}>
      <Sidebar {...args} />
      <div
        style={{
          flex: 1,
          backgroundColor: "var(--color-bg-base)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-fg-muted)",
          fontSize: "14px",
          padding: "24px",
        }}
      >
        <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px", color: "var(--color-fg-default)" }}>
          Main Editor Area
        </div>
        <div style={{ textAlign: "center", maxWidth: "400px", lineHeight: "1.6" }}>
          <p>← 点击左侧 Tab 切换面板</p>
          <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--color-fg-subtle)" }}>
            Files | <strong>Outline</strong> | Search | KG
          </p>
        </div>
      </div>
    </div>
  ),
};
