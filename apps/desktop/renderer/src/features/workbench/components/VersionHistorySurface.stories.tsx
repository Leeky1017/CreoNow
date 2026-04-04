import type { Meta, StoryObj } from "@storybook/react";

import { VersionHistorySurface } from "@/features/workbench/components/VersionHistorySurface";

const meta: Meta<typeof VersionHistorySurface> = {
  title: "Workbench/VersionHistorySurface",
  component: VersionHistorySurface,
  args: {
    activeDocumentId: "doc-1",
    busyAction: null,
    errorMessage: null,
    items: [
      {
        actor: "user",
        contentHash: "hash-current",
        createdAt: Date.parse("2025-01-02T10:00:00Z"),
        reason: "rollback",
        versionId: "version-current",
        wordCount: 348,
      },
      {
        actor: "ai",
        contentHash: "hash-ai",
        createdAt: Date.parse("2025-01-02T09:30:00Z"),
        reason: "ai-accept",
        versionId: "version-ai",
        wordCount: 355,
      },
      {
        actor: "auto",
        contentHash: "hash-prewrite",
        createdAt: Date.parse("2025-01-02T09:25:00Z"),
        reason: "pre-write",
        versionId: "version-pre-write",
        wordCount: 332,
      },
    ],
    loading: false,
    onRestore: () => undefined,
    onRollback: () => undefined,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleSnapshot: Story = {
  args: {
    items: [
      {
        actor: "user",
        contentHash: "hash-single",
        createdAt: Date.parse("2025-01-02T10:00:00Z"),
        reason: "manual-save",
        versionId: "version-single",
        wordCount: 128,
      },
    ],
  },
};

export const Loading: Story = {
  args: {
    items: [],
    loading: true,
  },
};
