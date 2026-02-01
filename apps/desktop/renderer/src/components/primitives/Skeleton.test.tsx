import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SkeletonVariant } from "./Skeleton";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 skeleton 元素", () => {
      render(<Skeleton />);

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("应该有正确的 aria 属性", () => {
      render(<Skeleton />);

      const skeleton = screen.getByRole("progressbar");
      expect(skeleton).toHaveAttribute("aria-busy", "true");
      expect(skeleton).toHaveAttribute("aria-label", "Loading...");
    });

    it("应该应用自定义 className", () => {
      render(<Skeleton className="custom-class" />);

      expect(screen.getByRole("progressbar")).toHaveClass("custom-class");
    });
  });

  // ===========================================================================
  // Variant 测试
  // ===========================================================================
  describe("variants", () => {
    const variants: SkeletonVariant[] = ["text", "circular", "rectangular"];

    it.each(variants)("应该渲染 %s variant", (variant) => {
      render(<Skeleton variant={variant} />);

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("text variant 应该有 rounded-sm", () => {
      render(<Skeleton variant="text" />);

      expect(screen.getByRole("progressbar")).toHaveClass("rounded-[var(--radius-sm)]");
    });

    it("circular variant 应该有 rounded-full", () => {
      render(<Skeleton variant="circular" />);

      expect(screen.getByRole("progressbar")).toHaveClass("rounded-[var(--radius-full)]");
    });

    it("rectangular variant 应该有 rounded-md", () => {
      render(<Skeleton variant="rectangular" />);

      expect(screen.getByRole("progressbar")).toHaveClass("rounded-[var(--radius-md)]");
    });
  });

  // ===========================================================================
  // 尺寸测试
  // ===========================================================================
  describe("尺寸", () => {
    it("应该接受数字 width/height", () => {
      render(<Skeleton width={100} height={50} />);

      const skeleton = screen.getByRole("progressbar");
      expect(skeleton).toHaveStyle({ width: "100px", height: "50px" });
    });

    it("应该接受字符串 width/height", () => {
      render(<Skeleton width="80%" height="2rem" />);

      const skeleton = screen.getByRole("progressbar");
      expect(skeleton).toHaveStyle({ width: "80%", height: "2rem" });
    });

    it("text variant 默认宽度 100%，高度 1em", () => {
      render(<Skeleton variant="text" />);

      const skeleton = screen.getByRole("progressbar");
      expect(skeleton).toHaveStyle({ width: "100%", height: "1em" });
    });

    it("circular variant 默认 40x40", () => {
      render(<Skeleton variant="circular" />);

      const skeleton = screen.getByRole("progressbar");
      expect(skeleton).toHaveStyle({ width: "40px", height: "40px" });
    });
  });

  // ===========================================================================
  // 动画测试
  // ===========================================================================
  describe("动画", () => {
    it("默认应该启用动画", () => {
      render(<Skeleton />);

      expect(screen.getByRole("progressbar")).toHaveClass("before:animate-shimmer");
    });

    it("animate=false 时不应该有动画类", () => {
      render(<Skeleton animate={false} />);

      expect(screen.getByRole("progressbar")).not.toHaveClass("before:animate-shimmer");
    });
  });

  // ===========================================================================
  // CSS Variables 检查
  // ===========================================================================
  describe("CSS Variables", () => {
    it("应该使用 CSS Variables 定义颜色", () => {
      render(<Skeleton />);

      const skeleton = screen.getByRole("progressbar");
      expect(skeleton.className).toContain("var(--");
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("应该支持自定义 style", () => {
      render(<Skeleton style={{ marginTop: "10px" }} />);

      expect(screen.getByRole("progressbar")).toHaveStyle({ marginTop: "10px" });
    });

    it("应该传递原生属性", () => {
      render(<Skeleton data-testid="test-skeleton" />);

      expect(screen.getByTestId("test-skeleton")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Variant 矩阵测试
  // ===========================================================================
  describe("Variant 矩阵", () => {
    const variants: SkeletonVariant[] = ["text", "circular", "rectangular"];
    const animateStates = [true, false];

    const combinations = variants.flatMap((variant) =>
      animateStates.map((animate) => ({ variant, animate })),
    );

    it.each(combinations)(
      "应该正确渲染 $variant + animate=$animate 组合",
      ({ variant, animate }) => {
        render(<Skeleton variant={variant} animate={animate} />);

        expect(screen.getByRole("progressbar")).toBeInTheDocument();
      },
    );
  });
});
