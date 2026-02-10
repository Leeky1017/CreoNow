import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { FileTreePanel } from "./FileTreePanel";

type DocType = "chapter" | "note" | "setting" | "timeline" | "character";
type DocStatus = "draft" | "final";

type FileItem = {
  documentId: string;
  title: string;
  updatedAt: number;
  type: DocType;
  status: DocStatus;
  sortOrder: number;
  parentId?: string;
};

const createAndSetCurrent = vi.fn();
const rename = vi.fn();
const updateStatus = vi.fn();
const deleteDoc = vi.fn();
const setCurrent = vi.fn();
const clearError = vi.fn();
const moveToFolder = vi.fn();
const openDocument = vi.fn();
const openCurrentDocumentForProject = vi.fn();

let fileItems: FileItem[] = [];

vi.mock("../../stores/fileStore", () => ({
  useFileStore: vi.fn((selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      items: fileItems,
      currentDocumentId: fileItems[0]?.documentId ?? null,
      bootstrapStatus: "ready",
      lastError: null,
      createAndSetCurrent,
      rename,
      updateStatus,
      delete: deleteDoc,
      setCurrent,
      clearError,
      moveToFolder,
    }),
  ),
}));

vi.mock("../../stores/editorStore", () => ({
  useEditorStore: vi.fn(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        openDocument,
        openCurrentDocumentForProject,
      }),
  ),
}));

describe("FileTreePanel context menu actions", () => {
  beforeEach(() => {
    fileItems = [
      {
        documentId: "doc-1",
        title: "未命名章节",
        updatedAt: Date.now(),
        type: "chapter",
        status: "draft",
        sortOrder: 0,
      },
      {
        documentId: "folder-1",
        title: "第一卷",
        updatedAt: Date.now(),
        type: "chapter",
        status: "draft",
        sortOrder: 1,
      },
    ];

    createAndSetCurrent.mockReset().mockResolvedValue({
      ok: true,
      data: { documentId: "doc-copy" },
    });
    rename.mockReset().mockResolvedValue({ ok: true });
    updateStatus.mockReset().mockResolvedValue({
      ok: true,
      data: { updated: true, status: "final" },
    });
    deleteDoc.mockReset().mockResolvedValue({ ok: true });
    setCurrent.mockReset().mockResolvedValue({ ok: true });
    clearError.mockReset();
    moveToFolder
      .mockReset()
      .mockResolvedValue({ ok: true, data: { updated: true } });
    openDocument.mockReset().mockResolvedValue({ ok: true });
    openCurrentDocumentForProject.mockReset().mockResolvedValue({ ok: true });
  });

  it("should show rename/delete/copy/move/status actions and invoke corresponding operations", async () => {
    render(<FileTreePanel projectId="proj-1" />);

    fireEvent.contextMenu(screen.getByTestId("file-row-doc-1"));

    const renameItem = await screen.findByRole("menuitem", { name: "Rename" });
    const deleteItem = await screen.findByRole("menuitem", { name: "Delete" });
    const copyItem = await screen.findByRole("menuitem", { name: "Copy" });
    const moveItem = await screen.findByRole("menuitem", {
      name: "Move to Folder",
    });
    const historyItem = await screen.findByRole("menuitem", {
      name: "Version History",
    });
    const statusItem = await screen.findByRole("menuitem", {
      name: "Mark as Final",
    });

    expect(renameItem).toBeInTheDocument();
    expect(deleteItem).toBeInTheDocument();
    expect(copyItem).toBeInTheDocument();
    expect(moveItem).toBeInTheDocument();
    expect(historyItem).toBeInTheDocument();
    expect(statusItem).toBeInTheDocument();

    fireEvent.click(copyItem);
    expect(createAndSetCurrent).toHaveBeenCalledWith({
      projectId: "proj-1",
      type: "chapter",
      title: "未命名章节 Copy",
    });

    fireEvent.contextMenu(screen.getByTestId("file-row-doc-1"));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Move to Folder" }),
    );

    expect(moveToFolder).toHaveBeenCalledWith({
      projectId: "proj-1",
      documentId: "doc-1",
      parentId: "folder-1",
    });
  });
});
