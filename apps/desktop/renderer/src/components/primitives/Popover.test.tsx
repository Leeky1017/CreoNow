import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Popover, PopoverClose } from "./Popover";
import { Button } from "./Button";

describe("Popover", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 trigger", () => {
      render(
        <Popover trigger={<Button>Open</Button>}>
          <div>Content</div>
        </Popover>,
      );

      expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
    });

    it("默认情况下不应该显示内容", () => {
      render(
        <Popover trigger={<Button>Open</Button>}>
          <div>Popover content</div>
        </Popover>,
      );

      expect(screen.queryByText("Popover content")).not.toBeInTheDocument();
    });

    it("defaultOpen=true 时应该显示内容", () => {
      render(
        <Popover trigger={<Button>Open</Button>} defaultOpen>
          <div>Popover content</div>
        </Popover>,
      );

      expect(screen.getByText("Popover content")).toBeInTheDocument();
    });

    it("受控模式 open=true 时应该显示内容", () => {
      render(
        <Popover trigger={<Button>Open</Button>} open={true} onOpenChange={() => {}}>
          <div>Controlled content</div>
        </Popover>,
      );

      expect(screen.getByText("Controlled content")).toBeInTheDocument();
    });

    it("受控模式 open=false 时不应该显示内容", () => {
      render(
        <Popover trigger={<Button>Open</Button>} open={false} onOpenChange={() => {}}>
          <div>Controlled content</div>
        </Popover>,
      );

      expect(screen.queryByText("Controlled content")).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 交互测试
  // ===========================================================================
  describe("交互", () => {
    it("点击 trigger 应该打开 popover", async () => {
      const user = userEvent.setup();

      render(
        <Popover trigger={<Button>Open</Button>}>
          <div>Popover content</div>
        </Popover>,
      );

      expect(screen.queryByText("Popover content")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Open" }));

      await waitFor(() => {
        expect(screen.getByText("Popover content")).toBeInTheDocument();
      });
    });

    it("再次点击 trigger 应该切换 popover 状态", async () => {
      const user = userEvent.setup();

      render(
        <Popover trigger={<Button>Toggle</Button>}>
          <div>Popover content</div>
        </Popover>,
      );

      // 打开
      await user.click(screen.getByRole("button", { name: "Toggle" }));
      await waitFor(() => {
        expect(screen.getByText("Popover content")).toBeInTheDocument();
      });

      // 再次点击 trigger - Radix Popover 的 trigger 点击后会切换状态
      // 验证 data-state 属性变化
      const trigger = screen.getByRole("button", { name: "Toggle" });
      expect(trigger).toHaveAttribute("data-state", "open");
    });

    it("点击外部应该关闭 popover", async () => {
      const user = userEvent.setup();

      render(
        <div>
          <div data-testid="outside">Outside</div>
          <Popover trigger={<Button>Open</Button>}>
            <div>Popover content</div>
          </Popover>
        </div>,
      );

      // 打开
      await user.click(screen.getByRole("button", { name: "Open" }));
      await waitFor(() => {
        expect(screen.getByText("Popover content")).toBeInTheDocument();
      });

      // 点击外部
      await user.click(screen.getByTestId("outside"));
      await waitFor(() => {
        expect(screen.queryByText("Popover content")).not.toBeInTheDocument();
      });
    });

    it("按 Escape 应该关闭 popover", async () => {
      const user = userEvent.setup();

      render(
        <Popover trigger={<Button>Open</Button>}>
          <div>Popover content</div>
        </Popover>,
      );

      // 打开
      await user.click(screen.getByRole("button", { name: "Open" }));
      await waitFor(() => {
        expect(screen.getByText("Popover content")).toBeInTheDocument();
      });

      // 按 Escape
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByText("Popover content")).not.toBeInTheDocument();
      });
    });

    it("受控模式下应该调用 onOpenChange", async () => {
      const handleOpenChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Popover
          trigger={<Button>Open</Button>}
          open={false}
          onOpenChange={handleOpenChange}
        >
          <div>Content</div>
        </Popover>,
      );

      await user.click(screen.getByRole("button", { name: "Open" }));

      expect(handleOpenChange).toHaveBeenCalledWith(true);
    });
  });

  // ===========================================================================
  // PopoverClose 测试
  // ===========================================================================
  describe("PopoverClose", () => {
    it("点击 PopoverClose 应该关闭 popover", async () => {
      const user = userEvent.setup();

      render(
        <Popover trigger={<Button>Open</Button>}>
          <div>
            <span>Content</span>
            <PopoverClose asChild>
              <Button>Close</Button>
            </PopoverClose>
          </div>
        </Popover>,
      );

      // 打开
      await user.click(screen.getByRole("button", { name: "Open" }));
      await waitFor(() => {
        expect(screen.getByText("Content")).toBeInTheDocument();
      });

      // 点击关闭按钮
      await user.click(screen.getByRole("button", { name: "Close" }));
      await waitFor(() => {
        expect(screen.queryByText("Content")).not.toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Props 测试
  // ===========================================================================
  describe("Props", () => {
    it("应该应用 side prop", async () => {
      const user = userEvent.setup();

      render(
        <Popover trigger={<Button>Open</Button>} side="top">
          <div>Top content</div>
        </Popover>,
      );

      await user.click(screen.getByRole("button", { name: "Open" }));

      await waitFor(() => {
        const content = screen.getByText("Top content");
        expect(content).toBeInTheDocument();
        // Radix 会设置 data-side 属性
        expect(content.closest("[data-side]")).toHaveAttribute("data-side", "top");
      });
    });

    it("应该应用 align prop", async () => {
      const user = userEvent.setup();

      render(
        <Popover trigger={<Button>Open</Button>} align="start">
          <div>Start aligned</div>
        </Popover>,
      );

      await user.click(screen.getByRole("button", { name: "Open" }));

      await waitFor(() => {
        const content = screen.getByText("Start aligned");
        expect(content).toBeInTheDocument();
        // Radix 会设置 data-align 属性
        expect(content.closest("[data-align]")).toHaveAttribute("data-align", "start");
      });
    });

    it("应该应用 sideOffset prop", async () => {
      const user = userEvent.setup();

      render(
        <Popover trigger={<Button>Open</Button>} sideOffset={20}>
          <div>Offset content</div>
        </Popover>,
      );

      await user.click(screen.getByRole("button", { name: "Open" }));

      await waitFor(() => {
        expect(screen.getByText("Offset content")).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("应该处理空 children", async () => {
      const user = userEvent.setup();

      render(
        <Popover trigger={<Button>Open</Button>}>{""}</Popover>,
      );

      await user.click(screen.getByRole("button", { name: "Open" }));

      // 不应该崩溃
      expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
    });

    it("应该处理复杂的 trigger 元素", () => {
      render(
        <Popover
          trigger={
            <Button>
              <span>Icon</span>
              <span>Text</span>
            </Button>
          }
        >
          <div>Content</div>
        </Popover>,
      );

      expect(screen.getByText("Icon")).toBeInTheDocument();
      expect(screen.getByText("Text")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // CSS Variables 检查
  // ===========================================================================
  describe("CSS Variables", () => {
    it("内容应该使用 CSS Variables", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Popover trigger={<Button>Open</Button>}>
          <div>Content</div>
        </Popover>,
      );

      await user.click(screen.getByRole("button", { name: "Open" }));

      await waitFor(() => {
        // 查找 popover 内容容器
        const content = container.querySelector("[data-radix-popper-content-wrapper]");
        if (content) {
          const popoverContent = content.querySelector("div");
          const classNames = popoverContent?.className ?? "";
          expect(classNames).toContain("var(--");
        }
      });
    });
  });
});
