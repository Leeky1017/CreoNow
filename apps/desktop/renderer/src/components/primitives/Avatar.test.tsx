import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { AvatarSize } from "./Avatar";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 fallback 首字母", () => {
      render(<Avatar fallback="John Doe" />);

      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("应该渲染单字名字的首字母", () => {
      render(<Avatar fallback="Admin" />);

      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("应该渲染图片", () => {
      const { container } = render(<Avatar src="/test.jpg" alt="Test User" />);

      const imgElement = container.querySelector("img");
      expect(imgElement).toBeInTheDocument();
      expect(imgElement).toHaveAttribute("src", "/test.jpg");
    });

    it("应该应用自定义 className", () => {
      render(<Avatar fallback="JD" className="custom-class" />);

      expect(screen.getByRole("img")).toHaveClass("custom-class");
    });

    it("应该有正确的 aria-label", () => {
      render(<Avatar fallback="John Doe" />);

      expect(screen.getByRole("img")).toHaveAttribute("aria-label", "John Doe");
    });

    it("图片有 alt 时应该使用 alt 作为 aria-label", () => {
      const { container } = render(<Avatar src="/test.jpg" alt="Test User" />);

      // The outer div wrapper has role="img" and aria-label
      const wrapper = container.querySelector('[role="img"][aria-label]');
      expect(wrapper).toHaveAttribute("aria-label", "Test User");
    });
  });

  // ===========================================================================
  // Size 测试
  // ===========================================================================
  describe("sizes", () => {
    const sizeClasses: Record<AvatarSize, string> = {
      xs: "w-6",
      sm: "w-8",
      md: "w-10",
      lg: "w-14",
      xl: "w-20",
    };

    it.each(Object.entries(sizeClasses))(
      "应该渲染 %s size 并有 %s 类",
      (size, expectedClass) => {
        render(<Avatar fallback="JD" size={size as AvatarSize} />);

        expect(screen.getByRole("img")).toHaveClass(expectedClass);
      },
    );

    it("默认应该是 md size", () => {
      render(<Avatar fallback="JD" />);

      expect(screen.getByRole("img")).toHaveClass("w-10");
    });
  });

  // ===========================================================================
  // 图片加载错误处理
  // ===========================================================================
  describe("图片加载错误", () => {
    it("图片加载失败时应该显示 fallback", () => {
      render(<Avatar src="/invalid.jpg" fallback="Error User" />);

      const img = screen.getByRole("img");
      const imgElement = img.querySelector("img");

      // 触发图片加载错误
      if (imgElement) {
        fireEvent.error(imgElement);
      }

      // 应该显示 fallback
      expect(screen.getByText("EU")).toBeInTheDocument();
    });

    it("无 fallback 时应该显示 ?", () => {
      render(<Avatar />);

      expect(screen.getByText("?")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 首字母提取测试
  // ===========================================================================
  describe("首字母提取", () => {
    it("应该提取两个单词的首字母", () => {
      render(<Avatar fallback="John Doe" />);
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("应该提取三个单词的首尾首字母", () => {
      render(<Avatar fallback="John Middle Doe" />);
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("应该处理小写字母", () => {
      render(<Avatar fallback="john doe" />);
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("应该处理多余空格", () => {
      render(<Avatar fallback="  John   Doe  " />);
      expect(screen.getByText("JD")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // CSS Variables 检查
  // ===========================================================================
  describe("CSS Variables", () => {
    it("应该使用 CSS Variables 定义颜色", () => {
      render(<Avatar fallback="JD" />);

      const avatar = screen.getByRole("img");
      expect(avatar.className).toContain("var(--");
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("应该处理空 fallback", () => {
      render(<Avatar fallback="" />);

      expect(screen.getByText("?")).toBeInTheDocument();
    });

    it("应该处理单字符 fallback", () => {
      render(<Avatar fallback="A" />);

      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("应该处理 emoji 名字", () => {
      render(<Avatar fallback="🎉 Party" />);

      // emoji 作为首字符
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Size 矩阵测试
  // ===========================================================================
  describe("Size 矩阵", () => {
    const sizes: AvatarSize[] = ["xs", "sm", "md", "lg", "xl"];

    it.each(sizes)("应该正确渲染 %s size", (size) => {
      render(<Avatar fallback="Test" size={size} />);

      expect(screen.getByRole("img")).toBeInTheDocument();
    });
  });
});
