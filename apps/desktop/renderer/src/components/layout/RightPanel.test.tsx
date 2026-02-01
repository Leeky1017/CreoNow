import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RightPanel } from "./RightPanel";
import { LayoutTestWrapper } from "./test-utils";
import { LAYOUT_DEFAULTS } from "../../stores/layoutStore";

describe("RightPanel", () => {
  const defaultProps: {
    width: number;
    collapsed: boolean;
  } = {
    width: LAYOUT_DEFAULTS.panel.default,
    collapsed: false,
  };

  const renderWithWrapper = (props: typeof defaultProps = defaultProps) => {
    return render(
      <LayoutTestWrapper>
        <RightPanel {...props} />
      </LayoutTestWrapper>,
    );
  };

  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 RightPanel 组件", () => {
      renderWithWrapper();

      const panel = screen.getByTestId("layout-panel");
      expect(panel).toBeInTheDocument();
    });

    it("应该有正确的默认宽度 (320px)", () => {
      renderWithWrapper();

      const panel = screen.getByTestId("layout-panel");
      expect(panel).toHaveStyle({
        width: `${LAYOUT_DEFAULTS.panel.default}px`,
      });
    });
  });

  // ===========================================================================
  // 折叠状态测试
  // ===========================================================================
  describe("折叠状态", () => {
    it("折叠时应该隐藏", () => {
      renderWithWrapper({ ...defaultProps, collapsed: true });

      const panel = screen.getByTestId("layout-panel");
      expect(panel).toHaveClass("hidden");
    });

    it("折叠时宽度应该为 0", () => {
      renderWithWrapper({ ...defaultProps, collapsed: true, width: 0 });

      const panel = screen.getByTestId("layout-panel");
      expect(panel).toHaveClass("w-0");
    });
  });

  // ===========================================================================
  // 宽度约束测试
  // ===========================================================================
  describe("宽度约束", () => {
    it("应该有最小宽度限制", () => {
      renderWithWrapper({ ...defaultProps, width: LAYOUT_DEFAULTS.panel.min });

      const panel = screen.getByTestId("layout-panel");
      expect(panel).toHaveStyle({
        minWidth: `${LAYOUT_DEFAULTS.panel.min}px`,
      });
    });

    it("应该有最大宽度限制", () => {
      renderWithWrapper({ ...defaultProps, width: LAYOUT_DEFAULTS.panel.max });

      const panel = screen.getByTestId("layout-panel");
      expect(panel).toHaveStyle({
        maxWidth: `${LAYOUT_DEFAULTS.panel.max}px`,
      });
    });
  });

  // ===========================================================================
  // 样式测试
  // ===========================================================================
  describe("样式", () => {
    it("应该有左边框分隔线", () => {
      renderWithWrapper();

      const panel = screen.getByTestId("layout-panel");
      expect(panel).toHaveClass("border-l");
    });

    it("应该有正确的背景色类", () => {
      renderWithWrapper();

      const panel = screen.getByTestId("layout-panel");
      expect(panel.className).toContain("bg-[var(--color-bg-surface)]");
    });

    it("应该有 flex column 布局", () => {
      renderWithWrapper();

      const panel = screen.getByTestId("layout-panel");
      expect(panel).toHaveClass("flex");
      expect(panel).toHaveClass("flex-col");
    });
  });

  // ===========================================================================
  // 无障碍测试
  // ===========================================================================
  describe("无障碍", () => {
    it("应该渲染为 aside 元素", () => {
      renderWithWrapper();

      const panel = screen.getByTestId("layout-panel");
      expect(panel.tagName).toBe("ASIDE");
    });
  });
});
