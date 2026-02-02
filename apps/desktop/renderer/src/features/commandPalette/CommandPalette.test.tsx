import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommandPalette } from "./CommandPalette";
import type { ProjectStore } from "../../stores/projectStore";

// Mock stores
vi.mock("../../stores/projectStore", () => ({
  useProjectStore: vi.fn((selector) => {
    const state = {
      current: { projectId: "test-project" },
    };
    return selector(state);
  }),
}));

vi.mock("../../stores/editorStore", () => ({
  useEditorStore: vi.fn((selector) => {
    const state = {
      documentId: "test-document",
    };
    return selector(state);
  }),
}));

vi.mock("../../lib/ipcClient", () => ({
  invoke: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("open 为 true 时应该渲染", () => {
      render(<CommandPalette open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByTestId("command-palette")).toBeInTheDocument();
    });

    it("open 为 false 时不应该渲染", () => {
      render(<CommandPalette open={false} onOpenChange={vi.fn()} />);

      expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument();
    });

    it("应该显示 Command Palette 标题", () => {
      render(<CommandPalette open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText("Command Palette")).toBeInTheDocument();
    });

    it("应该显示快捷键提示", () => {
      render(<CommandPalette open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText("Ctrl/Cmd+P")).toBeInTheDocument();
    });

    it("应该显示 Export Markdown 命令", () => {
      render(<CommandPalette open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByTestId("command-item-export-markdown")).toBeInTheDocument();
      expect(screen.getByText("Export Markdown")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 无障碍测试
  // ===========================================================================
  describe("无障碍", () => {
    it("应该有 dialog role", () => {
      render(<CommandPalette open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("应该有 aria-modal", () => {
      render(<CommandPalette open={true} onOpenChange={vi.fn()} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });
  });

  // ===========================================================================
  // 交互测试
  // ===========================================================================
  describe("交互", () => {
    it("点击背景应调用 onOpenChange(false)", () => {
      const onOpenChange = vi.fn();
      render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

      const overlay = document.querySelector(".cn-overlay");
      if (overlay) {
        fireEvent.click(overlay);
        expect(onOpenChange).toHaveBeenCalledWith(false);
      }
    });

    it("点击弹窗内部不应关闭", () => {
      const onOpenChange = vi.fn();
      render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

      const dialog = screen.getByRole("dialog");
      fireEvent.click(dialog);

      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 错误状态测试
  // ===========================================================================
  describe("错误状态", () => {
    it("无项目时应显示错误", async () => {
      const { useProjectStore } = await import("../../stores/projectStore");
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = {
          current: null,
        };
        return selector(state as unknown as ProjectStore);
      });

      render(<CommandPalette open={true} onOpenChange={vi.fn()} />);

      const exportButton = screen.getByTestId("command-item-export-markdown");
      fireEvent.click(exportButton);

      // Wait for error to appear
      await vi.waitFor(() => {
        expect(screen.getByTestId("command-palette-error")).toBeInTheDocument();
        expect(screen.getByText("No current project")).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // 样式测试
  // ===========================================================================
  describe("样式", () => {
    it("应该有 Card 样式", () => {
      render(<CommandPalette open={true} onOpenChange={vi.fn()} />);

      const dialog = screen.getByRole("dialog");
      // Card 组件使用 shadow 样式来表示 raised 变体
      expect(dialog.className).toContain("shadow");
    });
  });
});
