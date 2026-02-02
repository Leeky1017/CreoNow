import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryCreateDialog } from "./MemoryCreateDialog";

// Mock memoryStore
vi.mock("../../stores/memoryStore", () => ({
  useMemoryStore: vi.fn((selector) => {
    const state = {
      create: vi.fn().mockResolvedValue({ ok: true }),
    };
    return selector(state);
  }),
}));

describe("MemoryCreateDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("打开时应该渲染 Dialog", () => {
      render(
        <MemoryCreateDialog
          open={true}
          onOpenChange={vi.fn()}
          scope="global"
          scopeLabel="全局"
        />
      );

      expect(screen.getByText("添加新记忆")).toBeInTheDocument();
    });

    it("关闭时不应该渲染内容", () => {
      render(
        <MemoryCreateDialog
          open={false}
          onOpenChange={vi.fn()}
          scope="global"
          scopeLabel="全局"
        />
      );

      expect(screen.queryByText("添加新记忆")).not.toBeInTheDocument();
    });

    it("应该显示当前 scope 的说明", () => {
      render(
        <MemoryCreateDialog
          open={true}
          onOpenChange={vi.fn()}
          scope="project"
          scopeLabel="项目"
        />
      );

      expect(screen.getByText(/项目/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 表单元素测试
  // ===========================================================================
  describe("表单元素", () => {
    it("应该显示类型选择器", () => {
      render(
        <MemoryCreateDialog
          open={true}
          onOpenChange={vi.fn()}
          scope="global"
          scopeLabel="全局"
        />
      );

      expect(screen.getByTestId("memory-create-type")).toBeInTheDocument();
    });

    it("应该显示内容输入框", () => {
      render(
        <MemoryCreateDialog
          open={true}
          onOpenChange={vi.fn()}
          scope="global"
          scopeLabel="全局"
        />
      );

      expect(screen.getByTestId("memory-create-content")).toBeInTheDocument();
    });

    it("应该显示类型标签", () => {
      render(
        <MemoryCreateDialog
          open={true}
          onOpenChange={vi.fn()}
          scope="global"
          scopeLabel="全局"
        />
      );

      expect(screen.getByText("记忆类型")).toBeInTheDocument();
      expect(screen.getByText("记忆内容")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 按钮测试
  // ===========================================================================
  describe("按钮", () => {
    it("应该显示取消和保存按钮", () => {
      render(
        <MemoryCreateDialog
          open={true}
          onOpenChange={vi.fn()}
          scope="global"
          scopeLabel="全局"
        />
      );

      expect(screen.getByText("取消")).toBeInTheDocument();
      expect(screen.getByText("保存")).toBeInTheDocument();
    });

    it("点击取消按钮应该调用 onOpenChange(false)", () => {
      const onOpenChange = vi.fn();
      render(
        <MemoryCreateDialog
          open={true}
          onOpenChange={onOpenChange}
          scope="global"
          scopeLabel="全局"
        />
      );

      const cancelButton = screen.getByText("取消");
      cancelButton.click();

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ===========================================================================
  // 不同 scope 测试
  // ===========================================================================
  describe("不同 scope", () => {
    it("全局 scope 应该显示正确说明", () => {
      render(
        <MemoryCreateDialog
          open={true}
          onOpenChange={vi.fn()}
          scope="global"
          scopeLabel="全局"
        />
      );

      expect(screen.getByText(/全局/)).toBeInTheDocument();
    });

    it("项目 scope 应该显示正确说明", () => {
      render(
        <MemoryCreateDialog
          open={true}
          onOpenChange={vi.fn()}
          scope="project"
          scopeLabel="项目"
        />
      );

      expect(screen.getByText(/项目/)).toBeInTheDocument();
    });

    it("文档 scope 应该显示正确说明", () => {
      render(
        <MemoryCreateDialog
          open={true}
          onOpenChange={vi.fn()}
          scope="document"
          scopeLabel="文档"
        />
      );

      expect(screen.getByText(/文档/)).toBeInTheDocument();
    });
  });
});
