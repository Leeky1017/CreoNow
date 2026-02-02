import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SpinnerSize } from "./Spinner";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 SVG 元素", () => {
      render(<Spinner />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("应该有 animate-spin 类", () => {
      render(<Spinner />);

      expect(screen.getByRole("status")).toHaveClass("animate-spin");
    });

    it("应该有默认的 aria-label", () => {
      render(<Spinner />);

      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Loading",
      );
    });

    it("应该支持自定义 label", () => {
      render(<Spinner label="Please wait..." />);

      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Please wait...",
      );
    });

    it("应该应用自定义 className", () => {
      render(<Spinner className="custom-class" />);

      expect(screen.getByRole("status")).toHaveClass("custom-class");
    });
  });

  // ===========================================================================
  // Size 测试
  // ===========================================================================
  describe("sizes", () => {
    const sizeMap: Record<SpinnerSize, number> = {
      xs: 12,
      sm: 16,
      md: 24,
      lg: 32,
      xl: 48,
    };

    it.each(Object.entries(sizeMap))(
      "应该渲染 %s size 并有 %s 像素尺寸",
      (size, expectedDimension) => {
        render(<Spinner size={size as SpinnerSize} />);

        const spinner = screen.getByRole("status");
        expect(spinner).toHaveAttribute("width", String(expectedDimension));
        expect(spinner).toHaveAttribute("height", String(expectedDimension));
      },
    );

    it("默认应该是 md size (24px)", () => {
      render(<Spinner />);

      const spinner = screen.getByRole("status");
      expect(spinner).toHaveAttribute("width", "24");
      expect(spinner).toHaveAttribute("height", "24");
    });
  });

  // ===========================================================================
  // SVG 结构测试
  // ===========================================================================
  describe("SVG 结构", () => {
    it("应该有 circle 和 path 元素", () => {
      const { container } = render(<Spinner />);

      expect(container.querySelector("circle")).toBeInTheDocument();
      expect(container.querySelector("path")).toBeInTheDocument();
    });

    it("应该有正确的 viewBox", () => {
      render(<Spinner />);

      expect(screen.getByRole("status")).toHaveAttribute(
        "viewBox",
        "0 0 24 24",
      );
    });
  });

  // ===========================================================================
  // 无障碍测试
  // ===========================================================================
  describe("无障碍", () => {
    it("应该有 role=status", () => {
      render(<Spinner />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("应该有 aria-label", () => {
      render(<Spinner label="Loading data" />);

      expect(screen.getByRole("status")).toHaveAccessibleName("Loading data");
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("应该支持传递原生 SVG 属性", () => {
      render(<Spinner data-testid="test-spinner" />);

      expect(screen.getByTestId("test-spinner")).toBeInTheDocument();
    });

    it("应该继承 text-current 类", () => {
      render(<Spinner />);

      expect(screen.getByRole("status")).toHaveClass("text-current");
    });
  });

  // ===========================================================================
  // Size 矩阵测试
  // ===========================================================================
  describe("Size 矩阵", () => {
    const sizes: SpinnerSize[] = ["xs", "sm", "md", "lg", "xl"];

    it.each(sizes)("应该正确渲染 %s size", (size) => {
      render(<Spinner size={size} />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });
});
