import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CardVariant } from "./Card";
import { Card } from "./Card";

describe("Card", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染卡片内容", () => {
      render(<Card>Card Content</Card>);

      expect(screen.getByText("Card Content")).toBeInTheDocument();
    });

    it("应该应用自定义 className", () => {
      render(<Card className="custom-class">Content</Card>);

      const card = screen.getByText("Content").closest("div");
      expect(card).toHaveClass("custom-class");
    });

    it("应该传递原生 div 属性", () => {
      render(
        <Card data-testid="test-card" aria-label="Test card">
          Test
        </Card>,
      );

      const card = screen.getByTestId("test-card");
      expect(card).toHaveAttribute("aria-label", "Test card");
    });
  });

  // ===========================================================================
  // Variant 测试（全覆盖）
  // ===========================================================================
  describe("variants", () => {
    const variants: CardVariant[] = ["default", "raised", "bordered"];

    it.each(variants)("应该渲染 %s variant", (variant) => {
      render(<Card variant={variant}>{variant}</Card>);

      const card = screen.getByText(variant).closest("div");
      expect(card).toBeInTheDocument();
    });

    it("默认应该是 default variant", () => {
      render(<Card>Default</Card>);

      const card = screen.getByText("Default").closest("div");
      // default variant 只有单层 border
      expect(card).toHaveClass("border");
      expect(card).not.toHaveClass("border-2");
    });

    it("raised variant 应该有阴影", () => {
      const { container } = render(<Card variant="raised">Raised</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("shadow-[var(--shadow-md)]");
    });

    it("bordered variant 应该有加粗边框", () => {
      render(<Card variant="bordered">Bordered</Card>);

      const card = screen.getByText("Bordered").closest("div");
      expect(card).toHaveClass("border-2");
    });
  });

  // ===========================================================================
  // Hoverable 测试
  // ===========================================================================
  describe("hoverable", () => {
    it("hoverable 模式应该有 cursor-pointer", () => {
      render(<Card hoverable>Hoverable</Card>);

      const card = screen.getByText("Hoverable").closest("div");
      expect(card).toHaveClass("cursor-pointer");
    });

    it("非 hoverable 模式不应该有 cursor-pointer", () => {
      render(<Card>Normal</Card>);

      const card = screen.getByText("Normal").closest("div");
      expect(card).not.toHaveClass("cursor-pointer");
    });

    it("hoverable 模式应该有 hover 边框样式", () => {
      render(<Card hoverable>Hoverable</Card>);

      const card = screen.getByText("Hoverable").closest("div");
      expect(card?.className).toContain("hover:border-[var(--color-border-hover)]");
    });

    it("hoverable 模式应该有 hover 阴影样式", () => {
      render(<Card hoverable>Hoverable</Card>);

      const card = screen.getByText("Hoverable").closest("div");
      expect(card?.className).toContain("hover:shadow-[var(--shadow-sm)]");
    });
  });

  // ===========================================================================
  // Padding 测试
  // ===========================================================================
  describe("padding", () => {
    it("默认应该有 p-6 padding", () => {
      render(<Card>With Padding</Card>);

      const card = screen.getByText("With Padding").closest("div");
      expect(card).toHaveClass("p-6");
    });

    it("noPadding 模式不应该有 p-6", () => {
      render(<Card noPadding>No Padding</Card>);

      const card = screen.getByText("No Padding").closest("div");
      expect(card).not.toHaveClass("p-6");
    });
  });

  // ===========================================================================
  // 样式测试
  // ===========================================================================
  describe("样式", () => {
    it("应该有正确的圆角", () => {
      render(<Card>Content</Card>);

      const card = screen.getByText("Content").closest("div");
      expect(card?.className).toContain("rounded-[var(--radius-xl)]");
    });

    it("应该有正确的背景色", () => {
      render(<Card>Content</Card>);

      const card = screen.getByText("Content").closest("div");
      expect(card?.className).toContain("bg-[var(--color-bg-surface)]");
    });

    it("应该有过渡动画", () => {
      render(<Card>Content</Card>);

      const card = screen.getByText("Content").closest("div");
      expect(card).toHaveClass("transition-all");
    });
  });

  // ===========================================================================
  // 阴影规则测试（设计规范 §5.2）
  // ===========================================================================
  describe("阴影规则", () => {
    it("default variant 不应该有阴影", () => {
      render(<Card>Default</Card>);

      const card = screen.getByText("Default").closest("div");
      // 检查 class 中不包含 shadow 相关的静态样式
      expect(card?.className).not.toContain("shadow-[var(--shadow-md)]");
      // 但可以有 hover 时的阴影（如果是 hoverable）
    });

    it("仅 raised variant 默认有阴影", () => {
      render(<Card variant="raised">Raised</Card>);

      const card = screen.getByText("Raised").closest("div");
      expect(card?.className).toContain("shadow-[var(--shadow-md)]");
    });

    it("hoverable 时 hover 状态可以添加轻微阴影", () => {
      render(<Card hoverable>Hoverable</Card>);

      const card = screen.getByText("Hoverable").closest("div");
      // hover 状态的阴影是 --shadow-sm
      expect(card?.className).toContain("hover:shadow-[var(--shadow-sm)]");
    });
  });

  // ===========================================================================
  // CSS Variables 检查（不使用硬编码颜色）
  // ===========================================================================
  describe("CSS Variables", () => {
    it("class 中不应该包含硬编码的十六进制颜色", () => {
      const { container } = render(<Card variant="default">Test</Card>);

      const card = container.querySelector("div");
      const classNames = card?.className ?? "";

      // 检查 class 中不包含硬编码的颜色值
      expect(classNames).not.toMatch(/#[0-9a-fA-F]{3,6}(?![0-9a-fA-F])/);
    });

    it("应该使用 CSS Variables 定义颜色", () => {
      const { container } = render(<Card>Test</Card>);

      const card = container.querySelector("div");
      const classNames = card?.className ?? "";

      // 检查使用了 CSS Variables
      expect(classNames).toContain("var(--");
    });
  });

  // ===========================================================================
  // 交互测试
  // ===========================================================================
  describe("交互", () => {
    it("应该在点击时调用 onClick", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Card hoverable onClick={handleClick}>
          Clickable
        </Card>,
      );

      await user.click(screen.getByText("Clickable"));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("非 hoverable 卡片也可以响应点击", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Card onClick={handleClick}>Normal</Card>);

      await user.click(screen.getByText("Normal"));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Slot 模式测试
  // ===========================================================================
  describe("Slot 模式", () => {
    it("应该正确渲染 children", () => {
      render(
        <Card>
          <div data-testid="header">Header</div>
          <div data-testid="content">Content</div>
          <div data-testid="footer">Footer</div>
        </Card>,
      );

      expect(screen.getByTestId("header")).toBeInTheDocument();
      expect(screen.getByTestId("content")).toBeInTheDocument();
      expect(screen.getByTestId("footer")).toBeInTheDocument();
    });

    it("应该保持 children 的顺序", () => {
      const { container } = render(
        <Card>
          <span>First</span>
          <span>Second</span>
          <span>Third</span>
        </Card>,
      );

      const spans = container.querySelectorAll("span");
      expect(spans[0]).toHaveTextContent("First");
      expect(spans[1]).toHaveTextContent("Second");
      expect(spans[2]).toHaveTextContent("Third");
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("应该处理空 children", () => {
      const { container } = render(<Card>{""}</Card>);

      const card = container.firstChild;
      expect(card).toBeInTheDocument();
    });

    it("应该处理超长文本", () => {
      const longText =
        "This is an extremely long piece of content that should still render correctly without breaking the card layout. It might wrap to multiple lines depending on the container width.";
      render(<Card>{longText}</Card>);

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it("应该处理 emoji", () => {
      render(<Card>🚀 Card with Emoji 🎉</Card>);

      expect(screen.getByText("🚀 Card with Emoji 🎉")).toBeInTheDocument();
    });

    it("应该支持嵌套 Card", () => {
      render(
        <Card data-testid="outer">
          <Card data-testid="inner">Nested</Card>
        </Card>,
      );

      expect(screen.getByTestId("outer")).toBeInTheDocument();
      expect(screen.getByTestId("inner")).toBeInTheDocument();
      expect(screen.getByText("Nested")).toBeInTheDocument();
    });

    it("应该处理 React 节点作为 children", () => {
      render(
        <Card>
          <div data-testid="complex">
            <h3>Title</h3>
            <p>Description</p>
            <button>Action</button>
          </div>
        </Card>,
      );

      expect(screen.getByTestId("complex")).toBeInTheDocument();
      expect(screen.getByRole("heading")).toHaveTextContent("Title");
      expect(screen.getByRole("button")).toHaveTextContent("Action");
    });
  });

  // ===========================================================================
  // 完整 Variant × Hoverable 矩阵测试
  // ===========================================================================
  describe("Variant × Hoverable 矩阵", () => {
    const variants: CardVariant[] = ["default", "raised", "bordered"];
    const hoverableStates = [true, false];

    const combinations = variants.flatMap((variant) =>
      hoverableStates.map((hoverable) => ({ variant, hoverable })),
    );

    it.each(combinations)(
      "应该正确渲染 $variant × hoverable=$hoverable 组合",
      ({ variant, hoverable }) => {
        render(
          <Card variant={variant} hoverable={hoverable}>
            Test
          </Card>,
        );

        const card = screen.getByText("Test").closest("div");
        expect(card).toBeInTheDocument();

        if (hoverable) {
          expect(card).toHaveClass("cursor-pointer");
        } else {
          expect(card).not.toHaveClass("cursor-pointer");
        }
      },
    );
  });

  // ===========================================================================
  // 无障碍 (a11y) 测试
  // ===========================================================================
  describe("无障碍", () => {
    it("应该支持 role 属性", () => {
      render(
        <Card role="article" aria-label="Project card">
          Content
        </Card>,
      );

      expect(screen.getByRole("article")).toBeInTheDocument();
      expect(screen.getByRole("article")).toHaveAccessibleName("Project card");
    });

    it("应该支持 aria-describedby", () => {
      render(
        <>
          <span id="desc">This card contains project information</span>
          <Card aria-describedby="desc">Project</Card>
        </>,
      );

      const card = screen.getByText("Project").closest("div");
      expect(card).toHaveAttribute("aria-describedby", "desc");
    });

    it("hoverable 卡片应该可以通过 Tab 键聚焦（如果有 tabIndex）", async () => {
      const user = userEvent.setup();
      render(
        <Card hoverable tabIndex={0}>
          Focusable
        </Card>,
      );

      await user.tab();

      const card = screen.getByText("Focusable").closest("div");
      expect(card).toHaveFocus();
    });

    it("应该支持键盘操作", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Card
          hoverable
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleClick();
          }}
        >
          Keyboard
        </Card>,
      );

      const card = screen.getByText("Keyboard").closest("div");
      card?.focus();
      await user.keyboard("{Enter}");

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
