import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IpcErrorCode } from "@shared/types/ipc-generated";
import type { PreloadApi } from "@/lib/preloadApi";
import { VersionHistoryPanel } from "@/features/version-history/VersionHistoryPanel";

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

function createVersionApiMock(overrides: Partial<PreloadApi["version"]> = {}): PreloadApi["version"] {
  return {
    listSnapshots: vi.fn(async () => ({
      ok: true as const,
      data: {
        items: [
          buildSnapshot({ versionId: "v2", actor: "ai", reason: "ai-accept", createdAt: 1_700_000_002_000, parentSnapshotId: "v1" }),
          buildSnapshot({ versionId: "v1", actor: "user", reason: "manual-save", createdAt: 1_700_000_001_000, parentSnapshotId: null }),
        ],
      },
    })),
    readSnapshot: vi.fn(async ({ versionId }) => ({
      ok: true as const,
      data: {
        versionId,
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
      },
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
  const onRestored = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    versionApi = createVersionApiMock();
    onRestored.mockReset();
  });

  it("loads and renders a timeline of snapshots on mount", async () => {
    render(
      <VersionHistoryPanel
        documentId="doc-1"
        projectId="project-1"
        versionApi={versionApi}
        onRestored={onRestored}
      />,
    );

    await waitFor(() => {
      expect(versionApi.listSnapshots).toHaveBeenCalledWith({
        documentId: "doc-1",
        projectId: "project-1",
      });
    });

    // Both snapshots should be rendered in the timeline
    expect(await screen.findAllByRole("button", { name: /预览/i })).toHaveLength(2);
  });

  it("previews a snapshot when the preview button is clicked", async () => {
    render(
      <VersionHistoryPanel
        documentId="doc-1"
        projectId="project-1"
        versionApi={versionApi}
        onRestored={onRestored}
      />,
    );

    const previewButtons = await screen.findAllByRole("button", { name: /预览/i });
    await act(async () => {
      fireEvent.click(previewButtons[0]);
    });

    await waitFor(() => {
      expect(versionApi.readSnapshot).toHaveBeenCalledWith(expect.objectContaining({
        documentId: "doc-1",
        projectId: "project-1",
      }));
    });

    // Preview content should be visible
    expect(await screen.findByRole("region", { name: /版本预览/i })).toBeInTheDocument();
  });

  it("shows a back-to-current button after previewing, and hides the preview on click", async () => {
    render(
      <VersionHistoryPanel
        documentId="doc-1"
        projectId="project-1"
        versionApi={versionApi}
        onRestored={onRestored}
      />,
    );

    const previewButtons = await screen.findAllByRole("button", { name: /预览/i });
    await act(async () => {
      fireEvent.click(previewButtons[0]);
    });

    const backButton = await screen.findByRole("button", { name: /返回当前版本/i });
    await act(async () => {
      fireEvent.click(backButton);
    });

    expect(screen.queryByRole("region", { name: /版本预览/i })).toBeNull();
  });

  it("calls restoreSnapshot and invokes onRestored callback on restore click", async () => {
    render(
      <VersionHistoryPanel
        documentId="doc-1"
        projectId="project-1"
        versionApi={versionApi}
        onRestored={onRestored}
      />,
    );

    const previewButtons = await screen.findAllByRole("button", { name: /预览/i });
    await act(async () => {
      fireEvent.click(previewButtons[0]);
    });

    const restoreButton = await screen.findByRole("button", { name: /恢复此版本/i });
    await act(async () => {
      fireEvent.click(restoreButton);
    });

    await waitFor(() => {
      expect(versionApi.restoreSnapshot).toHaveBeenCalled();
      expect(onRestored).toHaveBeenCalledTimes(1);
    });
  });

  it("calls rollbackSnapshot on rollback button click", async () => {
    render(
      <VersionHistoryPanel
        documentId="doc-1"
        projectId="project-1"
        versionApi={versionApi}
        onRestored={onRestored}
      />,
    );

    const previewButtons = await screen.findAllByRole("button", { name: /预览/i });
    await act(async () => {
      fireEvent.click(previewButtons[0]);
    });

    const rollbackButton = await screen.findByRole("button", { name: /安全回滚/i });
    await act(async () => {
      fireEvent.click(rollbackButton);
    });

    await waitFor(() => {
      expect(versionApi.rollbackSnapshot).toHaveBeenCalled();
      expect(onRestored).toHaveBeenCalledTimes(1);
    });
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
        onRestored={onRestored}
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
        onRestored={onRestored}
      />,
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
