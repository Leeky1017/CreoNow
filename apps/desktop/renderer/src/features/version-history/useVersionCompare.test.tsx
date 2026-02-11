import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useVersionCompare } from "./useVersionCompare";

const invokeMock = vi.hoisted(() => vi.fn());
const editorState = vi.hoisted(() => ({
  setCompareMode: vi.fn(),
  editor: {
    getText: vi.fn(() => "current document body"),
  },
  documentId: "doc-1",
}));

vi.mock("../../lib/ipcClient", () => ({
  invoke: invokeMock,
}));

vi.mock("../../stores/editorStore", () => ({
  useEditorStore: vi.fn((selector: (state: typeof editorState) => unknown) =>
    selector(editorState),
  ),
}));

describe("useVersionCompare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call version:snapshot:diff when comparing historical version with current version", async () => {
    invokeMock.mockResolvedValue({
      ok: true,
      data: {
        diffText: "@@ -1,1 +1,1 @@\n-old line\n+new line\n",
        hasDifferences: true,
        stats: { addedLines: 1, removedLines: 1, changedHunks: 1 },
        aiMarked: false,
      },
    });

    const { result } = renderHook(() => useVersionCompare());

    await act(async () => {
      await result.current.startCompare("doc-1", "v-1");
    });

    expect(editorState.setCompareMode).toHaveBeenCalledWith(true, "v-1");
    expect(invokeMock).toHaveBeenCalledWith("version:snapshot:diff", {
      documentId: "doc-1",
      baseVersionId: "v-1",
    });
    expect(result.current.compareState.status).toBe("ready");
    expect(result.current.compareState.diffText).toContain("@@ -1,1 +1,1 @@");
  });

  it("should show no differences hint when version:snapshot:diff returns identical content", async () => {
    invokeMock.mockResolvedValue({
      ok: true,
      data: {
        diffText: "",
        hasDifferences: false,
        stats: { addedLines: 0, removedLines: 0, changedHunks: 0 },
        aiMarked: false,
      },
    });

    const { result } = renderHook(() => useVersionCompare());

    await act(async () => {
      await result.current.startCompare("doc-1", "v-same");
    });

    expect(invokeMock).toHaveBeenCalledWith("version:snapshot:diff", {
      documentId: "doc-1",
      baseVersionId: "v-same",
    });
    expect(result.current.compareState.status).toBe("ready");
    expect(result.current.compareState.diffText).toBe("No differences found.");
  });
});
