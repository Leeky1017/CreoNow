// @ts-nocheck - Mock types are intentionally incomplete for testing
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileTreePanel } from "./FileTreePanel";

// Mock stores
vi.mock("../../stores/fileStore", () => ({
  useFileStore: vi.fn((selector) => {
    const state = {
      items: [],
      currentDocumentId: null,
      bootstrapStatus: "ready" as const,
      lastError: null,
      createAndSetCurrent: vi.fn().mockResolvedValue({ ok: true, data: { documentId: "new-doc" } }),
      rename: vi.fn().mockResolvedValue({ ok: true }),
      delete: vi.fn().mockResolvedValue({ ok: true }),
      setCurrent: vi.fn().mockResolvedValue({ ok: true }),
      clearError: vi.fn(),
    };
    return selector(state);
  }),
}));

vi.mock("../../stores/editorStore", () => ({
  useEditorStore: vi.fn((selector) => {
    const state = {
      openDocument: vi.fn().mockResolvedValue({ ok: true }),
      openCurrentDocumentForProject: vi.fn().mockResolvedValue({ ok: true }),
    };
    return selector(state);
  }),
}));

describe("FileTreePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 FileTreePanel 组件", () => {
      render(<FileTreePanel projectId="test-project" />);

      const panel = screen.getByTestId("sidebar-files");
      expect(panel).toBeInTheDocument();
    });

    it("应该显示 Files 标题", () => {
      render(<FileTreePanel projectId="test-project" />);

      expect(screen.getByText("Files")).toBeInTheDocument();
    });

    it("应该显示 New 按钮", () => {
      render(<FileTreePanel projectId="test-project" />);

      expect(screen.getByTestId("file-create")).toBeInTheDocument();
      expect(screen.getByText("New")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 空状态测试
  // ===========================================================================
  describe("空状态", () => {
    it("当无文档时应显示空状态提示", () => {
      render(<FileTreePanel projectId="test-project" />);

      expect(screen.getByText("No documents yet.")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 加载状态测试
  // ===========================================================================
  describe("加载状态", () => {
    it("bootstrapStatus 为 loading 时应显示加载提示", async () => {
      const { useFileStore } = await import("../../stores/fileStore");
      vi.mocked(useFileStore).mockImplementation((selector) => {
        const state = {
          items: [],
          currentDocumentId: null,
          bootstrapStatus: "loading" as const,
          lastError: null,
          createAndSetCurrent: vi.fn(),
          rename: vi.fn(),
          delete: vi.fn(),
          setCurrent: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<FileTreePanel projectId="test-project" />);

      expect(screen.getByText("Loading files…")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 错误状态测试
  // ===========================================================================
  describe("错误状态", () => {
    it("有错误时应显示错误信息", async () => {
      const { useFileStore } = await import("../../stores/fileStore");
      vi.mocked(useFileStore).mockImplementation((selector) => {
        const state = {
          items: [],
          currentDocumentId: null,
          bootstrapStatus: "ready" as const,
          lastError: { code: "LOAD_FAILED", message: "Failed to load files" },
          createAndSetCurrent: vi.fn(),
          rename: vi.fn(),
          delete: vi.fn(),
          setCurrent: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<FileTreePanel projectId="test-project" />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/LOAD_FAILED/)).toBeInTheDocument();
      expect(screen.getByText("Dismiss")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 文档列表测试
  // ===========================================================================
  describe("文档列表", () => {
    it("应该渲染文档列表项", async () => {
      const { useFileStore } = await import("../../stores/fileStore");
      vi.mocked(useFileStore).mockImplementation((selector) => {
        const state = {
          items: [
            { documentId: "doc-1", title: "Document 1" },
            { documentId: "doc-2", title: "Document 2" },
          ],
          currentDocumentId: "doc-1",
          bootstrapStatus: "ready" as const,
          lastError: null,
          createAndSetCurrent: vi.fn(),
          rename: vi.fn(),
          delete: vi.fn(),
          setCurrent: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<FileTreePanel projectId="test-project" />);

      expect(screen.getByTestId("file-row-doc-1")).toBeInTheDocument();
      expect(screen.getByTestId("file-row-doc-2")).toBeInTheDocument();
      expect(screen.getByText("Document 1")).toBeInTheDocument();
      expect(screen.getByText("Document 2")).toBeInTheDocument();
    });

    it("选中项应有 aria-selected 属性", async () => {
      const { useFileStore } = await import("../../stores/fileStore");
      vi.mocked(useFileStore).mockImplementation((selector) => {
        const state = {
          items: [
            { documentId: "doc-1", title: "Document 1" },
            { documentId: "doc-2", title: "Document 2" },
          ],
          currentDocumentId: "doc-1",
          bootstrapStatus: "ready" as const,
          lastError: null,
          createAndSetCurrent: vi.fn(),
          rename: vi.fn(),
          delete: vi.fn(),
          setCurrent: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<FileTreePanel projectId="test-project" />);

      const selectedItem = screen.getByTestId("file-row-doc-1");
      expect(selectedItem).toHaveAttribute("aria-selected", "true");
    });

    it("每个文档应显示 Rename 和 Delete 按钮", async () => {
      const { useFileStore } = await import("../../stores/fileStore");
      vi.mocked(useFileStore).mockImplementation((selector) => {
        const state = {
          items: [{ documentId: "doc-1", title: "Document 1" }],
          currentDocumentId: null,
          bootstrapStatus: "ready" as const,
          lastError: null,
          createAndSetCurrent: vi.fn(),
          rename: vi.fn(),
          delete: vi.fn(),
          setCurrent: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<FileTreePanel projectId="test-project" />);

      expect(screen.getByTestId("file-rename-doc-1")).toBeInTheDocument();
      expect(screen.getByTestId("file-delete-doc-1")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 样式测试
  // ===========================================================================
  describe("样式", () => {
    it("应该有 flex column 布局", () => {
      render(<FileTreePanel projectId="test-project" />);

      const panel = screen.getByTestId("sidebar-files");
      expect(panel).toHaveClass("flex");
      expect(panel).toHaveClass("flex-col");
    });
  });
});
