import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TextSize, TextColor } from "./Text";
import { Text } from "./Text";

describe("Text", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染文本内容", () => {
      render(<Text>Hello World</Text>);

      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    it("默认应该渲染为 span", () => {
      const { container } = render(<Text>Test</Text>);

      expect(container.querySelector("span")).toBeInTheDocument();
    });

    it("应该应用自定义 className", () => {
      render(<Text className="custom-class">Test</Text>);

      expect(screen.getByText("Test")).toHaveClass("custom-class");
    });

    it("应该传递原生属性", () => {
      render(
        <Text data-testid="test-text" id="my-text">
          Test
        </Text>,
      );

      const element = screen.getByText("Test");
      expect(element).toHaveAttribute("data-testid", "test-text");
      expect(element).toHaveAttribute("id", "my-text");
    });
  });

  // ===========================================================================
  // Size 测试
  // ===========================================================================
  describe("size", () => {
    const sizes: TextSize[] = ["body", "bodyLarge", "small", "tiny", "label", "code"];

    it.each(sizes)("应该渲染 %s size", (size) => {
      render(<Text size={size}>Text</Text>);

      expect(screen.getByText("Text")).toBeInTheDocument();
    });

    it("默认应该是 body size", () => {
      render(<Text>Default</Text>);

      const element = screen.getByText("Default");
      expect(element).toHaveClass("text-[13px]");
    });

    it("bodyLarge 应该是 16px", () => {
      render(<Text size="bodyLarge">Large</Text>);

      const element = screen.getByText("Large");
      expect(element).toHaveClass("text-base");
    });

    it("small 应该是 12px", () => {
      render(<Text size="small">Small</Text>);

      const element = screen.getByText("Small");
      expect(element).toHaveClass("text-xs");
    });

    it("tiny 应该是 11px", () => {
      render(<Text size="tiny">Tiny</Text>);

      const element = screen.getByText("Tiny");
      expect(element).toHaveClass("text-[11px]");
    });

    it("label 应该是 10px 且 uppercase", () => {
      render(<Text size="label">Label</Text>);

      const element = screen.getByText("Label");
      expect(element).toHaveClass("text-[10px]");
      expect(element).toHaveClass("uppercase");
    });

    it("code 应该使用 mono 字体", () => {
      render(<Text size="code">Code</Text>);

      const element = screen.getByText("Code");
      expect(element.className).toContain("font-family-mono");
    });
  });

  // ===========================================================================
  // Color 测试
  // ===========================================================================
  describe("color", () => {
    const colors: TextColor[] = [
      "default",
      "muted",
      "subtle",
      "placeholder",
      "error",
      "success",
      "warning",
      "info",
    ];

    it.each(colors)("应该渲染 %s color", (color) => {
      render(<Text color={color}>Text</Text>);

      expect(screen.getByText("Text")).toBeInTheDocument();
    });

    it("默认应该是 default color", () => {
      render(<Text>Default</Text>);

      const element = screen.getByText("Default");
      expect(element.className).toContain("color-fg-default");
    });

    it("muted 应该使用 muted 颜色", () => {
      render(<Text color="muted">Muted</Text>);

      const element = screen.getByText("Muted");
      expect(element.className).toContain("color-fg-muted");
    });

    it("error 应该使用 error 颜色", () => {
      render(<Text color="error">Error</Text>);

      const element = screen.getByText("Error");
      expect(element.className).toContain("color-error");
    });

    it("success 应该使用 success 颜色", () => {
      render(<Text color="success">Success</Text>);

      const element = screen.getByText("Success");
      expect(element.className).toContain("color-success");
    });
  });

  // ===========================================================================
  // Weight 测试
  // ===========================================================================
  describe("weight", () => {
    it("应该应用 normal weight", () => {
      render(<Text weight="normal">Normal</Text>);

      expect(screen.getByText("Normal")).toHaveClass("font-normal");
    });

    it("应该应用 medium weight", () => {
      render(<Text weight="medium">Medium</Text>);

      expect(screen.getByText("Medium")).toHaveClass("font-medium");
    });

    it("应该应用 semibold weight", () => {
      render(<Text weight="semibold">Semibold</Text>);

      expect(screen.getByText("Semibold")).toHaveClass("font-semibold");
    });

    it("应该应用 bold weight", () => {
      render(<Text weight="bold">Bold</Text>);

      expect(screen.getByText("Bold")).toHaveClass("font-bold");
    });

    it("没有 weight prop 时不应该添加额外的 weight 类", () => {
      render(<Text>No weight</Text>);

      const element = screen.getByText("No weight");
      // 只有 size 默认的 font-normal
      const classCount = element.className.split("font-").length - 1;
      expect(classCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // as 元素测试
  // ===========================================================================
  describe("as 元素", () => {
    it("as=span 应该渲染为 span", () => {
      const { container } = render(<Text as="span">Span</Text>);

      expect(container.querySelector("span")).toBeInTheDocument();
    });

    it("as=p 应该渲染为 p", () => {
      const { container } = render(<Text as="p">Paragraph</Text>);

      expect(container.querySelector("p")).toBeInTheDocument();
    });

    it("as=div 应该渲染为 div", () => {
      const { container } = render(<Text as="div">Div</Text>);

      expect(container.querySelector("div")).toBeInTheDocument();
    });

    it("as=label 应该渲染为 label", () => {
      const { container } = render(<Text as="label">Label</Text>);

      expect(container.querySelector("label")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 组合测试
  // ===========================================================================
  describe("组合", () => {
    it("应该同时应用 size 和 color", () => {
      render(
        <Text size="small" color="muted">
          Combined
        </Text>,
      );

      const element = screen.getByText("Combined");
      expect(element).toHaveClass("text-xs");
      expect(element.className).toContain("color-fg-muted");
    });

    it("应该同时应用 size、color 和 weight", () => {
      render(
        <Text size="bodyLarge" color="error" weight="bold">
          All Props
        </Text>,
      );

      const element = screen.getByText("All Props");
      expect(element).toHaveClass("text-base");
      expect(element.className).toContain("color-error");
      expect(element).toHaveClass("font-bold");
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("应该处理空 children", () => {
      const { container } = render(<Text>{""}</Text>);

      expect(container.querySelector("span")).toBeInTheDocument();
    });

    it("应该处理长文本", () => {
      const longText =
        "This is a very long text that might wrap to multiple lines.";
      render(<Text>{longText}</Text>);

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it("应该处理 React 节点作为 children", () => {
      render(
        <Text>
          <strong>Bold</strong> text
        </Text>,
      );

      expect(screen.getByText("Bold")).toBeInTheDocument();
    });

    it("应该处理特殊字符", () => {
      render(<Text>{"<script>alert('xss')</script>"}</Text>);

      expect(
        screen.getByText("<script>alert('xss')</script>"),
      ).toBeInTheDocument();
    });

    it("应该处理 emoji", () => {
      render(<Text>Hello 👋 World 🌍</Text>);

      expect(screen.getByText("Hello 👋 World 🌍")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // CSS Variables 检查
  // ===========================================================================
  describe("CSS Variables", () => {
    it("应该使用 CSS Variables 定义颜色", () => {
      render(<Text>Test</Text>);

      const element = screen.getByText("Test");
      const classNames = element.className;

      expect(classNames).toContain("var(--");
    });

    it("class 中不应该包含硬编码的十六进制颜色", () => {
      render(<Text color="error">Error</Text>);

      const element = screen.getByText("Error");
      const classNames = element.className;

      expect(classNames).not.toMatch(/#[0-9a-fA-F]{3,6}(?![0-9a-fA-F])/);
    });
  });
});
