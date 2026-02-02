import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 textarea", () => {
      render(<Textarea />);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("应该显示 placeholder", () => {
      render(<Textarea placeholder="Enter text..." />);

      expect(screen.getByPlaceholderText("Enter text...")).toBeInTheDocument();
    });

    it("应该显示默认值", () => {
      render(<Textarea defaultValue="Default content" />);

      expect(screen.getByRole("textbox")).toHaveValue("Default content");
    });

    it("应该应用自定义 className", () => {
      render(<Textarea className="custom-class" />);

      expect(screen.getByRole("textbox")).toHaveClass("custom-class");
    });

    it("应该传递原生属性", () => {
      render(
        <Textarea
          data-testid="test-textarea"
          aria-label="Description"
          rows={5}
        />,
      );

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("data-testid", "test-textarea");
      expect(textarea).toHaveAttribute("aria-label", "Description");
      expect(textarea).toHaveAttribute("rows", "5");
    });
  });

  // ===========================================================================
  // 状态测试
  // ===========================================================================
  describe("状态", () => {
    it("应该渲染 error 状态样式", () => {
      render(<Textarea error placeholder="Error state" />);

      const textarea = screen.getByRole("textbox");
      // error 样式应该包含 error 颜色
      expect(textarea).toHaveClass("border-[var(--color-error)]");
    });

    it("应该渲染 disabled 状态", () => {
      render(<Textarea disabled placeholder="Disabled" />);

      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("disabled 状态应该有正确的样式", () => {
      render(<Textarea disabled />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveClass("disabled:opacity-50");
      expect(textarea).toHaveClass("disabled:cursor-not-allowed");
      expect(textarea).toHaveClass("disabled:resize-none");
    });

    it("应该渲染 fullWidth 样式", () => {
      render(<Textarea fullWidth />);

      expect(screen.getByRole("textbox")).toHaveClass("w-full");
    });

    it("error + disabled 组合应该正确渲染", () => {
      render(<Textarea error disabled />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeDisabled();
      expect(textarea).toHaveClass("border-[var(--color-error)]");
    });
  });

  // ===========================================================================
  // 交互测试
  // ===========================================================================
  describe("交互", () => {
    it("应该可以输入文本", async () => {
      const user = userEvent.setup();
      render(<Textarea />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Hello World");

      expect(textarea).toHaveValue("Hello World");
    });

    it("应该触发 onChange", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Textarea onChange={handleChange} />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Test");

      expect(handleChange).toHaveBeenCalled();
    });

    it("disabled 状态下不应该可以输入", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Textarea disabled onChange={handleChange} />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Test");

      expect(handleChange).not.toHaveBeenCalled();
      expect(textarea).toHaveValue("");
    });

    it("应该可以通过 Tab 键聚焦", async () => {
      const user = userEvent.setup();
      render(<Textarea />);

      await user.tab();

      expect(screen.getByRole("textbox")).toHaveFocus();
    });

    it("disabled 时不应该可以通过 Tab 键聚焦", async () => {
      const user = userEvent.setup();
      render(<Textarea disabled />);

      await user.tab();

      expect(screen.getByRole("textbox")).not.toHaveFocus();
    });

    it("应该支持多行输入", async () => {
      const user = userEvent.setup();
      render(<Textarea />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Line 1{enter}Line 2{enter}Line 3");

      expect(textarea).toHaveValue("Line 1\nLine 2\nLine 3");
    });
  });

  // ===========================================================================
  // 受控模式测试
  // ===========================================================================
  describe("受控模式", () => {
    it("应该支持受控值", () => {
      render(<Textarea value="Controlled value" onChange={() => {}} />);

      expect(screen.getByRole("textbox")).toHaveValue("Controlled value");
    });

    it("受控模式下应该响应外部值变化", () => {
      const { rerender } = render(
        <Textarea value="Initial" onChange={() => {}} />,
      );

      expect(screen.getByRole("textbox")).toHaveValue("Initial");

      rerender(<Textarea value="Updated" onChange={() => {}} />);

      expect(screen.getByRole("textbox")).toHaveValue("Updated");
    });
  });

  // ===========================================================================
  // Focus 样式测试
  // ===========================================================================
  describe("Focus 样式", () => {
    it("应该有 focus-visible 相关类", () => {
      render(<Textarea />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveClass("focus-visible:outline");
      expect(textarea).toHaveClass(
        "focus-visible:border-[var(--color-border-focus)]",
      );
    });
  });

  // ===========================================================================
  // CSS Variables 检查
  // ===========================================================================
  describe("CSS Variables", () => {
    it("class 中不应该包含硬编码的十六进制颜色", () => {
      render(<Textarea />);

      const textarea = screen.getByRole("textbox");
      const classNames = textarea.className;

      expect(classNames).not.toMatch(/#[0-9a-fA-F]{3,6}(?![0-9a-fA-F])/);
    });

    it("应该使用 CSS Variables 定义颜色", () => {
      render(<Textarea />);

      const textarea = screen.getByRole("textbox");
      const classNames = textarea.className;

      expect(classNames).toContain("var(--");
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("应该处理空内容", () => {
      render(<Textarea defaultValue="" />);

      expect(screen.getByRole("textbox")).toHaveValue("");
    });

    it("应该处理超长内容", () => {
      const longContent = "A".repeat(10000);
      render(<Textarea defaultValue={longContent} />);

      expect(screen.getByRole("textbox")).toHaveValue(longContent);
    });

    it("应该处理特殊字符", async () => {
      const user = userEvent.setup();
      render(<Textarea />);

      const textarea = screen.getByRole("textbox");
      const specialChars = "Special chars: <>&\"'`@#$%^*()";
      await user.type(textarea, specialChars);

      expect(textarea).toHaveValue(specialChars);
    });

    it("应该处理 Unicode 字符", async () => {
      const user = userEvent.setup();
      render(<Textarea />);

      const textarea = screen.getByRole("textbox");
      const unicodeText = "中文测试 日本語 한국어 🎉🚀";
      await user.type(textarea, unicodeText);

      expect(textarea).toHaveValue(unicodeText);
    });

    it("应该处理 rows 属性", () => {
      render(<Textarea rows={10} />);

      expect(screen.getByRole("textbox")).toHaveAttribute("rows", "10");
    });

    it("应该保持默认的最小高度", () => {
      render(<Textarea />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveClass("min-h-20");
    });
  });

  // ===========================================================================
  // Resize 行为测试
  // ===========================================================================
  describe("Resize 行为", () => {
    it("正常状态应该有 resize-y 类", () => {
      render(<Textarea />);

      expect(screen.getByRole("textbox")).toHaveClass("resize-y");
    });

    it("disabled 状态应该有 resize-none 类", () => {
      render(<Textarea disabled />);

      expect(screen.getByRole("textbox")).toHaveClass("disabled:resize-none");
    });
  });

  // ===========================================================================
  // 状态组合矩阵测试
  // ===========================================================================
  describe("状态组合矩阵", () => {
    const errorStates = [false, true];
    const disabledStates = [false, true];
    const fullWidthStates = [false, true];

    const combinations = errorStates.flatMap((error) =>
      disabledStates.flatMap((disabled) =>
        fullWidthStates.map((fullWidth) => ({ error, disabled, fullWidth })),
      ),
    );

    it.each(combinations)(
      "应该正确渲染 error=$error × disabled=$disabled × fullWidth=$fullWidth 组合",
      ({ error, disabled, fullWidth }) => {
        render(
          <Textarea error={error} disabled={disabled} fullWidth={fullWidth} />,
        );

        const textarea = screen.getByRole("textbox");
        expect(textarea).toBeInTheDocument();

        if (disabled) {
          expect(textarea).toBeDisabled();
        } else {
          expect(textarea).not.toBeDisabled();
        }

        if (error) {
          expect(textarea).toHaveClass("border-[var(--color-error)]");
        }

        if (fullWidth) {
          expect(textarea).toHaveClass("w-full");
        }
      },
    );
  });

  // ===========================================================================
  // 无障碍 (a11y) 测试
  // ===========================================================================
  describe("无障碍", () => {
    it("应该有正确的 role", () => {
      render(<Textarea />);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("应该支持 aria-label", () => {
      render(<Textarea aria-label="Description field" />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAccessibleName("Description field");
    });

    it("应该支持 aria-describedby", () => {
      render(
        <>
          <span id="help">Enter your description here</span>
          <Textarea aria-describedby="help" />
        </>,
      );

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("aria-describedby", "help");
    });

    it("应该支持 aria-invalid", () => {
      render(<Textarea aria-invalid="true" />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("aria-invalid", "true");
    });

    it("disabled 状态应该被正确暴露", () => {
      render(<Textarea disabled />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("disabled");
    });

    it("应该支持 required 属性", () => {
      render(<Textarea required />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("required");
    });
  });

  // ===========================================================================
  // 表单集成测试
  // ===========================================================================
  describe("表单集成", () => {
    it("应该支持 name 属性", () => {
      render(<Textarea name="description" />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("name", "description");
    });

    it("应该支持 id 属性", () => {
      render(<Textarea id="my-textarea" />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("id", "my-textarea");
    });

    it("应该可以和 label 关联", () => {
      render(
        <>
          <label htmlFor="desc">Description</label>
          <Textarea id="desc" />
        </>,
      );

      expect(screen.getByLabelText("Description")).toBeInTheDocument();
    });
  });
});
