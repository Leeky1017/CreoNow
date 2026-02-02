import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiffView } from "./DiffView";

describe("DiffView", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 DiffView 组件", () => {
      render(<DiffView diffText="test diff" />);

      const panel = screen.getByTestId("ai-diff");
      expect(panel).toBeInTheDocument();
    });

    it("应该显示 diff 文本", () => {
      const diffText = `--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,3 @@
 Line 1
-Old line
+New line
 Line 3`;

      render(<DiffView diffText={diffText} />);

      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
      expect(screen.getByText(/Old line/)).toBeInTheDocument();
      expect(screen.getByText(/New line/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 空状态测试
  // ===========================================================================
  describe("空状态", () => {
    it("空 diffText 时应渲染空容器", () => {
      render(<DiffView diffText="" />);

      const panel = screen.getByTestId("ai-diff");
      expect(panel).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 长文本测试
  // ===========================================================================
  describe("长文本", () => {
    it("应该正确显示长 diff", () => {
      const longDiff = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join("\n");

      render(<DiffView diffText={longDiff} />);

      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
      expect(screen.getByText(/Line 50/)).toBeInTheDocument();
    });

    it("容器应该可滚动", () => {
      const longDiff = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join("\n");

      render(<DiffView diffText={longDiff} />);

      const panel = screen.getByTestId("ai-diff");
      expect(panel).toHaveClass("overflow-auto");
    });
  });

  // ===========================================================================
  // 样式测试
  // ===========================================================================
  describe("样式", () => {
    it("应该有边框", () => {
      render(<DiffView diffText="test" />);

      const panel = screen.getByTestId("ai-diff");
      expect(panel).toHaveClass("border");
    });

    it("应该有圆角", () => {
      render(<DiffView diffText="test" />);

      const panel = screen.getByTestId("ai-diff");
      expect(panel.className).toContain("rounded");
    });

    it("应该有 padding", () => {
      render(<DiffView diffText="test" />);

      const panel = screen.getByTestId("ai-diff");
      expect(panel).toHaveClass("p-2.5");
    });

    it("文本应该使用代码字体", () => {
      render(<DiffView diffText="test" />);

      const text = screen.getByText("test");
      expect(text.className).toContain("font-[var(--font-family-mono)]");
    });

    it("文本应该保留空白", () => {
      render(<DiffView diffText="test" />);

      const text = screen.getByText("test");
      expect(text).toHaveClass("whitespace-pre-wrap");
    });

    it("文本应该可断行", () => {
      render(<DiffView diffText="test" />);

      const text = screen.getByText("test");
      expect(text).toHaveClass("break-words");
    });
  });

  // ===========================================================================
  // 特殊字符测试
  // ===========================================================================
  describe("特殊字符", () => {
    it("应该正确显示特殊字符", () => {
      const specialDiff = `--- a/file.txt
+++ b/file.txt
@@ -1 +1 @@
-<div class="old">Hello</div>
+<div class="new">Hello</div>`;

      render(<DiffView diffText={specialDiff} />);

      expect(screen.getByText(/Hello/)).toBeInTheDocument();
    });
  });
});
