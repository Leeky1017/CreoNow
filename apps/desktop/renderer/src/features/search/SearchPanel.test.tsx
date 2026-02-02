import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchPanel } from "./SearchPanel";

// Mock stores
vi.mock("../../stores/searchStore", () => ({
  useSearchStore: vi.fn((selector) => {
    const state = {
      query: "",
      items: [],
      status: "idle" as const,
      lastError: null,
      setQuery: vi.fn(),
      runFulltext: vi.fn().mockResolvedValue({ ok: true }),
      clearResults: vi.fn(),
      clearError: vi.fn(),
    };
    return selector(state);
  }),
}));

vi.mock("../../stores/fileStore", () => ({
  useFileStore: vi.fn((selector) => {
    const state = {
      setCurrent: vi.fn().mockResolvedValue({ ok: true }),
    };
    return selector(state);
  }),
}));

describe("SearchPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 SearchPanel 组件", () => {
      render(<SearchPanel projectId="test-project" />);

      const panel = screen.getByTestId("search-panel");
      expect(panel).toBeInTheDocument();
    });

    it("应该显示 Search 标题", () => {
      render(<SearchPanel projectId="test-project" />);

      expect(screen.getByText("Search")).toBeInTheDocument();
    });

    it("应该显示搜索输入框", () => {
      render(<SearchPanel projectId="test-project" />);

      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    it("应该显示 Go 按钮", () => {
      render(<SearchPanel projectId="test-project" />);

      expect(screen.getByTestId("search-run")).toBeInTheDocument();
      expect(screen.getByText("Go")).toBeInTheDocument();
    });

    it("应该显示状态", () => {
      render(<SearchPanel projectId="test-project" />);

      expect(screen.getByText("idle")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 空结果测试
  // ===========================================================================
  describe("空结果", () => {
    it("无结果时应显示空状态", () => {
      render(<SearchPanel projectId="test-project" />);

      expect(screen.getByText("(no results)")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 搜索结果测试
  // ===========================================================================
  describe("搜索结果", () => {
    it("有结果时应显示结果列表", async () => {
      const { useSearchStore } = await import("../../stores/searchStore");
      vi.mocked(useSearchStore).mockImplementation((selector) => {
        const state = {
          query: "test",
          items: [
            {
              documentId: "doc-1",
              title: "Document 1",
              snippet: "...test content...",
              score: 0.9,
            },
            {
              documentId: "doc-2",
              title: "Document 2",
              snippet: "...more test...",
              score: 0.8,
            },
          ],
          status: "idle" as const,
          lastError: null,
          setQuery: vi.fn(),
          runFulltext: vi.fn(),
          clearResults: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<SearchPanel projectId="test-project" />);

      expect(screen.getByText("Document 1")).toBeInTheDocument();
      expect(screen.getByText("Document 2")).toBeInTheDocument();
      expect(screen.getByText("...test content...")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 交互测试
  // ===========================================================================
  describe("交互", () => {
    it("输入应调用 setQuery", async () => {
      const { useSearchStore } = await import("../../stores/searchStore");
      const setQuery = vi.fn();
      vi.mocked(useSearchStore).mockImplementation((selector) => {
        const state = {
          query: "",
          items: [],
          status: "idle" as const,
          lastError: null,
          setQuery,
          runFulltext: vi.fn(),
          clearResults: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<SearchPanel projectId="test-project" />);

      const input = screen.getByTestId("search-input");
      fireEvent.change(input, { target: { value: "search query" } });

      expect(setQuery).toHaveBeenCalledWith("search query");
    });

    it("提交表单应调用 runFulltext", async () => {
      const { useSearchStore } = await import("../../stores/searchStore");
      const runFulltext = vi.fn().mockResolvedValue({ ok: true });
      vi.mocked(useSearchStore).mockImplementation((selector) => {
        const state = {
          query: "test",
          items: [],
          status: "idle" as const,
          lastError: null,
          setQuery: vi.fn(),
          runFulltext,
          clearResults: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<SearchPanel projectId="test-project" />);

      const button = screen.getByTestId("search-run");
      fireEvent.click(button);

      expect(runFulltext).toHaveBeenCalledWith({
        projectId: "test-project",
        limit: 20,
      });
    });
  });

  // ===========================================================================
  // 加载状态测试
  // ===========================================================================
  describe("加载状态", () => {
    it("loading 状态时 Go 按钮应禁用", async () => {
      const { useSearchStore } = await import("../../stores/searchStore");
      vi.mocked(useSearchStore).mockImplementation((selector) => {
        const state = {
          query: "",
          items: [],
          status: "loading" as const,
          lastError: null,
          setQuery: vi.fn(),
          runFulltext: vi.fn(),
          clearResults: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<SearchPanel projectId="test-project" />);

      const button = screen.getByTestId("search-run");
      expect(button).toBeDisabled();
    });
  });

  // ===========================================================================
  // 错误状态测试
  // ===========================================================================
  describe("错误状态", () => {
    it("有错误时应显示错误信息", async () => {
      const { useSearchStore } = await import("../../stores/searchStore");
      vi.mocked(useSearchStore).mockImplementation((selector) => {
        const state = {
          query: "",
          items: [],
          status: "idle" as const,
          lastError: { code: "IO_ERROR" as const, message: "Search failed" },
          setQuery: vi.fn(),
          runFulltext: vi.fn(),
          clearResults: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<SearchPanel projectId="test-project" />);

      expect(screen.getByTestId("search-error-code")).toBeInTheDocument();
      expect(screen.getByText("IO_ERROR")).toBeInTheDocument();
      expect(screen.getByText("Search failed")).toBeInTheDocument();
    });

    it("应显示 Dismiss 按钮", async () => {
      const { useSearchStore } = await import("../../stores/searchStore");
      vi.mocked(useSearchStore).mockImplementation((selector) => {
        const state = {
          query: "",
          items: [],
          status: "idle" as const,
          lastError: { code: "IO_ERROR" as const, message: "Search failed" },
          setQuery: vi.fn(),
          runFulltext: vi.fn(),
          clearResults: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<SearchPanel projectId="test-project" />);

      expect(screen.getByText("Dismiss")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 样式测试
  // ===========================================================================
  describe("样式", () => {
    it("应该是 section 元素", () => {
      render(<SearchPanel projectId="test-project" />);

      const panel = screen.getByTestId("search-panel");
      expect(panel.tagName).toBe("SECTION");
    });

    it("应该有 flex column 布局", () => {
      render(<SearchPanel projectId="test-project" />);

      const panel = screen.getByTestId("search-panel");
      expect(panel).toHaveClass("flex");
      expect(panel).toHaveClass("flex-col");
    });
  });
});
