import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Accordion } from "./Accordion";

const sampleItems = [
  { value: "item-1", title: "Section 1", content: "Content 1" },
  { value: "item-2", title: "Section 2", content: "Content 2" },
  { value: "item-3", title: "Section 3", content: "Content 3" },
];

describe("Accordion", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染所有 item 标题", () => {
      render(<Accordion items={sampleItems} />);

      expect(screen.getByText("Section 1")).toBeInTheDocument();
      expect(screen.getByText("Section 2")).toBeInTheDocument();
      expect(screen.getByText("Section 3")).toBeInTheDocument();
    });

    it("默认不应该显示内容", () => {
      render(<Accordion items={sampleItems} />);

      // Accordion content is hidden by default (data-state=closed)
      const trigger1 = screen.getByText("Section 1").closest("button");
      expect(trigger1).toHaveAttribute("data-state", "closed");
    });

    it("应该应用自定义 className", () => {
      const { container } = render(
        <Accordion items={sampleItems} className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  // ===========================================================================
  // Single 类型测试
  // ===========================================================================
  describe("single 类型", () => {
    it("点击应该展开 item", async () => {
      const user = userEvent.setup();
      render(<Accordion items={sampleItems} type="single" />);

      await user.click(screen.getByText("Section 1"));

      expect(screen.getByText("Content 1")).toBeVisible();
    });

    it("同时只能展开一个 item", async () => {
      const user = userEvent.setup();
      render(<Accordion items={sampleItems} type="single" />);

      await user.click(screen.getByText("Section 1"));
      const trigger1 = screen.getByText("Section 1").closest("button");
      expect(trigger1).toHaveAttribute("data-state", "open");

      await user.click(screen.getByText("Section 2"));
      const trigger2 = screen.getByText("Section 2").closest("button");
      expect(trigger2).toHaveAttribute("data-state", "open");
      expect(trigger1).toHaveAttribute("data-state", "closed");
    });

    it("collapsible=true 时可以折叠", async () => {
      const user = userEvent.setup();
      render(<Accordion items={sampleItems} type="single" collapsible />);

      const trigger1 = screen.getByText("Section 1").closest("button");
      await user.click(screen.getByText("Section 1"));
      expect(trigger1).toHaveAttribute("data-state", "open");

      await user.click(screen.getByText("Section 1"));
      expect(trigger1).toHaveAttribute("data-state", "closed");
    });
  });

  // ===========================================================================
  // Multiple 类型测试
  // ===========================================================================
  describe("multiple 类型", () => {
    it("可以同时展开多个 item", async () => {
      const user = userEvent.setup();
      render(<Accordion items={sampleItems} type="multiple" />);

      await user.click(screen.getByText("Section 1"));
      await user.click(screen.getByText("Section 2"));

      expect(screen.getByText("Content 1")).toBeVisible();
      expect(screen.getByText("Content 2")).toBeVisible();
    });

    it("点击已展开的 item 应该折叠", async () => {
      const user = userEvent.setup();
      render(<Accordion items={sampleItems} type="multiple" />);

      const trigger1 = screen.getByText("Section 1").closest("button");
      await user.click(screen.getByText("Section 1"));
      expect(trigger1).toHaveAttribute("data-state", "open");

      await user.click(screen.getByText("Section 1"));
      expect(trigger1).toHaveAttribute("data-state", "closed");
    });
  });

  // ===========================================================================
  // 默认值测试
  // ===========================================================================
  describe("默认值", () => {
    it("single 类型应该支持 defaultValue", () => {
      render(
        <Accordion items={sampleItems} type="single" defaultValue="item-2" />,
      );

      expect(screen.getByText("Content 2")).toBeVisible();
    });

    it("multiple 类型应该支持 defaultValue 数组", () => {
      render(
        <Accordion
          items={sampleItems}
          type="multiple"
          defaultValue={["item-1", "item-3"]}
        />,
      );

      const trigger1 = screen.getByText("Section 1").closest("button");
      const trigger2 = screen.getByText("Section 2").closest("button");
      const trigger3 = screen.getByText("Section 3").closest("button");
      expect(trigger1).toHaveAttribute("data-state", "open");
      expect(trigger3).toHaveAttribute("data-state", "open");
      expect(trigger2).toHaveAttribute("data-state", "closed");
    });
  });

  // ===========================================================================
  // 受控模式测试
  // ===========================================================================
  describe("受控模式", () => {
    it("应该调用 onValueChange", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Accordion
          items={sampleItems}
          type="single"
          onValueChange={onValueChange}
        />,
      );

      await user.click(screen.getByText("Section 1"));

      expect(onValueChange).toHaveBeenCalledWith("item-1");
    });
  });

  // ===========================================================================
  // 禁用项测试
  // ===========================================================================
  describe("禁用项", () => {
    it("禁用的 item 不应该可点击", async () => {
      const user = userEvent.setup();
      render(
        <Accordion
          items={[
            ...sampleItems,
            { value: "disabled", title: "Disabled", content: "No access", disabled: true },
          ]}
        />,
      );

      const disabledTrigger = screen.getByText("Disabled").closest("button");
      await user.click(disabledTrigger!);

      expect(disabledTrigger).toHaveAttribute("data-state", "closed");
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("应该处理空数组", () => {
      const { container } = render(<Accordion items={[]} />);

      expect(container.firstChild).toBeInTheDocument();
    });

    it("应该处理单个 item", () => {
      render(
        <Accordion
          items={[{ value: "only", title: "Only", content: "Single item" }]}
        />,
      );

      expect(screen.getByText("Only")).toBeInTheDocument();
    });

    it("应该支持 React 节点作为 content", async () => {
      const user = userEvent.setup();
      render(
        <Accordion
          items={[
            {
              value: "rich",
              title: "Rich Content",
              content: (
                <div data-testid="rich-content">
                  <strong>Bold</strong> text
                </div>
              ),
            },
          ]}
        />,
      );

      await user.click(screen.getByText("Rich Content"));

      expect(screen.getByTestId("rich-content")).toBeVisible();
    });
  });

  // ===========================================================================
  // 键盘导航测试
  // ===========================================================================
  describe("键盘导航", () => {
    it("应该支持 Tab 键聚焦", async () => {
      const user = userEvent.setup();
      render(<Accordion items={sampleItems} />);

      await user.tab();

      expect(screen.getByText("Section 1").closest("button")).toHaveFocus();
    });

    it("应该支持 Enter/Space 键展开", async () => {
      const user = userEvent.setup();
      render(<Accordion items={sampleItems} type="single" />);

      await user.tab();
      await user.keyboard("{Enter}");

      expect(screen.getByText("Content 1")).toBeVisible();
    });
  });
});
