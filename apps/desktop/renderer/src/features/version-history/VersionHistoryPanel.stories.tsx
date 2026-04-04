import type { Meta, StoryObj } from "@storybook/react";

import { VersionHistoryPanel, type SnapshotDetail } from "@/features/version-history/VersionHistoryPanel";
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
  buildSnapshot({ versionId: "v4", actor: "ai", reason: "ai-accept", createdAt: NOW + 7200_000, wordCount: 410, parentSnapshotId: "v3" }),
  buildSnapshot({ versionId: "v3", actor: "auto", reason: "pre-write", createdAt: NOW + 3600_000, wordCount: 320, parentSnapshotId: "v2" }),
  buildSnapshot({ versionId: "v2", actor: "user", reason: "manual-save", createdAt: NOW + 1800_000, wordCount: 280, parentSnapshotId: "v1" }),
  buildSnapshot({ versionId: "v1", actor: "user", reason: "manual-save", createdAt: NOW, wordCount: 150, parentSnapshotId: null }),
];

const previewDetail: SnapshotDetail = {
  versionId: "v2",
  documentId: "doc-demo",
  projectId: "project-demo",
  actor: "user",
  reason: "manual-save",
  wordCount: 280,
  createdAt: NOW + 1800_000,
  contentHash: "hash2",
  contentJson: JSON.stringify({ type: "doc", content: [] }),
  contentMd: "# 第三章\n\n北地的风掠过山谷，把草原残存的暖意吹成一声轻而冷的叹息。",
  contentText: "北地的风掠过山谷，把草原残存的暖意吹成一声轻而冷的叹息。",
  parentSnapshotId: "v1",
};

function createMockVersionApi(overrides: Partial<PreloadApi["version"]> = {}): PreloadApi["version"] {
  return {
    listSnapshots: async () => ({ ok: true, data: { items: snapshotItems } }),
    readSnapshot: async () => ({
      ok: true,
      data: previewDetail,
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
  argTypes: {
    activePreviewVersionId: { control: "text" },
    onPreviewVersion: { action: "onPreviewVersion" },
  },
};

export default meta;

type Story = StoryObj<typeof VersionHistoryPanel>;

/** Default state: multiple snapshots with actor icons and word count deltas visible */
export const WithSnapshots: Story = {
  args: {
    documentId: "doc-demo",
    projectId: "project-demo",
    versionApi: createMockVersionApi(),
    activePreviewVersionId: null,
    onPreviewVersion: () => undefined,
  },
};

/** Shows the active preview highlight on v2 */
export const WithActivePreview: Story = {
  args: {
    documentId: "doc-demo",
    projectId: "project-demo",
    versionApi: createMockVersionApi(),
    activePreviewVersionId: "v2",
    onPreviewVersion: () => undefined,
  },
};

/** Single snapshot — oldest item always gets ±0 word count delta */
export const SingleSnapshot: Story = {
  args: {
    documentId: "doc-demo",
    projectId: "project-demo",
    versionApi: {
      ...createMockVersionApi(),
      listSnapshots: async () => ({
        ok: true,
        data: {
          items: [buildSnapshot({ versionId: "v1", actor: "user", reason: "manual-save", wordCount: 320, parentSnapshotId: null })],
        },
      }),
    },
    activePreviewVersionId: null,
    onPreviewVersion: () => undefined,
  },
};

/** Empty state */
export const Empty: Story = {
  args: {
    documentId: "doc-demo",
    projectId: "project-demo",
    versionApi: {
      ...createMockVersionApi(),
      listSnapshots: async () => ({ ok: true, data: { items: [] } }),
    },
    activePreviewVersionId: null,
    onPreviewVersion: () => undefined,
  },
};

/** Loading state (never resolves) */
export const Loading: Story = {
  args: {
    documentId: "doc-demo",
    projectId: "project-demo",
    versionApi: {
      ...createMockVersionApi(),
      listSnapshots: () => new Promise(() => undefined),
    },
    activePreviewVersionId: null,
    onPreviewVersion: () => undefined,
  },
};

/** Error state */
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
    activePreviewVersionId: null,
    onPreviewVersion: () => undefined,
  },
};
