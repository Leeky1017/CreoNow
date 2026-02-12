import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { RightPanel } from "./RightPanel";
import { layoutDecorator } from "./test-utils";
import {
  LAYOUT_DEFAULTS,
  type RightPanelType,
  useLayoutStore,
} from "../../stores/layoutStore";

function RightPanelStoryRender(args: {
  width: number;
  collapsed: boolean;
  activeTab: RightPanelType;
}): JSX.Element {
  const setActiveRightPanel = useLayoutStore((s) => s.setActiveRightPanel);

  React.useEffect(() => {
    setActiveRightPanel(args.activeTab);
  }, [args.activeTab, setActiveRightPanel]);

  return (
    <div style={{ display: "flex", height: "420px" }}>
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
      <RightPanel width={args.width} collapsed={args.collapsed} />
    </div>
  );
}

const meta = {
  title: "Layout/RightPanel",
  component: RightPanel,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [layoutDecorator],
} satisfies Meta<typeof RightPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AiTabDefault: Story = {
  args: {
    width: LAYOUT_DEFAULTS.panel.default,
    collapsed: false,
  },
  render: (args) => <RightPanelStoryRender {...args} activeTab="ai" />,
};

export const InfoTab: Story = {
  args: {
    width: LAYOUT_DEFAULTS.panel.default,
    collapsed: false,
  },
  render: (args) => <RightPanelStoryRender {...args} activeTab="info" />,
};

export const QualityTab: Story = {
  args: {
    width: LAYOUT_DEFAULTS.panel.default,
    collapsed: false,
  },
  render: (args) => <RightPanelStoryRender {...args} activeTab="quality" />,
};

export const WithCollapseButton: Story = {
  args: {
    width: LAYOUT_DEFAULTS.panel.default,
    collapsed: false,
  },
  render: (args) => (
    <div style={{ display: "flex", height: "420px" }}>
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
      <RightPanel
        width={args.width}
        collapsed={args.collapsed}
        onCollapse={() => alert("Collapse triggered")}
      />
    </div>
  ),
};

export const Collapsed: Story = {
  args: {
    width: 0,
    collapsed: true,
  },
  render: (args) => <RightPanelStoryRender {...args} activeTab="ai" />,
};
