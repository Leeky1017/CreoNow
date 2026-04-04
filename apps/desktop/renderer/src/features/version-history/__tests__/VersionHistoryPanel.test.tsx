import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VersionHistoryPanel } from "@/features/version-history/VersionHistoryPanel";

const items = [
  {
    versionId: "snapshot-2",
    actor: "ai" as const,
    reason: "rollback" as const,
    contentHash: "hash-2",
    createdAt: 2,
    parentSnapshotId: "snapshot-1",
    wordCount: 12,
  },
  {
    versionId: "snapshot-1",
    actor: "user" as const,
    reason: "manual-save" as const,
    contentHash: "hash-1",
    createdAt: 1,
    parentSnapshotId: null,
    wordCount: 9,
  },
];

describe("VersionHistoryPanel", () => {
  it("renders timeline items and routes selection and refresh actions", () => {
    const onRefresh = vi.fn();
    const onSelectVersion = vi.fn();

    render(
      <VersionHistoryPanel
        errorMessage={null}
        items={items}
        onRefresh={onRefresh}
        onSelectVersion={onSelectVersion}
        previewStatus="ready"
        selectedSnapshot={{
          versionId: "snapshot-2",
          documentId: "doc-1",
          projectId: "project-1",
          actor: "ai",
          reason: "rollback",
          contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "回退后的版本" }] }] }),
          contentText: "回退后的版本",
          contentMd: "回退后的版本",
          contentHash: "hash-2",
          wordCount: 12,
          parentSnapshotId: "snapshot-1",
          createdAt: 2,
        }}
        selectedVersionId="snapshot-2"
        status="ready"
      />,
    );

    expect(screen.getByText("回退后的版本")).toBeInTheDocument();
    expect(screen.getByText("历史版本")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /手动保存/ }));
    expect(onSelectVersion).toHaveBeenCalledWith("snapshot-1");

    fireEvent.click(screen.getByRole("button", { name: /刷新历史/ }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
