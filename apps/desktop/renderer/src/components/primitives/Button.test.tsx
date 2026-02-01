import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  describe("渲染", () => {
    it("应该渲染按钮文本", () => {
      render(<Button>Click me</Button>);

      expect(screen.getByRole("button")).toHaveTextContent("Click me");
    });

    it("应该有正确的 type 属性", () => {
      render(<Button>Submit</Button>);

      expect(screen.getByRole("button")).toHaveAttribute("type", "button");
    });

    it("应该应用自定义 className", () => {
      render(<Button className="custom-class">Custom</Button>);

      expect(screen.getByRole("button")).toHaveClass("custom-class");
    });
  });

  describe("variants", () => {
    it("应该渲染 primary variant", () => {
      render(<Button variant="primary">Primary</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("应该渲染 secondary variant（默认）", () => {
      render(<Button>Secondary</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("应该渲染 ghost variant", () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("应该渲染 danger variant", () => {
      render(<Button variant="danger">Danger</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });
  });

  describe("sizes", () => {
    it("应该渲染 sm size", () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-7");
    });

    it("应该渲染 md size（默认）", () => {
      render(<Button>Medium</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-9");
    });

    it("应该渲染 lg size", () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-11");
    });
  });

  describe("状态", () => {
    it("应该处理 disabled 状态", () => {
      render(<Button disabled>Disabled</Button>);

      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("应该在 loading 时显示 spinner 并禁用", () => {
      render(<Button loading>Loading</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      // Spinner 应该存在（通过 SVG 检测）
      expect(button.querySelector("svg")).toBeInTheDocument();
    });

    it("应该渲染 fullWidth 样式", () => {
      render(<Button fullWidth>Full Width</Button>);

      expect(screen.getByRole("button")).toHaveClass("w-full");
    });
  });

  describe("交互", () => {
    it("应该在点击时调用 onClick", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click</Button>);

      await user.click(screen.getByRole("button"));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("disabled 状态下不应该响应点击", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>,
      );

      await user.click(screen.getByRole("button"));

      expect(handleClick).not.toHaveBeenCalled();
    });

    it("loading 状态下不应该响应点击", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Button onClick={handleClick} loading>
          Loading
        </Button>,
      );

      await user.click(screen.getByRole("button"));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});
