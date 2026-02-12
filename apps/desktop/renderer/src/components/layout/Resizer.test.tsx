import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Resizer, __resetGlobalDragging } from "./Resizer";

describe("Resizer", () => {
  const defaultProps = {
    testId: "test-resizer",
    getStartWidth: () => 240,
    onDrag: vi.fn((deltaX: number, startWidth: number) => startWidth + deltaX),
    onCommit: vi.fn(),
    onDoubleClick: vi.fn(),
  };

  const renderResizer = (props = defaultProps) => {
    return render(<Resizer {...props} />);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    __resetGlobalDragging();
  });

  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 Resizer 组件", () => {
      renderResizer();

      const resizer = screen.getByTestId("test-resizer");
      expect(resizer).toBeInTheDocument();
    });

    it("应该有 cn-resizer 类", () => {
      renderResizer();

      const resizer = screen.getByTestId("test-resizer");
      expect(resizer).toHaveClass("cn-resizer");
    });
  });

  // ===========================================================================
  // 无障碍测试
  // ===========================================================================
  describe("无障碍", () => {
    it("应该有 separator role", () => {
      renderResizer();

      const resizer = screen.getByRole("separator");
      expect(resizer).toBeInTheDocument();
    });

    it("应该有 aria-orientation='vertical'", () => {
      renderResizer();

      const resizer = screen.getByRole("separator");
      expect(resizer).toHaveAttribute("aria-orientation", "vertical");
    });

    it("应该可以 Tab 聚焦 (tabIndex=0)", () => {
      renderResizer();

      const resizer = screen.getByTestId("test-resizer");
      expect(resizer).toHaveAttribute("tabIndex", "0");
    });
  });

  // ===========================================================================
  // 交互测试
  // ===========================================================================
  describe("交互", () => {
    it("双击应该调用 onDoubleClick", () => {
      renderResizer();

      const resizer = screen.getByTestId("test-resizer");
      fireEvent.doubleClick(resizer);

      expect(defaultProps.onDoubleClick).toHaveBeenCalledTimes(1);
    });

    it("mousedown 应该开始拖拽", () => {
      renderResizer();

      const resizer = screen.getByTestId("test-resizer");
      fireEvent.mouseDown(resizer, { clientX: 100 });

      // 验证 mousedown 事件被处理（不抛出错误）
      expect(resizer).toBeInTheDocument();
    });

    it("拖拽过程应该调用 onDrag 和 onCommit", () => {
      const onDrag = vi.fn(
        (deltaX: number, startWidth: number) => startWidth + deltaX,
      );
      const onCommit = vi.fn();

      renderResizer({
        ...defaultProps,
        onDrag,
        onCommit,
      });

      const resizer = screen.getByTestId("test-resizer");

      // 开始拖拽
      fireEvent.mouseDown(resizer, { clientX: 100 });

      // 模拟移动
      fireEvent.mouseMove(window, { clientX: 150 });

      // onDrag 应该被调用
      expect(onDrag).toHaveBeenCalled();
      // onCommit 应该在 mousemove 时被调用（实时更新）
      expect(onCommit).toHaveBeenCalled();
    });

    it("mouseup 应该结束拖拽并提交最终值", () => {
      const onCommit = vi.fn();

      renderResizer({
        ...defaultProps,
        onCommit,
      });

      const resizer = screen.getByTestId("test-resizer");

      // 开始拖拽
      fireEvent.mouseDown(resizer, { clientX: 100 });

      // 结束拖拽
      fireEvent.mouseUp(window);

      // onCommit 应该在 mouseup 时被调用
      expect(onCommit).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("未开始拖拽时 mousemove 不应该触发任何回调", () => {
      const onDrag = vi.fn();
      const onCommit = vi.fn();

      renderResizer({
        ...defaultProps,
        onDrag,
        onCommit,
      });

      // 不先 mousedown，直接 mousemove
      fireEvent.mouseMove(window, { clientX: 150 });

      expect(onDrag).not.toHaveBeenCalled();
      expect(onCommit).not.toHaveBeenCalled();
    });

    it("未开始拖拽时 mouseup 不应该触发任何回调", () => {
      const onCommit = vi.fn();

      renderResizer({
        ...defaultProps,
        onCommit,
      });

      // 不先 mousedown，直接 mouseup
      fireEvent.mouseUp(window);

      expect(onCommit).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 测试 ID 测试
  // ===========================================================================
  describe("测试 ID", () => {
    it("应该使用传入的 testId", () => {
      renderResizer({ ...defaultProps, testId: "custom-resizer" });

      const resizer = screen.getByTestId("custom-resizer");
      expect(resizer).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 悬停样式验证 (CSS class-based — JSDOM 无法测 pseudo-element computed style)
  // ===========================================================================
  describe("悬停样式", () => {
    it("should have cn-resizer class which provides cursor:col-resize and 8px hit area", () => {
      renderResizer();

      const resizer = screen.getByTestId("test-resizer");
      expect(resizer).toHaveClass("cn-resizer");
    });

    it("should have role=separator for accessibility (hover affordance via CSS)", () => {
      renderResizer();

      const resizer = screen.getByRole("separator");
      expect(resizer).toBeInTheDocument();
      // CSS spec: .cn-resizer { cursor: col-resize; width: 8px; }
      // CSS spec: .cn-resizer:hover::before { width: 2px; }
      // Pseudo-element :hover::before cannot be asserted in JSDOM.
      // Visual verification covered by Storybook InteractionGuide story.
    });
  });

  // ===========================================================================
  // 双拖拽 last-write-wins (global dragging flag)
  // ===========================================================================
  describe("双拖拽 last-write-wins", () => {
    it("should prevent second resizer from dragging when first is active", () => {
      const onCommitA = vi.fn();
      const onCommitB = vi.fn();
      const onDragA = vi.fn(
        (deltaX: number, startWidth: number) => startWidth + deltaX,
      );
      const onDragB = vi.fn(
        (deltaX: number, startWidth: number) => startWidth + deltaX,
      );

      const { unmount } = render(
        <>
          <Resizer
            testId="resizer-a"
            getStartWidth={() => 240}
            onDrag={onDragA}
            onCommit={onCommitA}
            onDoubleClick={() => {}}
          />
          <Resizer
            testId="resizer-b"
            getStartWidth={() => 320}
            onDrag={onDragB}
            onCommit={onCommitB}
            onDoubleClick={() => {}}
          />
        </>,
      );

      const resizerA = screen.getByTestId("resizer-a");
      const resizerB = screen.getByTestId("resizer-b");

      // Start dragging A
      fireEvent.mouseDown(resizerA, { clientX: 100 });

      // Attempt to start dragging B while A is active
      fireEvent.mouseDown(resizerB, { clientX: 500 });

      // Move mouse — only A should respond
      fireEvent.mouseMove(window, { clientX: 150 });

      expect(onDragA).toHaveBeenCalled();
      expect(onDragB).not.toHaveBeenCalled();

      unmount();
    });
  });
});
