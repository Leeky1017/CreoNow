import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ToastVariant } from "./Toast";
import { Toast, ToastProvider, ToastViewport } from "./Toast";

// Wrapper component for tests
function ToastWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastViewport />
    </ToastProvider>
  );
}

describe("Toast", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("open=true 时应该渲染 toast", () => {
      render(
        <ToastWrapper>
          <Toast title="Test Toast" open />
        </ToastWrapper>,
      );

      expect(screen.getByText("Test Toast")).toBeInTheDocument();
    });

    it("open=false 时不应该渲染 toast", () => {
      render(
        <ToastWrapper>
          <Toast title="Test Toast" open={false} />
        </ToastWrapper>,
      );

      expect(screen.queryByText("Test Toast")).not.toBeInTheDocument();
    });

    it("应该渲染 title 和 description", () => {
      render(
        <ToastWrapper>
          <Toast title="Toast Title" description="Toast description" open />
        </ToastWrapper>,
      );

      expect(screen.getByText("Toast Title")).toBeInTheDocument();
      expect(screen.getByText("Toast description")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Variant 测试
  // ===========================================================================
  describe("variants", () => {
    const variants: ToastVariant[] = ["default", "success", "error", "warning"];

    it.each(variants)("应该渲染 %s variant", (variant) => {
      render(
        <ToastWrapper>
          <Toast title="Test" variant={variant} open />
        </ToastWrapper>,
      );

      expect(screen.getByText("Test")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 交互测试
  // ===========================================================================
  describe("交互", () => {
    it("点击关闭按钮应该调用 onOpenChange(false)", async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();

      render(
        <ToastWrapper>
          <Toast title="Test" open onOpenChange={onOpenChange} />
        </ToastWrapper>,
      );

      const closeButton = screen.getByRole("button", { name: "Close" });
      await user.click(closeButton);

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("应该渲染 action 按钮", () => {
      const onClick = vi.fn();

      render(
        <ToastWrapper>
          <Toast title="Test" action={{ label: "Undo", onClick }} open />
        </ToastWrapper>,
      );

      expect(screen.getByText("Undo")).toBeInTheDocument();
    });

    it("点击 action 按钮应该调用 onClick", async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();

      render(
        <ToastWrapper>
          <Toast title="Test" action={{ label: "Undo", onClick }} open />
        </ToastWrapper>,
      );

      await user.click(screen.getByText("Undo"));

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Props 测试
  // ===========================================================================
  describe("props", () => {
    it("应该接受 duration prop", () => {
      render(
        <ToastWrapper>
          <Toast title="Test" duration={3000} open />
        </ToastWrapper>,
      );

      expect(screen.getByText("Test")).toBeInTheDocument();
    });

    it("duration=0 应该不自动关闭", () => {
      render(
        <ToastWrapper>
          <Toast title="Test" duration={0} open />
        </ToastWrapper>,
      );

      expect(screen.getByText("Test")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("只有 title 时应该正常渲染", () => {
      render(
        <ToastWrapper>
          <Toast title="Only Title" open />
        </ToastWrapper>,
      );

      expect(screen.getByText("Only Title")).toBeInTheDocument();
    });

    it("应该处理长文本", () => {
      const longTitle = "This is a very long toast title that might overflow";
      const longDescription =
        "This is an even longer description that contains a lot of text and might need to wrap to multiple lines.";

      render(
        <ToastWrapper>
          <Toast title={longTitle} description={longDescription} open />
        </ToastWrapper>,
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Variant × Props 矩阵测试
  // ===========================================================================
  describe("Variant × Props 矩阵", () => {
    const variants: ToastVariant[] = ["default", "success", "error", "warning"];
    const hasAction = [true, false];

    const combinations = variants.flatMap((variant) =>
      hasAction.map((withAction) => ({ variant, withAction })),
    );

    it.each(combinations)(
      "应该正确渲染 $variant + action=$withAction 组合",
      ({ variant, withAction }) => {
        render(
          <ToastWrapper>
            <Toast
              title="Test"
              variant={variant}
              action={
                withAction ? { label: "Action", onClick: () => {} } : undefined
              }
              open
            />
          </ToastWrapper>,
        );

        expect(screen.getByText("Test")).toBeInTheDocument();
        if (withAction) {
          expect(screen.getByText("Action")).toBeInTheDocument();
        }
      },
    );
  });
});
