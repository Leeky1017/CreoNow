import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBar } from "./StatusBar";
import { LayoutTestWrapper } from "./test-utils";
import { LAYOUT_DEFAULTS } from "../../stores/layoutStore";

describe("StatusBar", () => {
  const renderWithWrapper = () => {
    return render(
      <LayoutTestWrapper>
        <StatusBar />
      </LayoutTestWrapper>,
    );
  };

  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 StatusBar 组件", () => {
      renderWithWrapper();

      const statusBar = screen.getByTestId("layout-statusbar");
      expect(statusBar).toBeInTheDocument();
    });

    it("应该显示自动保存状态", () => {
      renderWithWrapper();

      const statusElement = screen.getByTestId("editor-autosave-status");
      expect(statusElement).toBeInTheDocument();
    });

    it("应该有正确的固定高度 (28px)", () => {
      renderWithWrapper();

      const statusBar = screen.getByTestId("layout-statusbar");
      expect(statusBar).toHaveStyle({
        height: `${LAYOUT_DEFAULTS.statusBarHeight}px`,
      });
    });
  });

  // ===========================================================================
  // 样式测试
  // ===========================================================================
  describe("样式", () => {
    it("应该有顶部边框分隔线", () => {
      renderWithWrapper();

      const statusBar = screen.getByTestId("layout-statusbar");
      expect(statusBar).toHaveClass("border-t");
    });

    it("应该有正确的背景色类", () => {
      renderWithWrapper();

      const statusBar = screen.getByTestId("layout-statusbar");
      expect(statusBar.className).toContain("bg-[var(--color-bg-surface)]");
    });

    it("应该有 flex 布局", () => {
      renderWithWrapper();

      const statusBar = screen.getByTestId("layout-statusbar");
      expect(statusBar).toHaveClass("flex");
    });

    it("应该垂直居中对齐", () => {
      renderWithWrapper();

      const statusBar = screen.getByTestId("layout-statusbar");
      expect(statusBar).toHaveClass("items-center");
    });
  });

  // ===========================================================================
  // 内容测试
  // ===========================================================================
  describe("内容", () => {
    it("应该显示初始状态", () => {
      renderWithWrapper();

      const statusElement = screen.getByTestId("editor-autosave-status");
      // 初始状态应该有内容（具体值取决于 store 初始状态）
      expect(statusElement).toBeInTheDocument();
    });

    it("状态元素应该有 data-status 属性", () => {
      renderWithWrapper();

      const statusElement = screen.getByTestId("editor-autosave-status");
      expect(statusElement).toHaveAttribute("data-status");
    });
  });

  // ===========================================================================
  // 字体测试
  // ===========================================================================
  describe("字体", () => {
    it("应该使用 11px 字体大小", () => {
      renderWithWrapper();

      const statusBar = screen.getByTestId("layout-statusbar");
      expect(statusBar.className).toContain("text-[11px]");
    });

    it("应该使用 muted 文本颜色", () => {
      renderWithWrapper();

      const statusBar = screen.getByTestId("layout-statusbar");
      expect(statusBar.className).toContain("text-[var(--color-fg-muted)]");
    });
  });
});
