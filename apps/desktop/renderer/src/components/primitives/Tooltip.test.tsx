import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染触发元素", () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Trigger</button>
        </Tooltip>,
      );

      expect(screen.getByRole("button", { name: "Trigger" })).toBeInTheDocument();
    });

    it("默认不应该显示 tooltip 内容", () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Trigger</button>
        </Tooltip>,
      );

      expect(screen.queryByText("Tooltip content")).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Props 测试
  // ===========================================================================
  describe("props", () => {
    it("应该接受 delayDuration prop", () => {
      render(
        <Tooltip content="Tooltip content" delayDuration={100}>
          <button>Trigger</button>
        </Tooltip>,
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("应该接受 side prop", () => {
      render(
        <Tooltip content="Tooltip content" side="bottom">
          <button>Trigger</button>
        </Tooltip>,
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("应该接受 align prop", () => {
      render(
        <Tooltip content="Tooltip content" align="start">
          <button>Trigger</button>
        </Tooltip>,
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("应该接受 onOpenChange prop", () => {
      const onOpenChange = vi.fn();

      render(
        <Tooltip content="Tooltip content" onOpenChange={onOpenChange}>
          <button>Trigger</button>
        </Tooltip>,
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("应该支持字符串 content", () => {
      render(
        <Tooltip content="Simple text">
          <button>Trigger</button>
        </Tooltip>,
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("应该支持 React 节点作为 children", () => {
      render(
        <Tooltip content="Tooltip">
          <span>
            <button>Nested Button</button>
          </span>
        </Tooltip>,
      );

      expect(screen.getByRole("button", { name: "Nested Button" })).toBeInTheDocument();
    });
  });

  // Note: Tooltip hover/open tests are skipped because Radix Tooltip
  // requires a real browser environment for proper Portal rendering.
  // These behaviors are tested in Storybook via browser MCP.
});
