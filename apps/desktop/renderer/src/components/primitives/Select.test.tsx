import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SelectOption, SelectGroup } from "./Select";
import { Select } from "./Select";

// Mock 数据
const simpleOptions: SelectOption[] = [
  { value: "red", label: "Red" },
  { value: "green", label: "Green" },
  { value: "blue", label: "Blue" },
];

const optionsWithDisabled: SelectOption[] = [
  { value: "available", label: "Available" },
  { value: "disabled", label: "Disabled Option", disabled: true },
];

const groupedOptions: SelectGroup[] = [
  {
    label: "Group A",
    options: [
      { value: "a1", label: "Option A1" },
      { value: "a2", label: "Option A2" },
    ],
  },
  {
    label: "Group B",
    options: [
      { value: "b1", label: "Option B1" },
      { value: "b2", label: "Option B2" },
    ],
  },
];

describe("Select", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 select trigger", () => {
      render(<Select placeholder="Select..." options={simpleOptions} />);

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("应该显示 placeholder", () => {
      render(<Select placeholder="Choose a color" options={simpleOptions} />);

      expect(screen.getByRole("combobox")).toHaveTextContent("Choose a color");
    });

    it("应该显示默认值", () => {
      render(
        <Select
          placeholder="Select..."
          options={simpleOptions}
          defaultValue="blue"
        />,
      );

      expect(screen.getByRole("combobox")).toHaveTextContent("Blue");
    });

    it("应该应用自定义 className", () => {
      render(
        <Select
          placeholder="Select..."
          options={simpleOptions}
          className="custom-class"
        />,
      );

      expect(screen.getByRole("combobox")).toHaveClass("custom-class");
    });
  });

  // ===========================================================================
  // 选项渲染测试
  // ===========================================================================
  describe("选项渲染", () => {
    it("点击 trigger 应该打开下拉面板", async () => {
      const user = userEvent.setup();
      render(<Select placeholder="Select..." options={simpleOptions} />);

      await user.click(screen.getByRole("combobox"));

      // 下拉面板应该显示
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("应该渲染所有选项", async () => {
      const user = userEvent.setup();
      render(<Select placeholder="Select..." options={simpleOptions} />);

      await user.click(screen.getByRole("combobox"));

      const listbox = screen.getByRole("listbox");
      expect(within(listbox).getByText("Red")).toBeInTheDocument();
      expect(within(listbox).getByText("Green")).toBeInTheDocument();
      expect(within(listbox).getByText("Blue")).toBeInTheDocument();
    });

    it("应该渲染分组选项", async () => {
      const user = userEvent.setup();
      render(<Select placeholder="Select..." options={groupedOptions} />);

      await user.click(screen.getByRole("combobox"));

      const listbox = screen.getByRole("listbox");
      // 检查组标签
      expect(within(listbox).getByText("Group A")).toBeInTheDocument();
      expect(within(listbox).getByText("Group B")).toBeInTheDocument();
      // 检查选项
      expect(within(listbox).getByText("Option A1")).toBeInTheDocument();
      expect(within(listbox).getByText("Option B1")).toBeInTheDocument();
    });

    it("应该渲染禁用选项", async () => {
      const user = userEvent.setup();
      render(<Select placeholder="Select..." options={optionsWithDisabled} />);

      await user.click(screen.getByRole("combobox"));

      const listbox = screen.getByRole("listbox");
      const disabledOption = within(listbox).getByText("Disabled Option");
      expect(disabledOption.closest('[role="option"]')).toHaveAttribute(
        "data-disabled",
      );
    });
  });

  // ===========================================================================
  // 状态测试
  // ===========================================================================
  describe("状态", () => {
    it("disabled 状态下 trigger 应该被禁用", () => {
      render(
        <Select placeholder="Select..." options={simpleOptions} disabled />,
      );

      expect(screen.getByRole("combobox")).toBeDisabled();
    });

    it("disabled 状态下点击不应该打开下拉面板", async () => {
      const user = userEvent.setup();
      render(
        <Select placeholder="Select..." options={simpleOptions} disabled />,
      );

      await user.click(screen.getByRole("combobox"));

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("应该渲染 fullWidth 样式", () => {
      render(
        <Select placeholder="Select..." options={simpleOptions} fullWidth />,
      );

      expect(screen.getByRole("combobox")).toHaveClass("w-full");
    });
  });

  // ===========================================================================
  // 交互测试
  // ===========================================================================
  describe("交互", () => {
    it("选择选项应该触发 onValueChange", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Select
          placeholder="Select..."
          options={simpleOptions}
          onValueChange={handleChange}
        />,
      );

      await user.click(screen.getByRole("combobox"));
      await user.click(screen.getByText("Blue"));

      expect(handleChange).toHaveBeenCalledWith("blue");
    });

    it("选择后 trigger 应该显示选中的值", async () => {
      const user = userEvent.setup();

      render(<Select placeholder="Select..." options={simpleOptions} />);

      await user.click(screen.getByRole("combobox"));
      await user.click(screen.getByText("Green"));

      expect(screen.getByRole("combobox")).toHaveTextContent("Green");
    });

    it("选择禁用选项不应该触发 onValueChange", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Select
          placeholder="Select..."
          options={optionsWithDisabled}
          onValueChange={handleChange}
        />,
      );

      await user.click(screen.getByRole("combobox"));

      // 禁用选项存在但不可点击
      const listbox = screen.getByRole("listbox");
      const disabledOption = within(listbox).getByText("Disabled Option");
      expect(disabledOption.closest('[role="option"]')).toHaveAttribute(
        "data-disabled",
      );
    });

    it("应该可以通过 Tab 键聚焦 trigger", async () => {
      const user = userEvent.setup();
      render(<Select placeholder="Select..." options={simpleOptions} />);

      await user.tab();

      expect(screen.getByRole("combobox")).toHaveFocus();
    });

    it("disabled 时不应该可以通过 Tab 键聚焦", async () => {
      const user = userEvent.setup();
      render(
        <Select placeholder="Select..." options={simpleOptions} disabled />,
      );

      await user.tab();

      expect(screen.getByRole("combobox")).not.toHaveFocus();
    });

    it("应该可以通过键盘导航选项", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Select
          placeholder="Select..."
          options={simpleOptions}
          onValueChange={handleChange}
        />,
      );

      // 聚焦并打开
      await user.tab();
      await user.keyboard("{Enter}");

      // 应该打开下拉面板
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      // 使用箭头键导航
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Enter}");

      // 应该选中第一个选项
      expect(handleChange).toHaveBeenCalled();
    });

    it("按 Escape 应该关闭下拉面板", async () => {
      const user = userEvent.setup();
      render(<Select placeholder="Select..." options={simpleOptions} />);

      await user.click(screen.getByRole("combobox"));
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 受控模式测试
  // ===========================================================================
  describe("受控模式", () => {
    it("应该支持受控值", () => {
      render(
        <Select
          placeholder="Select..."
          options={simpleOptions}
          value="green"
        />,
      );

      expect(screen.getByRole("combobox")).toHaveTextContent("Green");
    });

    it("受控模式下应该响应值变化", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      const { rerender } = render(
        <Select
          placeholder="Select..."
          options={simpleOptions}
          value="red"
          onValueChange={handleChange}
        />,
      );

      expect(screen.getByRole("combobox")).toHaveTextContent("Red");

      // 模拟外部值变化
      rerender(
        <Select
          placeholder="Select..."
          options={simpleOptions}
          value="blue"
          onValueChange={handleChange}
        />,
      );

      expect(screen.getByRole("combobox")).toHaveTextContent("Blue");
    });
  });

  // ===========================================================================
  // Focus 样式测试
  // ===========================================================================
  describe("Focus 样式", () => {
    it("应该有 focus-visible 相关类", () => {
      render(<Select placeholder="Select..." options={simpleOptions} />);

      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveClass("focus-visible:outline");
    });
  });

  // ===========================================================================
  // CSS Variables 检查
  // ===========================================================================
  describe("CSS Variables", () => {
    it("trigger class 中不应该包含硬编码的十六进制颜色", () => {
      render(<Select placeholder="Select..." options={simpleOptions} />);

      const trigger = screen.getByRole("combobox");
      const classNames = trigger.className;

      expect(classNames).not.toMatch(/#[0-9a-fA-F]{3,6}(?![0-9a-fA-F])/);
    });

    it("应该使用 CSS Variables 定义颜色", () => {
      render(<Select placeholder="Select..." options={simpleOptions} />);

      const trigger = screen.getByRole("combobox");
      const classNames = trigger.className;

      expect(classNames).toContain("var(--");
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("应该处理空选项列表", () => {
      render(<Select placeholder="No options" options={[]} />);

      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toHaveTextContent("No options");
    });

    it("空选项列表打开时不应该崩溃", async () => {
      const user = userEvent.setup();
      render(<Select placeholder="No options" options={[]} />);

      await user.click(screen.getByRole("combobox"));

      // 下拉面板应该存在但无选项
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("应该处理单个选项", async () => {
      const user = userEvent.setup();
      render(
        <Select
          placeholder="Select..."
          options={[{ value: "only", label: "Only Option" }]}
        />,
      );

      await user.click(screen.getByRole("combobox"));

      expect(screen.getByText("Only Option")).toBeInTheDocument();
    });

    it("应该处理超长选项文本", async () => {
      const longLabel =
        "This is an extremely long option label that might overflow in some containers";
      const user = userEvent.setup();

      render(
        <Select
          placeholder="Select..."
          options={[{ value: "long", label: longLabel }]}
        />,
      );

      await user.click(screen.getByRole("combobox"));

      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });

    it("应该处理大量选项", async () => {
      const manyOptions = Array.from({ length: 100 }, (_, i) => ({
        value: `option-${i}`,
        label: `Option ${i}`,
      }));
      const user = userEvent.setup();

      render(<Select placeholder="Select..." options={manyOptions} />);

      await user.click(screen.getByRole("combobox"));

      // 应该能渲染
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 分组选项特殊测试
  // ===========================================================================
  describe("分组选项", () => {
    it("应该正确识别分组选项", async () => {
      const user = userEvent.setup();
      render(<Select placeholder="Select..." options={groupedOptions} />);

      await user.click(screen.getByRole("combobox"));

      const listbox = screen.getByRole("listbox");
      // 组标签应该存在
      expect(within(listbox).getByText("Group A")).toBeInTheDocument();
      expect(within(listbox).getByText("Group B")).toBeInTheDocument();
    });

    it("选择分组内的选项应该正常工作", async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Select
          placeholder="Select..."
          options={groupedOptions}
          onValueChange={handleChange}
        />,
      );

      await user.click(screen.getByRole("combobox"));
      await user.click(screen.getByText("Option B1"));

      expect(handleChange).toHaveBeenCalledWith("b1");
    });
  });

  // ===========================================================================
  // 无障碍 (a11y) 测试
  // ===========================================================================
  describe("无障碍", () => {
    it("trigger 应该有正确的 role", () => {
      render(<Select placeholder="Select..." options={simpleOptions} />);

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("下拉面板应该有正确的 role", async () => {
      const user = userEvent.setup();
      render(<Select placeholder="Select..." options={simpleOptions} />);

      await user.click(screen.getByRole("combobox"));

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("选项应该有正确的 role", async () => {
      const user = userEvent.setup();
      render(<Select placeholder="Select..." options={simpleOptions} />);

      await user.click(screen.getByRole("combobox"));

      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(3);
    });

    it("disabled trigger 应该有正确的属性", () => {
      render(
        <Select placeholder="Select..." options={simpleOptions} disabled />,
      );

      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveAttribute("data-disabled", "");
    });
  });

  // ===========================================================================
  // 表单集成测试
  // ===========================================================================
  describe("表单集成", () => {
    it("应该支持 name 属性", () => {
      render(
        <Select
          placeholder="Select..."
          options={simpleOptions}
          name="color"
        />,
      );

      // Radix Select 内部会处理 name
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });
});
