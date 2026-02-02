import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CommandPalette, type CommandItem } from "./CommandPalette";

// Mock stores
vi.mock("../../stores/projectStore", () => ({
  useProjectStore: vi.fn((selector) => {
    const state = {
      current: { projectId: "test-project" },
    };
    return selector(state);
  }),
}));

vi.mock("../../stores/editorStore", () => ({
  useEditorStore: vi.fn((selector) => {
    const state = {
      documentId: "test-document",
    };
    return selector(state);
  }),
}));

vi.mock("../../lib/ipcClient", () => ({
  invoke: vi.fn().mockResolvedValue({ ok: true }),
}));

// =============================================================================
// Test helpers
// =============================================================================

function createMockCommands(): CommandItem[] {
  return [
    {
      id: "open-settings",
      label: "Open Settings",
      shortcut: "⌘,",
      group: "Commands",
      onSelect: vi.fn(),
    },
    {
      id: "toggle-sidebar",
      label: "Toggle Sidebar",
      shortcut: "⌘B",
      group: "Commands",
      onSelect: vi.fn(),
    },
    {
      id: "create-file",
      label: "Create New File",
      shortcut: "⌘N",
      group: "Commands",
      onSelect: vi.fn(),
    },
    {
      id: "file-app",
      label: "App.tsx",
      subtext: "src/components",
      group: "Recent Files",
      onSelect: vi.fn(),
    },
    {
      id: "file-package",
      label: "package.json",
      group: "Recent Files",
      onSelect: vi.fn(),
    },
  ];
}

