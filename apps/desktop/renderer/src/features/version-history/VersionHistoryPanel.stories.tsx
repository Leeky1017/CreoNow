import type { Meta, StoryObj } from "@storybook/react";

import { VersionHistoryPanel } from "@/features/version-history/VersionHistoryPanel";
import type { PreloadApi } from "@/lib/preloadApi";

const NOW = 1_700_000_000_000;

function buildSnapshot(overrides: Partial<{
  versionId: string;
  actor: "user" | "auto" | "ai";
  reason: "manual-save" | "autosave" | "ai-accept" | "pre-write" | "pre-rollback" | "rollback" | "status-change";
  wordCount: number;
  createdAt: number;
  contentHash: string;
  parentSnapshotId: string | null;
}> = {}) {
  return {
    versionId: "v1",
    actor: "user" as const,
    reason: "manual-save" as const,
    wordCount: 320,
    createdAt: NOW,
    contentHash: "hash1",
    parentSnapshotId: null,
    ...overrides,
  };
}

const snapshotItems = [
  buildSnapshot({ versionId: "v4", actor: "ai", reason: "ai-accept", createdAt: NOW + 3000, wordCount: 410, parentSnapshotId: "v3" }),
  buildSnapshot({ versionId: "v3", actor: "auto", reason: "pre-write", createdAt: NOW + 2000, wordCount: 320, parentSnapshotId: "v2" }),
  buildSnapshot({ versionId: "v2", actor: "user", reason: "manual-save", createdAt: NOW + 1000, wordCount: 280, parentSnapshotId: "v1" }),
  buildSnapshot({ versionId: "v1", actor: "user", reason: "manual-save", createdAt: NOW, wordCount: 150, parentSnapshotId: null }),
];

function createMockVersionApi(overrides: Partial<PreloadApi["version"]> = {}): PreloadApi["version"] {
  return {
    listSnapshots: async () => ({ ok: true, data: { items: snapshotItems } }),
    readSnapshot: async ({ versionId }) => ({
      ok: true,
      data: {
        versionId,
        documentId: "doc-demo",
        projectId: "project-demo",
        actor: "user" as const,
        reason: "manual-save" as const,
        wordCount: 280,
        createdAt: NOW + 1000,
        contentHash: "hash2",
        contentJson: JSON.stringify({ type: "doc", content: [] }),
        contentMd: "# 第三章\n\n北地的风掠过山谷，把草原残存的暖意吹成一声轻而冷的叹息。",
        contentText: "北地的风掠过山谷，把草原残存的暖意吹成一声轻而冷的叹息。",
        parentSnapshotId: "v1",
      },
    }),
    rollbackSnapshot: async () => ({ ok: true, data: { restored: true, preRollbackVersionId: "pre-v", rollbackVersionId: "roll-v" } }),
    restoreSnapshot: async () => ({ ok: true, data: { restored: true } }),
    ...overrides,
  };
}

const meta: Meta<typeof VersionHistoryPanel> = {
  title: "VersionHistory/VersionHistoryPanel",
  component: VersionHistoryPanel,
  parameters: {
    layout: "padded",
  },
};

export default meta;

type Story = StoryObj<typeof VersionHistoryPanel>;

export const WithSnapshots: Story = {
  args: {
    documentId: "doc-demo",
    projectId: "project-demo",
    versionApi: createMockVersionApi(),
    onRestored: () => undefined,
  },
};

export const Empty: Story = {
  args: {
    documentId: "doc-demo",
    projectId: "project-demo",
    versionApi: {
      ...createMockVersionApi(),
      listSnapshots: async () => ({ ok: true, data: { items: [] } }),
    },
    onRestored: () => undefined,
  },
};

export const LoadError: Story = {
  args: {
    documentId: "doc-demo",
    projectId: "project-demo",
    versionApi: {
      ...createMockVersionApi(),
      listSnapshots: async () => ({
        ok: false as const,
        error: { code: "NOT_FOUND", message: "文档不存在", retryable: false },
      }),
    },
    onRestored: () => undefined,
  },
};
