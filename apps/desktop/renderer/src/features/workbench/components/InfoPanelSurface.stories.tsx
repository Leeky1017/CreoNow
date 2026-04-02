import type { Meta, StoryObj } from "@storybook/react";

import { InfoPanelSurface } from "@/features/workbench/components/InfoPanelSurface";

const meta: Meta<typeof InfoPanelSurface> = {
  title: "Workbench/InfoPanelSurface",
  component: InfoPanelSurface,
  args: {
    documentTitle: "第一章",
    errorMessage: null,
    loading: false,
    projectName: "未命名项目",
    statusLabel: "已保存",
    updatedAt: "01/01 12:00",
    wordCount: 128,
  },
};

export default meta;

type Story = StoryObj<typeof InfoPanelSurface>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    documentTitle: null,
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const ErrorState: Story = {
  args: {
    errorMessage: "当前无法读取文档元信息，请稍后重试。",
  },
};
