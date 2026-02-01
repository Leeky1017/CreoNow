import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "./Sidebar";
import { LayoutTestWrapper } from "./test-utils";
import { LAYOUT_DEFAULTS } from "../../stores/layoutStore";

describe("Sidebar", () => {
  const defaultProps: {
    width: number;
    collapsed: boolean;
    projectId: string | null;
  } = {
    width: LAYOUT_DEFAULTS.sidebar.default,
    collapsed: false,
    projectId: null,
  };

  const renderWithWrapper = (props: typeof defaultProps = defaultProps) => {
    return render(
      <LayoutTestWrapper>
        <Sidebar {...props} />
      </LayoutTestWrapper>,
    );
  };

  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 Sidebar 组件", () => {
      renderWithWrapper();

      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).toBeInTheDocument();
    });

    it("应该有正确的默认宽度 (240px)", () => {
      renderWithWrapper();

      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).toHaveStyle({
        width: `${LAYOUT_DEFAULTS.sidebar.default}px`,
      });
    });

    it("应该渲染标签页按钮", () => {
      renderWithWrapper();

      expect(screen.getByRole("button", { name: /files/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /kg/i })).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 折叠状态测试
  // ===========================================================================
  describe("折叠状态", () => {
    it("折叠时应该隐藏", () => {
      renderWithWrapper({ ...defaultProps, collapsed: true });

      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).toHaveClass("hidden");
    });

    it("折叠时宽度应该为 0", () => {
      renderWithWrapper({ ...defaultProps, collapsed: true, width: 0 });

      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).toHaveClass("w-0");
    });
  });

  // ===========================================================================
  // 宽度约束测试
  // ===========================================================================
  describe("宽度约束", () => {
    it("应该有最小宽度限制", () => {
      renderWithWrapper({ ...defaultProps, width: LAYOUT_DEFAULTS.sidebar.min });

      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).toHaveStyle({
        minWidth: `${LAYOUT_DEFAULTS.sidebar.min}px`,
      });
    });

    it("应该有最大宽度限制", () => {
      renderWithWrapper({ ...defaultProps, width: LAYOUT_DEFAULTS.sidebar.max });

      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).toHaveStyle({
        maxWidth: `${LAYOUT_DEFAULTS.sidebar.max}px`,
      });
    });
  });

  // ===========================================================================
  // 标签页交互测试
  // ===========================================================================
  describe("标签页交互", () => {
    it("点击 Files 标签应该激活", () => {
      renderWithWrapper();

      const filesTab = screen.getByRole("button", { name: /files/i });
      fireEvent.click(filesTab);

      // Files 标签应该有激活样式
      expect(filesTab.className).toContain("border-[var(--color-border-focus)]");
    });

    it("点击 Search 标签应该激活", () => {
      renderWithWrapper();

      const searchTab = screen.getByRole("button", { name: /search/i });
      fireEvent.click(searchTab);

      // Search 标签应该有激活样式
      expect(searchTab.className).toContain("border-[var(--color-border-focus)]");
    });

    it("点击 KG 标签应该激活", () => {
      renderWithWrapper();

      const kgTab = screen.getByRole("button", { name: /kg/i });
      fireEvent.click(kgTab);

      // KG 标签应该有激活样式
      expect(kgTab.className).toContain("border-[var(--color-border-focus)]");
    });
  });

  // ===========================================================================
  // 项目状态测试
  // ===========================================================================
  describe("项目状态", () => {
    it("无项目时应该显示提示信息", () => {
      renderWithWrapper({ ...defaultProps, projectId: null });

      expect(screen.getByText(/no project/i)).toBeInTheDocument();
    });

    it("有项目时不应该显示无项目提示", () => {
      renderWithWrapper({ ...defaultProps, projectId: "test-project" });

      expect(screen.queryByText(/no project/i)).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 样式测试
  // ===========================================================================
  describe("样式", () => {
    it("应该有右边框分隔线", () => {
      renderWithWrapper();

      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).toHaveClass("border-r");
    });

    it("应该有正确的背景色类", () => {
      renderWithWrapper();

      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar.className).toContain("bg-[var(--color-bg-surface)]");
    });

    it("应该有 flex column 布局", () => {
      renderWithWrapper();

      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).toHaveClass("flex");
      expect(sidebar).toHaveClass("flex-col");
    });
  });

  // ===========================================================================
  // 无障碍测试
  // ===========================================================================
  describe("无障碍", () => {
    it("应该渲染为 aside 元素", () => {
      renderWithWrapper();

      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar.tagName).toBe("ASIDE");
    });

    it("标签页按钮应该有 type='button'", () => {
      renderWithWrapper();

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("type", "button");
      });
    });
  });
});
