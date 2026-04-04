import type { Meta, StoryObj } from "@storybook/react";

import { VersionHistorySurface } from "@/features/workbench/components/VersionHistorySurface";

const meta: Meta<typeof VersionHistorySurface> = {
  title: "Workbench/VersionHistorySurface",
  component: VersionHistorySurface,
  args: {
    errorMessage: null,
    loading: false,
    pendingRollbackVersionId: null,
    rollbackingVersionId: null,
    onCancelRollback: () => undefined,
    onConfirmRollback: () => undefined,
    onRequestRollback: () => undefined,
    items: [
      {
        versionId: "rollback-2",
        actor: "user",
        reason: "rollback",
        wordCount: 138,
        parentSnapshotId: "pre-rollback-1",
        createdAtLabel: "04/04 23:17",
      },
      {
        versionId: "ai-accept-1",
        actor: "ai",
        reason: "ai-accept",
        wordCount: 152,
        parentSnapshotId: "pre-write-1",
        createdAtLabel: "04/04 22:58",
      },
    ],
  },
};

export default meta;

type Story = StoryObj<typeof VersionHistorySurface>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    items: [],
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};
