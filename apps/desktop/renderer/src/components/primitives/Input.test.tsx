import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { Input } from "./Input";

describe("Input", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染输入框", () => {
      render(<Input placeholder="Enter text" />);

      expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
    });

    it("应该渲染默认值", () => {
      render(<Input defaultValue="Hello World" />);

      expect(screen.getByRole("textbox")).toHaveValue("Hello World");
    });

    it("应该应用自定义 className", () => {
      render(<Input className="custom-class" />);

      expect(screen.getByRole("textbox")).toHaveClass("custom-class");
    });

    it("应该传递原生 input 属性", () => {
      render(
        <Input
          data-testid="test-input"
          aria-label="Test input"
          name="test"
        />,
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("data-testid", "test-input");
      expect(input).toHaveAttribute("aria-label", "Test input");
      expect(input).toHaveAttribute("name", "test");
    });

    it("应该支持 ref 转发", () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  // ===========================================================================
  // 状态测试
  // ===========================================================================
  describe("状态", () => {
    it("应该处理 error 状态", () => {
      render(<Input error />);

      const input = screen.getByRole("textbox");
      // Error 状态应该有红色边框类
      expect(input).toHaveClass("border-[var(--color-error)]");
    });

    it("应该处理 disabled 状态", () => {
      render(<Input disabled />);

      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
      expect(input).toHaveClass("disabled:opacity-50");
    });

    it("应该处理 readOnly 状态", () => {
      render(<Input readOnly defaultValue="Read only" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("readonly");
    });

    it("应该渲染 fullWidth 样式", () => {
      render(<Input fullWidth />);

      expect(screen.getByRole("textbox")).toHaveClass("w-full");
    });

    it("应该同时支持 error 和 disabled", () => {
      render(<Input error disabled defaultValue="Error + Disabled" />);

      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
      expect(input).toHaveClass("border-[var(--color-error)]");
    });
  });

  // ===========================================================================
  // 交互测试
  // ===========================================================================
  describe("交互", () => {
    it("应该能输入文本", async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Hello World");

      expect(input).toHaveValue("Hello World");
    });

    it("应该调用 onChange", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<Input onChange={handleChange} />);

      await user.type(screen.getByRole("textbox"), "a");

      expect(handleChange).toHaveBeenCalled();
    });

    it("disabled 状态下不应该可编辑", async () => {
      const user = userEvent.setup();
      render(<Input disabled defaultValue="test" />);

      const input = screen.getByRole("textbox");
      await user.type(input, "new text");

      expect(input).toHaveValue("test");
    });

    it("readOnly 状态下不应该可编辑", async () => {
      const user = userEvent.setup();
      render(<Input readOnly defaultValue="test" />);

      const input = screen.getByRole("textbox");
      await user.type(input, "new text");

      expect(input).toHaveValue("test");
    });

    it("应该可以通过 Tab 键聚焦", async () => {
      const user = userEvent.setup();
      render(<Input />);

      await user.tab();

      expect(screen.getByRole("textbox")).toHaveFocus();
    });

    it("disabled 时不应该可以通过 Tab 键聚焦", async () => {
      const user = userEvent.setup();
      render(<Input disabled />);

      await user.tab();

      expect(screen.getByRole("textbox")).not.toHaveFocus();
    });

    it("readOnly 时应该可以通过 Tab 键聚焦", async () => {
      const user = userEvent.setup();
      render(<Input readOnly />);

      await user.tab();

      expect(screen.getByRole("textbox")).toHaveFocus();
    });
  });

  // ===========================================================================
  // Focus 样式测试
  // ===========================================================================
  describe("Focus 样式", () => {
    it("应该有 focus-visible 相关类", () => {
      render(<Input />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("focus-visible:outline");
      expect(input).toHaveClass("focus-visible:border-[var(--color-border-focus)]");
    });
  });

  // ===========================================================================
  // CSS Variables 检查（不使用硬编码颜色）
  // ===========================================================================
  describe("CSS Variables", () => {
    it("class 中不应该包含硬编码的十六进制颜色", () => {
      const { container } = render(<Input />);

      const input = container.querySelector("input");
      const classNames = input?.className ?? "";

      // 检查 class 中不包含硬编码的颜色值
      expect(classNames).not.toMatch(/#[0-9a-fA-F]{3,6}(?![0-9a-fA-F])/);
    });

    it("应该使用 CSS Variables 定义颜色", () => {
      const { container } = render(<Input />);

      const input = container.querySelector("input");
      const classNames = input?.className ?? "";

      // 检查使用了 CSS Variables
      expect(classNames).toContain("var(--");
    });
  });

  // ===========================================================================
  // 输入类型测试
  // ===========================================================================
  describe("输入类型", () => {
    it("应该支持 password 类型", () => {
      render(<Input type="password" />);

      // password 类型不是 textbox role
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it("应该支持 email 类型", () => {
      render(<Input type="email" />);

      expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
    });

    it("应该支持 number 类型", () => {
      render(<Input type="number" />);

      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });

    it("应该支持 search 类型", () => {
      render(<Input type="search" />);

      expect(screen.getByRole("searchbox")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("应该处理空字符串值", () => {
      render(<Input defaultValue="" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("");
    });

    it("应该处理超长文本", async () => {
      const longText =
        "This is an extremely long input text that should still render correctly without breaking the layout and should scroll horizontally";
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole("textbox");
      await user.type(input, longText);

      expect(input).toHaveValue(longText);
    });

    it("应该处理单字符", async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole("textbox");
      await user.type(input, "X");

      expect(input).toHaveValue("X");
    });

    it("应该处理 emoji", async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Hello 🌍 World 🚀");

      expect(input).toHaveValue("Hello 🌍 World 🚀");
    });

    it("应该处理中文输入", async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole("textbox");
      await user.type(input, "你好世界");

      expect(input).toHaveValue("你好世界");
    });

    it("应该处理特殊字符", async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole("textbox");
      await user.type(input, "<script>alert('xss')</script>");

      expect(input).toHaveValue("<script>alert('xss')</script>");
    });
  });

  // ===========================================================================
  // Placeholder 测试
  // ===========================================================================
  describe("Placeholder", () => {
    it("应该显示 placeholder", () => {
      render(<Input placeholder="Enter text here" />);

      expect(screen.getByPlaceholderText("Enter text here")).toBeInTheDocument();
    });

    it("有值时应该显示值而不是 placeholder", () => {
      render(<Input placeholder="Enter text" defaultValue="Actual value" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("Actual value");
    });
  });

  // ===========================================================================
  // 无障碍 (a11y) 测试
  // ===========================================================================
  describe("无障碍", () => {
    it("应该支持 aria-label", () => {
      render(<Input aria-label="Email address" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAccessibleName("Email address");
    });

    it("应该支持 aria-describedby", () => {
      render(
        <>
          <span id="desc">Enter your email address</span>
          <Input aria-describedby="desc" />
        </>,
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "desc");
    });

    it("应该支持 aria-invalid", () => {
      render(<Input aria-invalid="true" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("应该支持 aria-required", () => {
      render(<Input aria-required="true" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-required", "true");
    });

    it("disabled 输入框应该有正确的属性", () => {
      render(<Input disabled />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("disabled");
    });
  });

  // ===========================================================================
  // 受控组件测试
  // ===========================================================================
  describe("受控组件", () => {
    it("应该支持受控 value", () => {
      const { rerender } = render(<Input value="initial" onChange={() => {}} />);

      expect(screen.getByRole("textbox")).toHaveValue("initial");

      rerender(<Input value="updated" onChange={() => {}} />);

      expect(screen.getByRole("textbox")).toHaveValue("updated");
    });
  });
});
