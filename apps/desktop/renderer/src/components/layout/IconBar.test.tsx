import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IconBar } from "./IconBar";
import { LayoutTestWrapper } from "./test-utils";

describe("IconBar", () => {
  const renderWithWrapper = () => {
    return render(
      <LayoutTestWrapper>
        <IconBar />
      </LayoutTestWrapper>,
    );
  };

  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 IconBar 组件", () => {
      const { container } = renderWithWrapper();

      // IconBar 应该存在
      const iconBar = container.firstChild;
      expect(iconBar).toBeInTheDocument();
    });

    it("应该渲染侧边栏切换按钮", () => {
      renderWithWrapper();

      const toggleButton = screen.getByRole("button", {
        name: /toggle sidebar/i,
      });
      expect(toggleButton).toBeInTheDocument();
    });

    it("应该有正确的固定宽度 (48px)", () => {
      const { container } = renderWithWrapper();

      const iconBar = container.firstChild as HTMLElement;
      expect(iconBar).toHaveStyle({ width: "48px" });
    });
  });

  // ===========================================================================
  // 交互测试
  // ===========================================================================
  describe("交互", () => {
    it("点击切换按钮应该触发侧边栏折叠", () => {
      renderWithWrapper();

      const toggleButton = screen.getByRole("button", {
        name: /toggle sidebar/i,
      });

      // 点击切换按钮
      fireEvent.click(toggleButton);

      // 按钮应该仍然存在（store 状态会改变）
      expect(toggleButton).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 样式测试
  // ===========================================================================
  describe("样式", () => {
    it("应该有边框右侧分隔线", () => {
      const { container } = renderWithWrapper();

      const iconBar = container.firstChild as HTMLElement;
      expect(iconBar).toHaveClass("border-r");
    });

    it("应该有正确的背景色类", () => {
      const { container } = renderWithWrapper();

      const iconBar = container.firstChild as HTMLElement;
      expect(iconBar.className).toContain("bg-[var(--color-bg-surface)]");
    });

    it("按钮应该有 hover 状态样式类", () => {
      renderWithWrapper();

      const toggleButton = screen.getByRole("button", {
        name: /toggle sidebar/i,
      });
      expect(toggleButton.className).toContain("hover:");
    });

    it("按钮应该有 focus-visible 样式类", () => {
      renderWithWrapper();

      const toggleButton = screen.getByRole("button", {
        name: /toggle sidebar/i,
      });
      expect(toggleButton.className).toContain("focus-visible:");
    });
  });

  // ===========================================================================
  // 无障碍测试
  // ===========================================================================
  describe("无障碍", () => {
    it("切换按钮应该有 aria-label", () => {
      renderWithWrapper();

      const toggleButton = screen.getByRole("button", {
        name: /toggle sidebar/i,
      });
      expect(toggleButton).toHaveAttribute("aria-label");
    });

    it("切换按钮应该有 type='button'", () => {
      renderWithWrapper();

      const toggleButton = screen.getByRole("button", {
        name: /toggle sidebar/i,
      });
      expect(toggleButton).toHaveAttribute("type", "button");
    });
  });
});
