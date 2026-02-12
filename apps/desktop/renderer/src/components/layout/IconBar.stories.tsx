import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { IconBar } from "./IconBar";
import { layoutDecorator } from "./test-utils";
import { useLayoutStore, type LeftPanelType } from "../../stores/layoutStore";

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
  args: {
    onOpenSettings: () => {},
    settingsOpen: false,
  },
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [layoutDecorator],
} satisfies Meta<typeof IconBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Story helper that forces a deterministic layout store state.
 */
function IconBarStatePreview(props: {
  activePanel: LeftPanelType;
  hoveredTestId?: string;
  settingsOpen?: boolean;
  fullHeight?: boolean;
}): JSX.Element {
  const setActiveLeftPanel = useLayoutStore((s) => s.setActiveLeftPanel);
  const setSidebarCollapsed = useLayoutStore((s) => s.setSidebarCollapsed);

  React.useEffect(() => {
    setActiveLeftPanel(props.activePanel);
    setSidebarCollapsed(false);
  }, [props.activePanel, setActiveLeftPanel, setSidebarCollapsed]);

  const simulatedHoverClass = props.hoveredTestId
    ? `[&_[data-testid='${props.hoveredTestId}']]:bg-[var(--color-bg-hover)] [&_[data-testid='${props.hoveredTestId}']]:text-[var(--color-fg-default)]`
    : "";

  return (
    <div
      style={{ display: "flex", height: props.fullHeight ? "100vh" : "100%" }}
    >
      <div className={simulatedHoverClass}>
        <IconBar
          onOpenSettings={() => {}}
          settingsOpen={props.settingsOpen ?? false}
        />
      </div>
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
        {props.fullHeight ? "Full Height Layout" : "Main Content Area"}
      </div>
    </div>
  );
}

/**
 * 默认状态（files 激活）
 */
export const Default: Story = {
  render: () => (
    <div style={{ display: "flex", height: "400px" }}>
      <IconBarStatePreview activePanel="files" />
    </div>
  ),
};

/**
 * 其他面板激活态（knowledgeGraph 激活）
 */
export const KnowledgeGraphActive: Story = {
  render: () => (
    <div style={{ display: "flex", height: "400px" }}>
      <IconBarStatePreview activePanel="knowledgeGraph" />
    </div>
  ),
};

/**
 * 悬停态（模拟 Search 按钮 hover）
 */
export const SearchHover: Story = {
  render: () => (
    <div style={{ display: "flex", height: "400px" }}>
      <IconBarStatePreview
        activePanel="files"
        hoveredTestId="icon-bar-search"
      />
    </div>
  ),
};

/**
 * 完整高度展示
 */
export const FullHeight: Story = {
  render: () => <IconBarStatePreview activePanel="files" fullHeight={true} />,
};