// =============================================================================
// Tests
// =============================================================================

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("open 为 true 时应该渲染", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      expect(screen.getByTestId("command-palette")).toBeInTheDocument();
    });

    it("open 为 false 时不应该渲染", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={false}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument();
    });

    it("应该显示搜索输入框", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      expect(
        screen.getByPlaceholderText("搜索命令或文件..."),
      ).toBeInTheDocument();
    });

    it("应该显示键盘提示", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      expect(screen.getByText("导航")).toBeInTheDocument();
      expect(screen.getByText("选择")).toBeInTheDocument();
      expect(screen.getByText("关闭")).toBeInTheDocument();
    });

    it("应该显示分组标题", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      expect(screen.getByText("Commands")).toBeInTheDocument();
      expect(screen.getByText("Recent Files")).toBeInTheDocument();
    });

    it("应该显示命令项", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      expect(screen.getByText("Open Settings")).toBeInTheDocument();
      expect(screen.getByText("Toggle Sidebar")).toBeInTheDocument();
      expect(screen.getByText("App.tsx")).toBeInTheDocument();
    });

    it("应该显示快捷键", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      expect(screen.getByText("⌘,")).toBeInTheDocument();
      expect(screen.getByText("⌘B")).toBeInTheDocument();
    });

    it("应该显示子文本（文件路径）", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      expect(screen.getByText("src/components")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 无障碍测试
  // ===========================================================================
  describe("无障碍", () => {
    it("应该有 dialog role", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("应该有 aria-modal", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    it("应该有 listbox role", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("命令项应该有 option role", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      const options = screen.getAllByRole("option");
      expect(options.length).toBe(commands.length);
    });
  });

  // ===========================================================================
  // 搜索过滤测试
  // ===========================================================================
  describe("搜索过滤", () => {
    it("输入搜索词应该过滤命令", async () => {
      const user = userEvent.setup();
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      const input = screen.getByPlaceholderText("搜索命令或文件...");
      await user.type(input, "setting");

      // 应该只显示包含 "setting" 的命令（使用 testid 因为高亮会分割文本）
      expect(
        screen.getByTestId("command-item-open-settings"),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId("command-item-toggle-sidebar"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("command-item-file-app"),
      ).not.toBeInTheDocument();
    });

    it("搜索应该不区分大小写", async () => {
      const user = userEvent.setup();
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      const input = screen.getByPlaceholderText("搜索命令或文件...");
      await user.type(input, "SETTING");

      // 使用 testid 因为高亮会分割文本
      expect(
        screen.getByTestId("command-item-open-settings"),
      ).toBeInTheDocument();
    });

    it("搜索子文本（文件路径）", async () => {
      const user = userEvent.setup();
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      const input = screen.getByPlaceholderText("搜索命令或文件...");
      await user.type(input, "src/components");

      expect(screen.getByTestId("command-item-file-app")).toBeInTheDocument();
      expect(
        screen.queryByTestId("command-item-file-package"),
      ).not.toBeInTheDocument();
    });

    it("无匹配时显示空状态", async () => {
      const user = userEvent.setup();
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      const input = screen.getByPlaceholderText("搜索命令或文件...");
      await user.type(input, "xyznonexistent");

      expect(screen.getByText("未找到匹配的命令")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 键盘导航测试
  // ===========================================================================
  describe("键盘导航", () => {
    it("按 ↓ 应该移动到下一项", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      // 第一项应该是 active
      const firstItem = screen.getByTestId("command-item-open-settings");
      expect(firstItem).toHaveAttribute("aria-selected", "true");

      // 在 overlay 上触发 ↓
      const overlay = document.querySelector(".cn-overlay")!;
      fireEvent.keyDown(overlay, { key: "ArrowDown" });

      // 第二项应该是 active
      const secondItem = screen.getByTestId("command-item-toggle-sidebar");
      expect(secondItem).toHaveAttribute("aria-selected", "true");
      expect(firstItem).toHaveAttribute("aria-selected", "false");
    });

    it("按 ↑ 应该移动到上一项", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      const overlay = document.querySelector(".cn-overlay")!;

      // 先移动到第二项
      fireEvent.keyDown(overlay, { key: "ArrowDown" });

      const secondItem = screen.getByTestId("command-item-toggle-sidebar");
      expect(secondItem).toHaveAttribute("aria-selected", "true");

      // 按 ↑ 回到第一项
      fireEvent.keyDown(overlay, { key: "ArrowUp" });

      const firstItem = screen.getByTestId("command-item-open-settings");
      expect(firstItem).toHaveAttribute("aria-selected", "true");
    });

    it("在第一项按 ↑ 不应该移动", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      const firstItem = screen.getByTestId("command-item-open-settings");
      expect(firstItem).toHaveAttribute("aria-selected", "true");

      // 按 ↑
      const overlay = document.querySelector(".cn-overlay")!;
      fireEvent.keyDown(overlay, { key: "ArrowUp" });

      // 仍然是第一项
      expect(firstItem).toHaveAttribute("aria-selected", "true");
    });

    it("在最后一项按 ↓ 不应该移动", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      const overlay = document.querySelector(".cn-overlay")!;

      // 移动到最后一项
      for (let i = 0; i < commands.length - 1; i++) {
        fireEvent.keyDown(overlay, { key: "ArrowDown" });
      }

      const lastItem = screen.getByTestId("command-item-file-package");
      expect(lastItem).toHaveAttribute("aria-selected", "true");

      // 按 ↓
      fireEvent.keyDown(overlay, { key: "ArrowDown" });

      // 仍然是最后一项
      expect(lastItem).toHaveAttribute("aria-selected", "true");
    });

    it("按 Enter 应该执行选中的命令", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      // 按 Enter 执行第一项
      const overlay = document.querySelector(".cn-overlay")!;
      fireEvent.keyDown(overlay, { key: "Enter" });

      expect(commands[0].onSelect).toHaveBeenCalled();
    });

    it("按 Escape 应该关闭面板", () => {
      const onOpenChange = vi.fn();
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={onOpenChange}
          commands={commands}
        />,
      );

      const overlay = document.querySelector(".cn-overlay")!;
      fireEvent.keyDown(overlay, { key: "Escape" });

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ===========================================================================
  // 交互测试
  // ===========================================================================
  describe("交互", () => {
    it("点击背景应调用 onOpenChange(false)", () => {
      const onOpenChange = vi.fn();
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={onOpenChange}
          commands={commands}
        />,
      );

      const overlay = document.querySelector(".cn-overlay");
      if (overlay) {
        fireEvent.click(overlay);
        expect(onOpenChange).toHaveBeenCalledWith(false);
      }
    });

    it("点击弹窗内部不应关闭", () => {
      const onOpenChange = vi.fn();
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={onOpenChange}
          commands={commands}
        />,
      );

      const dialog = screen.getByRole("dialog");
      fireEvent.click(dialog);

      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("点击命令项应该执行命令", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      const item = screen.getByTestId("command-item-toggle-sidebar");
      fireEvent.click(item);

      expect(commands[1].onSelect).toHaveBeenCalled();
    });

    it("鼠标悬停应该更新 active 状态", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      // 初始第一项是 active
      const firstItem = screen.getByTestId("command-item-open-settings");
      expect(firstItem).toHaveAttribute("aria-selected", "true");

      // 悬停第三项
      const thirdItem = screen.getByTestId("command-item-create-file");
      fireEvent.mouseEnter(thirdItem);

      expect(thirdItem).toHaveAttribute("aria-selected", "true");
      expect(firstItem).toHaveAttribute("aria-selected", "false");
    });
  });

  // ===========================================================================
  // Active 指示器测试
  // ===========================================================================
  describe("Active 指示器", () => {
    it("active 项应该有左侧蓝色指示器", () => {
      const commands = createMockCommands();
      render(
        <CommandPalette
          open={true}
          onOpenChange={vi.fn()}
          commands={commands}
        />,
      );

      const firstItem = screen.getByTestId("command-item-open-settings");
      // 检查 active 项内部有指示器元素
      const indicator = firstItem.querySelector(
        ".bg-\\[var\\(--color-accent-blue\\)\\]",
      );
      expect(indicator).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 空列表测试
  // ===========================================================================
  describe("空列表", () => {
    it("空命令列表应该显示空状态", () => {
      render(
        <CommandPalette open={true} onOpenChange={vi.fn()} commands={[]} />,
      );

      expect(screen.getByText("未找到匹配的命令")).toBeInTheDocument();
    });
  });
});
