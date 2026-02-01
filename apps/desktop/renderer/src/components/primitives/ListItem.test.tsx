import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListItem } from "./ListItem";

describe("ListItem", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染列表项内容", () => {
      render(<ListItem>Item Content</ListItem>);

      expect(screen.getByText("Item Content")).toBeInTheDocument();
    });

    it("应该渲染为 div", () => {
      const { container } = render(<ListItem>Item</ListItem>);

      expect(container.querySelector("div")).toBeInTheDocument();
    });

    it("应该应用自定义 className", () => {
      render(<ListItem className="custom-item">Item</ListItem>);

      expect(screen.getByText("Item")).toHaveClass("custom-item");
    });

    it("应该传递原生属性", () => {
      render(
        <ListItem data-testid="test-item" id="my-item">
          Item
        </ListItem>,
      );

      const element = screen.getByText("Item");
      expect(element).toHaveAttribute("data-testid", "test-item");
      expect(element).toHaveAttribute("id", "my-item");
    });
  });

  // ===========================================================================
  // Interactive 测试
  // ===========================================================================
  describe("interactive", () => {
    it("非 interactive 时没有 role 和 tabIndex", () => {
      render(<ListItem>Static</ListItem>);

      const element = screen.getByText("Static");
      expect(element).not.toHaveAttribute("role");
      expect(element).not.toHaveAttribute("tabIndex");
    });

    it("interactive 时应该有 role=button", () => {
      render(<ListItem interactive>Clickable</ListItem>);

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("interactive 时应该有 tabIndex=0", () => {
      render(<ListItem interactive>Clickable</ListItem>);

      expect(screen.getByRole("button")).toHaveAttribute("tabIndex", "0");
    });

    it("interactive 时应该有 cursor-pointer 类", () => {
      render(<ListItem interactive>Clickable</ListItem>);

      expect(screen.getByRole("button")).toHaveClass("cursor-pointer");
    });

    it("interactive 时点击应该触发 onClick", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <ListItem interactive onClick={handleClick}>
          Clickable
        </ListItem>,
      );

      await user.click(screen.getByRole("button"));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Selected 测试
  // ===========================================================================
  describe("selected", () => {
    it("selected 时应该有选中样式", () => {
      render(<ListItem selected>Selected</ListItem>);

      const element = screen.getByText("Selected");
      expect(element.className).toContain("bg-selected");
    });

    it("非 selected 时不应该有选中样式", () => {
      render(<ListItem>Not Selected</ListItem>);

      const element = screen.getByText("Not Selected");
      expect(element.className).not.toContain("bg-selected");
    });
  });

  // ===========================================================================
  // Compact 测试
  // ===========================================================================
  describe("compact", () => {
    it("默认应该是 standard 高度 (h-10)", () => {
      render(<ListItem>Standard</ListItem>);

      expect(screen.getByText("Standard")).toHaveClass("h-10");
    });

    it("compact 时应该是 compact 高度 (h-8)", () => {
      render(<ListItem compact>Compact</ListItem>);

      expect(screen.getByText("Compact")).toHaveClass("h-8");
    });
  });

  // ===========================================================================
  // Disabled 测试
  // ===========================================================================
  describe("disabled", () => {
    it("disabled 时应该有禁用样式", () => {
      render(<ListItem disabled>Disabled</ListItem>);

      const element = screen.getByText("Disabled");
      expect(element).toHaveClass("opacity-50");
      expect(element).toHaveClass("cursor-not-allowed");
    });

    it("disabled 时 interactive 的 tabIndex 应该为 undefined", () => {
      render(
        <ListItem interactive disabled>
          Disabled
        </ListItem>,
      );

      const element = screen.getByText("Disabled");
      expect(element).not.toHaveAttribute("tabIndex");
    });

    it("disabled 时应该有 pointer-events-none 类", () => {
      render(
        <ListItem interactive disabled>
          Disabled
        </ListItem>,
      );

      // 验证有 pointer-events: none 样式类
      // 注意：JSDOM 中 pointer-events: none 不会阻止 userEvent.click
      // 但在真实浏览器中会阻止点击
      expect(screen.getByText("Disabled")).toHaveClass("pointer-events-none");
    });
  });

  // ===========================================================================
  // 键盘交互测试
  // ===========================================================================
  describe("键盘交互", () => {
    it("Tab 键应该可以聚焦 interactive 项", async () => {
      const user = userEvent.setup();
      render(<ListItem interactive>Focus me</ListItem>);

      await user.tab();

      expect(screen.getByRole("button")).toHaveFocus();
    });

    it("Enter 键应该触发点击", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <ListItem interactive onClick={handleClick}>
          Enter
        </ListItem>,
      );

      await user.tab();
      await user.keyboard("{Enter}");

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("Space 键应该触发点击", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <ListItem interactive onClick={handleClick}>
          Space
        </ListItem>,
      );

      await user.tab();
      await user.keyboard(" ");

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("非 interactive 项不应该响应键盘", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<ListItem onClick={handleClick}>Static</ListItem>);

      await user.tab();

      // 不应该被聚焦
      expect(screen.getByText("Static")).not.toHaveFocus();
    });

    it("disabled 时不应该响应键盘", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <ListItem interactive disabled onClick={handleClick}>
          Disabled
        </ListItem>,
      );

      // disabled 项不应该可聚焦
      await user.tab();
      expect(screen.getByText("Disabled")).not.toHaveFocus();
    });
  });

  // ===========================================================================
  // 组合状态测试
  // ===========================================================================
  describe("组合状态", () => {
    it("interactive + selected 应该同时有两种样式", () => {
      render(
        <ListItem interactive selected>
          Both
        </ListItem>,
      );

      const element = screen.getByText("Both");
      expect(element.className).toContain("bg-selected");
      expect(element).toHaveClass("cursor-pointer");
    });

    it("compact + interactive 应该同时有两种样式", () => {
      render(
        <ListItem compact interactive>
          Compact Interactive
        </ListItem>,
      );

      const element = screen.getByRole("button");
      expect(element).toHaveClass("h-8");
      expect(element).toHaveClass("cursor-pointer");
    });

    it("所有状态组合", () => {
      render(
        <ListItem compact interactive selected>
          All States
        </ListItem>,
      );

      const element = screen.getByRole("button");
      expect(element).toHaveClass("h-8");
      expect(element).toHaveClass("cursor-pointer");
      expect(element.className).toContain("bg-selected");
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("应该处理空 children", () => {
      const { container } = render(<ListItem>{""}</ListItem>);

      expect(container.querySelector("div")).toBeInTheDocument();
    });

    it("应该处理长文本", () => {
      const longText = "This is a very long list item text that might overflow";
      render(<ListItem>{longText}</ListItem>);

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it("应该处理 React 节点作为 children", () => {
      render(
        <ListItem>
          <span data-testid="icon">Icon</span>
          <span>Text</span>
        </ListItem>,
      );

      expect(screen.getByTestId("icon")).toBeInTheDocument();
      expect(screen.getByText("Text")).toBeInTheDocument();
    });

    it("应该处理多个子元素", () => {
      render(
        <ListItem>
          <span>First</span>
          <span>Second</span>
          <span>Third</span>
        </ListItem>,
      );

      expect(screen.getByText("First")).toBeInTheDocument();
      expect(screen.getByText("Second")).toBeInTheDocument();
      expect(screen.getByText("Third")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Focus 样式测试
  // ===========================================================================
  describe("Focus 样式", () => {
    it("interactive 时应该有 focus-visible 相关类", () => {
      render(<ListItem interactive>Focus Test</ListItem>);

      const element = screen.getByRole("button");
      expect(element).toHaveClass("focus-visible:outline");
    });
  });

  // ===========================================================================
  // CSS Variables 检查
  // ===========================================================================
  describe("CSS Variables", () => {
    it("应该使用 CSS Variables 定义样式", () => {
      render(<ListItem>Test</ListItem>);

      const element = screen.getByText("Test");
      const classNames = element.className;

      expect(classNames).toContain("var(--");
    });

    it("class 中不应该包含硬编码的十六进制颜色", () => {
      render(<ListItem selected>Selected</ListItem>);

      const element = screen.getByText("Selected");
      const classNames = element.className;

      expect(classNames).not.toMatch(/#[0-9a-fA-F]{3,6}(?![0-9a-fA-F])/);
    });
  });

  // ===========================================================================
  // 无障碍测试
  // ===========================================================================
  describe("无障碍", () => {
    it("interactive 时应该有 button role", () => {
      render(<ListItem interactive>Accessible</ListItem>);

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("非 interactive 时没有 role", () => {
      render(<ListItem>Static</ListItem>);

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("应该支持 aria-label", () => {
      render(
        <ListItem interactive aria-label="Custom label">
          Visual
        </ListItem>,
      );

      expect(screen.getByRole("button")).toHaveAccessibleName("Custom label");
    });
  });
});
