import type { Meta, StoryObj } from "@storybook/react";
import type { ComponentProps } from "react";

import { VersionHistoryPanel } from "@/features/version-history/VersionHistoryPanel";

type VersionHistoryPanelProps = ComponentProps<typeof VersionHistoryPanel>;

const items = [
  {
    versionId: "snapshot-3",
    actor: "ai" as const,
    reason: "rollback" as const,
    contentHash: "hash-3",
    createdAt: new Date("2025-04-04T12:30:00+08:00").getTime(),
    parentSnapshotId: "snapshot-2",
    wordCount: 1388,
  },
  {
    versionId: "snapshot-2",
    actor: "auto" as const,
    reason: "pre-rollback" as const,
    contentHash: "hash-2",
    createdAt: new Date("2025-04-04T12:10:00+08:00").getTime(),
    parentSnapshotId: "snapshot-1",
    wordCount: 1420,
  },
  {
    versionId: "snapshot-1",
    actor: "user" as const,
    reason: "manual-save" as const,
    contentHash: "hash-1",
    createdAt: new Date("2025-04-04T11:40:00+08:00").getTime(),
    parentSnapshotId: null,
    wordCount: 1328,
  },
] satisfies VersionHistoryPanelProps["items"];

const selectedSnapshot = {
  versionId: "snapshot-3",
  documentId: "doc-1",
  projectId: "project-1",
  actor: "ai" as const,
  reason: "rollback" as const,
  contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "风声贴着窗框游走，像一支不愿停下的铅笔。" }] }] }),
  contentText: "风声贴着窗框游走，像一支不愿停下的铅笔。",
  contentMd: "风声贴着窗框游走，像一支不愿停下的铅笔。",
  contentHash: "hash-3",
  wordCount: 1388,
  parentSnapshotId: "snapshot-2",
  createdAt: new Date("2025-04-04T12:30:00+08:00").getTime(),
} satisfies VersionHistoryPanelProps["selectedSnapshot"];

const meta = {
  title: "VersionHistory/Panel",
  component: VersionHistoryPanel,
  args: {
    action: null,
    errorMessage: null,
    items,
    onRefresh: () => undefined,
    onRollback: () => undefined,
    onRestore: () => undefined,
    onSelectVersion: () => undefined,
    previewStatus: "ready",
    selectedSnapshot,
    selectedVersionId: "snapshot-3",
    status: "ready",
  },
} satisfies Meta<typeof VersionHistoryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Minimal: Story = {
  args: {
    items: [items[2]],
    selectedSnapshot: {
      ...selectedSnapshot,
      actor: "user",
      reason: "manual-save",
      versionId: "snapshot-1",
      wordCount: 1328,
      parentSnapshotId: null,
      createdAt: new Date("2025-04-04T11:40:00+08:00").getTime(),
    },
    selectedVersionId: "snapshot-1",
  },
};

export const Loading: Story = {
  args: {
    items: [],
    previewStatus: "idle",
    selectedSnapshot: null,
    selectedVersionId: null,
    status: "loading",
  },
};
