import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateProjectDialog } from "./CreateProjectDialog";

// Mock stores
vi.mock("../../stores/projectStore", () => ({
  useProjectStore: vi.fn((selector) => {
    const state = {
      current: null,
      items: [],
      bootstrapStatus: "ready" as const,
      lastError: null,
      bootstrap: vi.fn(),
      createAndSetCurrent: vi.fn().mockResolvedValue({ ok: true, data: { projectId: "new-project" } }),
      setCurrent: vi.fn(),
      clearError: vi.fn(),
    };
    return selector(state);
  }),
}));

describe("CreateProjectDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("open 为 true 时应该渲染对话框", () => {
      render(<CreateProjectDialog open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByTestId("create-project-dialog")).toBeInTheDocument();
    });

    it("应该显示 Create project 标题", () => {
      render(<CreateProjectDialog open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText("Create project")).toBeInTheDocument();
    });

    it("应该显示名称输入框", () => {
      render(<CreateProjectDialog open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByTestId("create-project-name")).toBeInTheDocument();
    });

    it("应该显示 Create 按钮", () => {
      render(<CreateProjectDialog open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByTestId("create-project-submit")).toBeInTheDocument();
      expect(screen.getByText("Create")).toBeInTheDocument();
    });

    it("应该显示 Cancel 按钮", () => {
      render(<CreateProjectDialog open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 表单测试
  // ===========================================================================
  describe("表单", () => {
    it("名称输入框应有 placeholder", () => {
      render(<CreateProjectDialog open={true} onOpenChange={vi.fn()} />);

      const input = screen.getByTestId("create-project-name");
      expect(input).toHaveAttribute("placeholder", "Untitled");
    });

    it("输入应更新值", () => {
      render(<CreateProjectDialog open={true} onOpenChange={vi.fn()} />);

      const input = screen.getByTestId("create-project-name");
      fireEvent.change(input, { target: { value: "My Project" } });

      expect(input).toHaveValue("My Project");
    });

    it("名称输入框应有 autoFocus", () => {
      render(<CreateProjectDialog open={true} onOpenChange={vi.fn()} />);

      const input = screen.getByTestId("create-project-name");
      expect(input).toHaveFocus();
    });
  });

  // ===========================================================================
  // 交互测试
  // ===========================================================================
  describe("交互", () => {
    it("点击 Cancel 应调用 onOpenChange(false)", () => {
      const onOpenChange = vi.fn();
      render(<CreateProjectDialog open={true} onOpenChange={onOpenChange} />);

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("提交表单应调用 createAndSetCurrent", async () => {
      const { useProjectStore } = await import("../../stores/projectStore");
      const createAndSetCurrent = vi.fn().mockResolvedValue({ ok: true, data: { projectId: "new-project" } });
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = {
          current: null,
          items: [],
          bootstrapStatus: "ready" as const,
          lastError: null,
          bootstrap: vi.fn(),
          createAndSetCurrent,
          setCurrent: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<CreateProjectDialog open={true} onOpenChange={vi.fn()} />);

      const input = screen.getByTestId("create-project-name");
      fireEvent.change(input, { target: { value: "New Project" } });

      const form = screen.getByTestId("create-project-dialog");
      fireEvent.submit(form);

      await vi.waitFor(() => {
        expect(createAndSetCurrent).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // 错误状态测试
  // ===========================================================================
  describe("错误状态", () => {
    it("有错误时应显示错误信息", async () => {
      const { useProjectStore } = await import("../../stores/projectStore");
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = {
          current: null,
          items: [],
          bootstrapStatus: "ready" as const,
          lastError: { code: "IO_ERROR" as const, message: "Failed to create project" },
          bootstrap: vi.fn(),
          createAndSetCurrent: vi.fn(),
          setCurrent: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<CreateProjectDialog open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText(/IO_ERROR/)).toBeInTheDocument();
      expect(screen.getByText(/Failed to create project/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 提交中状态测试
  // ===========================================================================
  describe("提交中状态", () => {
    it("提交时 Create 按钮应显示 loading", async () => {
      const { useProjectStore } = await import("../../stores/projectStore");
      const createAndSetCurrent = vi.fn(() => new Promise<{ ok: true; data: { projectId: string; rootPath: string } }>(() => {})); // Never resolves
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = {
          current: null,
          items: [],
          bootstrapStatus: "ready" as const,
          lastError: null,
          bootstrap: vi.fn(),
          createAndSetCurrent,
          setCurrent: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<CreateProjectDialog open={true} onOpenChange={vi.fn()} />);

      const form = screen.getByTestId("create-project-dialog");
      fireEvent.submit(form);

      await vi.waitFor(() => {
        expect(screen.getByText("Creating…")).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // 清理测试
  // ===========================================================================
  describe("清理", () => {
    it("关闭时应清除错误", async () => {
      const { useProjectStore } = await import("../../stores/projectStore");
      const clearError = vi.fn();
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = {
          current: null,
          items: [],
          bootstrapStatus: "ready" as const,
          lastError: null,
          bootstrap: vi.fn(),
          createAndSetCurrent: vi.fn(),
          setCurrent: vi.fn(),
          clearError,
        };
        return selector(state);
      });

      const { rerender } = render(<CreateProjectDialog open={true} onOpenChange={vi.fn()} />);
      rerender(<CreateProjectDialog open={false} onOpenChange={vi.fn()} />);

      expect(clearError).toHaveBeenCalled();
    });
  });
});
