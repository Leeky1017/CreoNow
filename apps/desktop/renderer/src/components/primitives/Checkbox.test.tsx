import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 checkbox", () => {
      render(<Checkbox />);

      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    it("应该渲染带 label 的 checkbox", () => {
      render(<Checkbox label="Accept terms" />);

      expect(screen.getByRole("checkbox")).toBeInTheDocument();
      expect(screen.getByText("Accept terms")).toBeInTheDocument();
    });

    it("label 应该和 checkbox 关联", () => {
      render(<Checkbox label="Test label" />);

      const checkbox = screen.getByRole("checkbox");
      const label = screen.getByText("Test label");

      // label 的 for 应该匹配 checkbox 的 id
      expect(label).toHaveAttribute("for", checkbox.id);
    });

    it("应该应用自定义 className", () => {
      render(<Checkbox className="custom-class" />);

      expect(screen.getByRole("checkbox")).toHaveClass("custom-class");
    });

    it("应该传递原生属性", () => {
      render(<Checkbox data-testid="test-checkbox" aria-label="Test" />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveAttribute("data-testid", "test-checkbox");
      expect(checkbox).toHaveAttribute("aria-label", "Test");
    });
  });

  // ===========================================================================
  // 状态测试
  // ===========================================================================
  describe("状态", () => {
    it("默认应该是未选中状态", () => {
      render(<Checkbox label="Unchecked" />);

      expect(screen.getByRole("checkbox")).not.toBeChecked();
    });

    it("应该渲染已选中状态", () => {
      render(<Checkbox label="Checked" checked={true} />);

      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("应该渲染未选中状态（显式设置）", () => {
      render(<Checkbox label="Unchecked" checked={false} />);

      expect(screen.getByRole("checkbox")).not.toBeChecked();
    });

    it("应该渲染 indeterminate 状态", () => {
      render(<Checkbox label="Indeterminate" checked="indeterminate" />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveAttribute("data-state", "indeterminate");
    });

    it("应该渲染 disabled 状态", () => {
      render(<Checkbox label="Disabled" disabled />);

      expect(screen.getByRole("checkbox")).toBeDisabled();
    });

    it("disabled + checked 组合应该正确渲染", () => {
      render(<Checkbox label="Disabled checked" disabled checked={true} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeDisabled();
      expect(checkbox).toBeChecked();
    });

    it("disabled + indeterminate 组合应该正确渲染", () => {
      render(
        <Checkbox
          label="Disabled indeterminate"
          disabled
          checked="indeterminate"
        />,
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeDisabled();
      expect(checkbox).toHaveAttribute("data-state", "indeterminate");
    });
  });

  // ===========================================================================
  // 交互测试
  // ===========================================================================
  describe("交互", () => {
    it("点击应该触发 onCheckedChange", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox label="Toggle" onCheckedChange={handleChange} />);

      await user.click(screen.getByRole("checkbox"));

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("从 checked 状态点击应该变为 unchecked", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Checkbox
          label="Toggle"
          checked={true}
          onCheckedChange={handleChange}
        />,
      );

      await user.click(screen.getByRole("checkbox"));

      expect(handleChange).toHaveBeenCalledWith(false);
    });

    it("点击 label 应该触发 onCheckedChange", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox label="Click me" onCheckedChange={handleChange} />);

      await user.click(screen.getByText("Click me"));

      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it("disabled 状态下点击不应该触发 onCheckedChange", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Checkbox label="Disabled" disabled onCheckedChange={handleChange} />,
      );

      await user.click(screen.getByRole("checkbox"));

      expect(handleChange).not.toHaveBeenCalled();
    });

    it("应该可以通过 Tab 键聚焦", async () => {
      const user = userEvent.setup();
      render(<Checkbox label="Focus me" />);

      await user.tab();

      expect(screen.getByRole("checkbox")).toHaveFocus();
    });

    it("disabled 时不应该可以通过 Tab 键聚焦", async () => {
      const user = userEvent.setup();
      render(<Checkbox label="Cannot focus" disabled />);

      await user.tab();

      expect(screen.getByRole("checkbox")).not.toHaveFocus();
    });

    it("应该可以通过 Space 键切换状态", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox label="Toggle" onCheckedChange={handleChange} />);

      // 先聚焦
      await user.tab();
      // 按 Space 键
      await user.keyboard(" ");

      expect(handleChange).toHaveBeenCalledWith(true);
    });
  });

  // ===========================================================================
  // Focus 样式测试
  // ===========================================================================
  describe("Focus 样式", () => {
    it("应该有 focus-visible 相关类", () => {
      render(<Checkbox label="Focus Test" />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveClass("focus-visible:outline");
    });
  });

  // ===========================================================================
  // CSS Variables 检查
  // ===========================================================================
  describe("CSS Variables", () => {
    it("class 中不应该包含硬编码的十六进制颜色", () => {
      const { container } = render(<Checkbox label="Test" checked={true} />);

      const checkbox = container.querySelector('[role="checkbox"]');
      const classNames = checkbox?.className ?? "";

      // 检查 class 中不包含硬编码的颜色值
      expect(classNames).not.toMatch(/#[0-9a-fA-F]{3,6}(?![0-9a-fA-F])/);
    });

    it("应该使用 CSS Variables 定义颜色", () => {
      const { container } = render(<Checkbox label="Test" />);

      const checkbox = container.querySelector('[role="checkbox"]');
      const classNames = checkbox?.className ?? "";

      // 检查使用了 CSS Variables
      expect(classNames).toContain("var(--");
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("应该处理空 label", () => {
      render(<Checkbox label="" />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
    });

    it("应该处理超长 label", () => {
      const longLabel =
        "This is an extremely long label text that should still render correctly and be associated with the checkbox";
      render(<Checkbox label={longLabel} />);

      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });

    it("应该处理不提供 label 的情况", () => {
      render(<Checkbox />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
      // 不应该有 label 元素
      expect(checkbox.parentElement?.querySelector("label")).toBeNull();
    });

    it("应该处理自定义 id", () => {
      render(<Checkbox id="custom-id" label="Custom ID" />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveAttribute("id", "custom-id");

      const label = screen.getByText("Custom ID");
      expect(label).toHaveAttribute("for", "custom-id");
    });
  });

  // ===========================================================================
  // Indeterminate 状态特殊测试
  // ===========================================================================
  describe("Indeterminate 状态", () => {
    it("indeterminate 状态点击应该变为 checked", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Checkbox
          label="Indeterminate"
          checked="indeterminate"
          onCheckedChange={handleChange}
        />,
      );

      await user.click(screen.getByRole("checkbox"));

      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("应该显示正确的 data-state 属性", () => {
      const { rerender } = render(<Checkbox checked={false} />);

      expect(screen.getByRole("checkbox")).toHaveAttribute(
        "data-state",
        "unchecked",
      );

      rerender(<Checkbox checked={true} />);
      expect(screen.getByRole("checkbox")).toHaveAttribute(
        "data-state",
        "checked",
      );

      rerender(<Checkbox checked="indeterminate" />);
      expect(screen.getByRole("checkbox")).toHaveAttribute(
        "data-state",
        "indeterminate",
      );
    });
  });

  // ===========================================================================
  // 无障碍 (a11y) 测试
  // ===========================================================================
  describe("无障碍", () => {
    it("应该有正确的 role", () => {
      render(<Checkbox label="Accessible" />);

      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    it("应该支持 aria-label", () => {
      render(<Checkbox aria-label="Custom accessible name" />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveAccessibleName("Custom accessible name");
    });

    it("label 应该作为 accessible name", () => {
      render(<Checkbox label="My Label" />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveAccessibleName("My Label");
    });

    it("disabled 状态应该被正确暴露", () => {
      render(<Checkbox label="Disabled" disabled />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveAttribute("data-disabled", "");
    });
  });

  // ===========================================================================
  // 全组合矩阵测试
  // ===========================================================================
  describe("状态组合矩阵", () => {
    const checkedStates = [false, true, "indeterminate" as const];
    const disabledStates = [false, true];

    const combinations = checkedStates.flatMap((checked) =>
      disabledStates.map((disabled) => ({ checked, disabled })),
    );

    it.each(combinations)(
      "应该正确渲染 checked=$checked × disabled=$disabled 组合",
      ({ checked, disabled }) => {
        render(<Checkbox checked={checked} disabled={disabled} label="Test" />);

        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeInTheDocument();

        if (disabled) {
          expect(checkbox).toBeDisabled();
        } else {
          expect(checkbox).not.toBeDisabled();
        }

        if (checked === true) {
          expect(checkbox).toHaveAttribute("data-state", "checked");
        } else if (checked === "indeterminate") {
          expect(checkbox).toHaveAttribute("data-state", "indeterminate");
        } else {
          expect(checkbox).toHaveAttribute("data-state", "unchecked");
        }
      },
    );
  });
});
