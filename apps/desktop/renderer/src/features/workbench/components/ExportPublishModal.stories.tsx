import type { Meta, StoryObj } from "@storybook/react";

import { ExportPublishModal } from "./ExportPublishModal";

const meta: Meta<typeof ExportPublishModal> = {
  title: "Workbench/ExportPublishModal",
  component: ExportPublishModal,
  args: {
    isOpen: true,
    mode: "export",
    exporting: false,
    errorMessage: null,
    resultPath: null,
    onClose: () => undefined,
    onExport: () => undefined,
    onModeChange: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof ExportPublishModal>;

export const ExportMode: Story = {};

export const PublishMode: Story = {
  args: {
    mode: "publish",
  },
};

export const Exporting: Story = {
  args: {
    exporting: true,
  },
};

export const ErrorState: Story = {
  args: {
    errorMessage: "export failed",
  },
};
