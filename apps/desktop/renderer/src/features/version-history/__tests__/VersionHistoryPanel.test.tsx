import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IpcErrorCode } from "@shared/types/ipc-generated";
import type { PreloadApi } from "@/lib/preloadApi";
import { VersionHistoryPanel, type SnapshotDetail } from "@/features/version-history/VersionHistoryPanel";

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
    wordCount: 100,
    createdAt: 1_700_000_000_000,
    contentHash: "hash1",
    parentSnapshotId: null,
    ...overrides,
  };
}

function buildSnapshotDetail(overrides: Partial<SnapshotDetail> = {}): SnapshotDetail {
  return {
    versionId: "v1",
    documentId: "doc-1",
    projectId: "project-1",
    actor: "user" as const,
    reason: "manual-save" as const,
    wordCount: 100,
    createdAt: 1_700_000_001_000,
    contentHash: "hash1",
    contentJson: JSON.stringify({ type: "doc", content: [] }),
    contentMd: "# 内容",
    contentText: "内容",
    parentSnapshotId: null,
    ...overrides,
  };
}

function createVersionApiMock(overrides: Partial<PreloadApi["version"]> = {}): PreloadApi["version"] {
  return {
    listSnapshots: vi.fn(async () => ({
      ok: true as const,
      data: {
        items: [
          buildSnapshot({ versionId: "v2", actor: "ai", reason: "ai-accept", createdAt: 1_700_000_002_000, wordCount: 150, parentSnapshotId: "v1" }),
          buildSnapshot({ versionId: "v1", actor: "user", reason: "manual-save", createdAt: 1_700_000_001_000, wordCount: 100, parentSnapshotId: null }),
        ],
      },
    })),
    readSnapshot: vi.fn(async ({ versionId }) => ({
      ok: true as const,
      data: buildSnapshotDetail({ versionId }),
    })),
    rollbackSnapshot: vi.fn(async () => ({
      ok: true as const,
      data: { restored: true as const, preRollbackVersionId: "pre-v", rollbackVersionId: "roll-v" },
    })),
    restoreSnapshot: vi.fn(async () => ({
      ok: true as const,
      data: { restored: true as const },
    })),
    ...overrides,
  };
}

describe("VersionHistoryPanel", () => {
  let versionApi: PreloadApi["version"];
  let onPreviewVersion: (snapshot: SnapshotDetail) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    versionApi = createVersionApiMock();
    onPreviewVersion = vi.fn();
  });

  it("loads and renders a timeline of snapshots on mount", async () => {
    render(
      <VersionHistoryPanel
        documentId="doc-1"
        projectId="project-1"
        versionApi={versionApi}
        activePreviewVersionId={null}
        onPreviewVersion={onPreviewVersion}
      />,
    );

    await waitFor(() => {
      expect(versionApi.listSnapshots).toHaveBeenCalledWith({
        documentId: "doc-1",
        projectId: "project-1",
      });
    });

    // Both snapshots should be rendered in the timeline
    const previewButtons = await screen.findAllByRole("button");
    expect(previewButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("shows actor icons for user, auto, and ai snapshots", async () => {
    const apiWithAllActors = createVersionApiMock({
      listSnapshots: vi.fn(async () => ({
        ok: true as const,
        data: {
          items: [
            buildSnapshot({ versionId: "v3", actor: "ai", reason: "ai-accept", createdAt: 1_700_000_003_000, wordCount: 200, parentSnapshotId: "v2" }),
            buildSnapshot({ versionId: "v2", actor: "auto", reason: "autosave", createdAt: 1_700_000_002_000, wordCount: 150, parentSnapshotId: "v1" }),
            buildSnapshot({ versionId: "v1", actor: "user", reason: "manual-save", createdAt: 1_700_000_001_000, wordCount: 100, parentSnapshotId: null }),
          ],
        },
      })),
    });

    render(
      <VersionHistoryPanel
        documentId="doc-1"
        projectId="project-1"
        versionApi={apiWithAllActors}
        activePreviewVersionId={null}
        onPreviewVersion={onPreviewVersion}
      />,
    );

    // All three actor labels should be rendered
    expect(await screen.findByText("AI")).toBeInTheDocument();
    expect(screen.getByText("自动")).toBeInTheDocument();
    expect(screen.getByText("用户")).toBeInTheDocument();
  });

  it("shows positive word count delta (+N) for the newest snapshot", async () => {
    // v2 has wordCount=150, v1 has wordCount=100 → delta should be +50
    render(
      <VersionHistoryPanel
        documentId="doc-1"
        projectId="project-1"
        versionApi={versionApi}
        activePreviewVersionId={null}
        onPreviewVersion={onPreviewVersion}
      />,
    );

    expect(await screen.findByText("+50")).toBeInTheDocument();
  });

  it("shows no delta (±0 or neutral) for the oldest snapshot in the list", async () => {
    // The last item in a 2-item list has delta=null → rendered as ±0
    render(
      <VersionHistoryPanel
        documentId="doc-1"
        projectId="project-1"
        versionApi={versionApi}
        activePreviewVersionId={null}
        onPreviewVersion={onPreviewVersion}
      />,
    );

    expect(await screen.findByText("±0")).toBeInTheDocument();
  });

  it("calls readSnapshot and then onPreviewVersion when a preview button is clicked", async () => {
    render(
      <VersionHistoryPanel
        documentId="doc-1"
        projectId="project-1"
        versionApi={versionApi}
        activePreviewVersionId={null}
        onPreviewVersion={onPreviewVersion}
      />,
    );

    const previewButtons = await screen.findAllByRole("button");
    await act(async () => {
      fireEvent.click(previewButtons[0]);
    });

    await waitFor(() => {
      expect(versionApi.readSnapshot).toHaveBeenCalledWith(expect.objectContaining({
        documentId: "doc-1",
        projectId: "project-1",
      }));
      expect(onPreviewVersion).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: "doc-1" }),
      );
    });
  });

  it("marks the active preview item with aria-current when activePreviewVersionId is set", async () => {
    render(
      <VersionHistoryPanel
        documentId="doc-1"
        projectId="project-1"
        versionApi={versionApi}
        activePreviewVersionId="v2"
        onPreviewVersion={onPreviewVersion}
      />,
    );

    await screen.findAllByRole("button");

    const activeItem = document.querySelector('[aria-current="true"]');
    expect(activeItem).not.toBeNull();
  });

  it("shows an empty-state message when there are no snapshots", async () => {
    const emptyApi = createVersionApiMock({
      listSnapshots: vi.fn(async () => ({
        ok: true as const,
        data: { items: [] },
      })),
    });

    render(
      <VersionHistoryPanel
        documentId="doc-1"
        projectId="project-1"
        versionApi={emptyApi}
        activePreviewVersionId={null}
        onPreviewVersion={onPreviewVersion}
      />,
    );

    expect(await screen.findByText(/尚未生成快照/i)).toBeInTheDocument();
  });

  it("surfaces an error message when listSnapshots fails", async () => {
    const errorApi = createVersionApiMock({
      listSnapshots: vi.fn(async () => ({
        ok: false as const,
        error: { code: "NOT_FOUND" as IpcErrorCode, message: "文档不存在", retryable: false },
      })),
    });

    render(
      <VersionHistoryPanel
        documentId="doc-1"
        projectId="project-1"
        versionApi={errorApi}
        activePreviewVersionId={null}
        onPreviewVersion={onPreviewVersion}
      />,
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
