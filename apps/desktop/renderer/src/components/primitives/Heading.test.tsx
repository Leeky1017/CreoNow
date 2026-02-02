import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { HeadingLevel, HeadingColor } from "./Heading";
import { Heading } from "./Heading";

describe("Heading", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染标题内容", () => {
      render(<Heading>Page Title</Heading>);

      expect(screen.getByText("Page Title")).toBeInTheDocument();
    });

    it("默认应该渲染为 h2", () => {
      render(<Heading>Default</Heading>);

      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    it("应该应用自定义 className", () => {
      render(<Heading className="custom-heading">Test</Heading>);

      expect(screen.getByText("Test")).toHaveClass("custom-heading");
    });

    it("应该传递原生属性", () => {
      render(
        <Heading data-testid="test-heading" id="my-heading">
          Test
        </Heading>,
      );

      const element = screen.getByText("Test");
      expect(element).toHaveAttribute("data-testid", "test-heading");
      expect(element).toHaveAttribute("id", "my-heading");
    });
  });

  // ===========================================================================
  // Level 测试
  // ===========================================================================
  describe("level", () => {
    const levels: HeadingLevel[] = ["h1", "h2", "h3", "h4"];

    it.each(levels)("应该渲染正确的 %s 元素", (level) => {
      const levelNum = parseInt(level.slice(1));
      render(<Heading level={level}>Heading</Heading>);

      expect(
        screen.getByRole("heading", { level: levelNum }),
      ).toBeInTheDocument();
    });

    it("h1 应该有正确的样式类", () => {
      render(<Heading level="h1">H1</Heading>);

      const element = screen.getByText("H1");
      expect(element).toHaveClass("text-2xl");
      expect(element).toHaveClass("font-semibold");
    });

    it("h2 应该有正确的样式类", () => {
      render(<Heading level="h2">H2</Heading>);

      const element = screen.getByText("H2");
      expect(element).toHaveClass("text-base");
      expect(element).toHaveClass("font-semibold");
    });

    it("h3 应该有正确的样式类", () => {
      render(<Heading level="h3">H3</Heading>);

      const element = screen.getByText("H3");
      expect(element).toHaveClass("text-sm");
      expect(element).toHaveClass("font-medium");
    });

    it("h4 应该有正确的样式类", () => {
      render(<Heading level="h4">H4</Heading>);

      const element = screen.getByText("H4");
      expect(element).toHaveClass("text-[13px]");
      expect(element).toHaveClass("font-medium");
    });
  });

  // ===========================================================================
  // as 属性测试（视觉覆盖）
  // ===========================================================================
  describe("as 属性", () => {
    it("as 应该覆盖视觉样式但保持语义", () => {
      render(
        <Heading level="h2" as="h1">
          Looks like H1
        </Heading>,
      );

      // 语义上应该是 h2
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();

      // 视觉上应该是 h1 样式
      const element = screen.getByText("Looks like H1");
      expect(element).toHaveClass("text-2xl");
    });

    it("反向覆盖：h1 level 但 h3 视觉", () => {
      render(
        <Heading level="h1" as="h3">
          Semantic H1
        </Heading>,
      );

      // 语义上应该是 h1
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();

      // 视觉上应该是 h3 样式
      const element = screen.getByText("Semantic H1");
      expect(element).toHaveClass("text-sm");
    });

    it("没有 as 时应该使用 level 的样式", () => {
      render(<Heading level="h3">Just H3</Heading>);

      const element = screen.getByText("Just H3");
      expect(element).toHaveClass("text-sm");
      expect(element).toHaveClass("font-medium");
    });
  });

  // ===========================================================================
  // Color 测试
  // ===========================================================================
  describe("color", () => {
    const colors: HeadingColor[] = ["default", "muted", "subtle"];

    it.each(colors)("应该渲染 %s color", (color) => {
      render(<Heading color={color}>Heading</Heading>);

      expect(screen.getByText("Heading")).toBeInTheDocument();
    });

    it("默认应该是 default color", () => {
      render(<Heading>Default</Heading>);

      const element = screen.getByText("Default");
      expect(element.className).toContain("color-fg-default");
    });

    it("muted 应该使用 muted 颜色", () => {
      render(<Heading color="muted">Muted</Heading>);

      const element = screen.getByText("Muted");
      expect(element.className).toContain("color-fg-muted");
    });

    it("subtle 应该使用 subtle 颜色", () => {
      render(<Heading color="subtle">Subtle</Heading>);

      const element = screen.getByText("Subtle");
      expect(element.className).toContain("color-fg-subtle");
    });
  });

  // ===========================================================================
  // 组合测试
  // ===========================================================================
  describe("组合", () => {
    it("应该同时应用 level 和 color", () => {
      render(
        <Heading level="h1" color="muted">
          Combined
        </Heading>,
      );

      const element = screen.getByText("Combined");
      expect(element).toHaveClass("text-2xl");
      expect(element.className).toContain("color-fg-muted");
    });

    it("应该同时应用 level、as 和 color", () => {
      render(
        <Heading level="h2" as="h1" color="subtle">
          All Props
        </Heading>,
      );

      // 语义 h2
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();

      // 视觉 h1 + subtle
      const element = screen.getByText("All Props");
      expect(element).toHaveClass("text-2xl");
      expect(element.className).toContain("color-fg-subtle");
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("应该处理空 children", () => {
      const { container } = render(<Heading>{""}</Heading>);

      expect(container.querySelector("h2")).toBeInTheDocument();
    });

    it("应该处理长标题", () => {
      const longTitle =
        "This is a very long heading that might wrap to multiple lines depending on container width";
      render(<Heading>{longTitle}</Heading>);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("应该处理短标题", () => {
      render(<Heading>Hi</Heading>);

      expect(screen.getByText("Hi")).toBeInTheDocument();
    });

    it("应该处理 React 节点作为 children", () => {
      render(
        <Heading>
          <span>Nested</span> Heading
        </Heading>,
      );

      expect(screen.getByText("Nested")).toBeInTheDocument();
    });

    it("应该处理 emoji", () => {
      render(<Heading>Welcome 👋</Heading>);

      expect(screen.getByText("Welcome 👋")).toBeInTheDocument();
    });

    it("应该处理特殊字符", () => {
      render(<Heading>{"Title & Subtitle"}</Heading>);

      expect(screen.getByText("Title & Subtitle")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 无障碍测试
  // ===========================================================================
  describe("无障碍", () => {
    it("每个 level 应该有正确的 heading role", () => {
      const { rerender } = render(<Heading level="h1">H1</Heading>);
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();

      rerender(<Heading level="h2">H2</Heading>);
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();

      rerender(<Heading level="h3">H3</Heading>);
      expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();

      rerender(<Heading level="h4">H4</Heading>);
      expect(screen.getByRole("heading", { level: 4 })).toBeInTheDocument();
    });

    it("应该可以通过 aria-label 覆盖可访问名称", () => {
      render(<Heading aria-label="Custom label">Visual Title</Heading>);

      expect(screen.getByRole("heading")).toHaveAccessibleName("Custom label");
    });
  });

  // ===========================================================================
  // CSS Variables 检查
  // ===========================================================================
  describe("CSS Variables", () => {
    it("应该使用 CSS Variables 定义颜色", () => {
      render(<Heading>Test</Heading>);

      const element = screen.getByText("Test");
      const classNames = element.className;

      expect(classNames).toContain("var(--");
    });

    it("应该使用 CSS Variables 定义字体", () => {
      render(<Heading>Font Test</Heading>);

      const element = screen.getByText("Font Test");
      const classNames = element.className;

      expect(classNames).toContain("font-family-ui");
    });

    it("class 中不应该包含硬编码的十六进制颜色", () => {
      render(<Heading color="muted">Muted</Heading>);

      const element = screen.getByText("Muted");
      const classNames = element.className;

      expect(classNames).not.toMatch(/#[0-9a-fA-F]{3,6}(?![0-9a-fA-F])/);
    });
  });
});
