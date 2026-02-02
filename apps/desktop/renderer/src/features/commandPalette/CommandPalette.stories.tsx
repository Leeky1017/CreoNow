import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import React from "react";

import { CommandPalette, type CommandItem } from "./CommandPalette";

/**
 * CommandPalette 组件 Story
 *
 * 设计稿参考：design/Variant/designs/17-command-palette.html
 *
 * 功能：
 * - 三段式布局：Header（搜索框）+ Body（分组列表）+ Footer（键盘提示）
 * - 搜索过滤：实时过滤命令/文件
 * - 键盘导航：↑↓ 移动，Enter 确认，Esc 关闭
 * - 搜索高亮：匹配文字高亮显示
 */
const meta: Meta<typeof CommandPalette> = {
  title: "Features/CommandPalette",
  component: CommandPalette,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    open: {
      control: "boolean",
      description: "Whether the palette is open",
    },
  },
  args: {
    onOpenChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CommandPalette>;

// =============================================================================
// Icons for stories
// =============================================================================

function FileIcon({
  className,
  color,
}: {
  className?: string;
  color?: string;
}): JSX.Element {
  return (
    <svg
      className={className}
      style={{ color }}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34" />
      <polygon points="18 2 22 6 12 16 8 16 8 12 18 2" />
    </svg>
  );
}

function SidebarIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function TerminalIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// =============================================================================
// Mock commands for stories
// =============================================================================

const recentFiles: CommandItem[] = [
  {
    id: "file-app",
    label: "App.tsx",
    icon: <FileIcon color="#3b82f6" />,
    subtext: "src/components",
    group: "Recent Files",
    onSelect: fn(),
  },
  {
    id: "file-package",
    label: "package.json",
    icon: <FileIcon color="#eab308" />,
    group: "Recent Files",
    onSelect: fn(),
  },
  {
    id: "file-logo",
    label: "logo-brand.svg",
    icon: <FileIcon color="#c084fc" />,
    group: "Recent Files",
    onSelect: fn(),
  },
];

const suggestions: CommandItem[] = [
  {
    id: "create-new-file",
    label: "Create New File",
    icon: <EditIcon className="text-[var(--color-fg-muted)]" />,
    shortcut: "⌘N",
    group: "Suggestions",
    onSelect: fn(),
  },
  {
    id: "toggle-sidebar",
    label: "Toggle Sidebar",
    icon: <SidebarIcon className="text-[var(--color-fg-muted)]" />,
    shortcut: "⌘B",
    group: "Suggestions",
    onSelect: fn(),
  },
  {
    id: "switch-dark-mode",
    label: "Switch to Dark Mode",
    icon: <MoonIcon className="text-[var(--color-fg-muted)]" />,
    shortcut: "⇧D",
    group: "Suggestions",
    onSelect: fn(),
  },
];

const searchCommands: CommandItem[] = [
  {
    id: "open-settings",
    label: "Open Settings",
    icon: <SettingsIcon className="text-[var(--color-fg-muted)]" />,
    shortcut: "⌘,",
    group: "Settings & Commands",
    onSelect: fn(),
  },
  {
    id: "reset-layout",
    label: "Reset Window Layout",
    icon: <TerminalIcon className="text-[var(--color-fg-muted)]" />,
    group: "Settings & Commands",
    onSelect: fn(),
  },
  {
    id: "download-assets",
    label: "Download Assets",
    icon: <DownloadIcon className="text-[var(--color-fg-muted)]" />,
    group: "Settings & Commands",
    onSelect: fn(),
  },
  {
    id: "file-use-settings",
    label: "useSettings.ts",
    icon: <FileIcon color="#3b82f6" />,
    subtext: "src/hooks",
    group: "Files",
    onSelect: fn(),
  },
  {
    id: "file-settings-modal",
    label: "SettingsModal.tsx",
    icon: <FileIcon color="#3b82f6" />,
    subtext: "src/components",
    group: "Files",
    onSelect: fn(),
  },
  {
    id: "file-reset-css",
    label: "reset.css",
    icon: <FileIcon color="#4ade80" />,
    subtext: "public/styles",
    group: "Files",
    onSelect: fn(),
  },
];

const defaultCommands = [...recentFiles, ...suggestions];

// =============================================================================
// Stories
// =============================================================================

/**
 * 默认状态
 *
 * 显示 Recent Files 和 Suggestions 分组
 */
export const Default: Story = {
  args: {
    open: true,
    commands: defaultCommands,
  },
  render: (args) => (
    <div
      style={{
        width: "800px",
        height: "500px",
        position: "relative",
        backgroundColor: "var(--color-bg-base)",
      }}
    >
      <CommandPalette {...args} />
    </div>
  ),
};

/**
 * 搜索状态
 *
 * 搜索 "set" 时的过滤结果，显示匹配高亮
 */
export const Searching: Story = {
  args: {
    open: true,
    commands: searchCommands,
  },
  render: function SearchingStory(args) {
    const [open, setOpen] = React.useState(true);

    return (
      <div
        style={{
          width: "800px",
          height: "500px",
          position: "relative",
          backgroundColor: "var(--color-bg-base)",
        }}
      >
        <CommandPalette {...args} open={open} onOpenChange={setOpen} />
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            color: "var(--color-fg-muted)",
            fontSize: "12px",
          }}
        >
          Try typing &quot;set&quot; in the search box to see filtering
        </div>
      </div>
    );
  },
};

/**
 * 空结果状态
 *
 * 搜索无匹配时的空状态
 */
export const EmptyResults: Story = {
  args: {
    open: true,
    commands: [], // 空命令列表模拟无结果
  },
  render: (args) => (
    <div
      style={{
        width: "800px",
        height: "500px",
        position: "relative",
        backgroundColor: "var(--color-bg-base)",
      }}
    >
      <CommandPalette {...args} />
    </div>
  ),
};

/**
 * 关闭状态
 *
 * 命令面板关闭（不渲染）
 */
export const Closed: Story = {
  args: {
    open: false,
    commands: defaultCommands,
  },
  render: (args) => (
    <div
      style={{
        width: "800px",
        height: "300px",
        position: "relative",
        backgroundColor: "var(--color-bg-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CommandPalette {...args} />
      <div style={{ color: "var(--color-fg-muted)", textAlign: "center" }}>
        Command palette is closed (nothing rendered)
        <br />
        <span style={{ fontSize: "12px", color: "var(--color-fg-placeholder)" }}>
          Press Cmd/Ctrl+P to open
        </span>
      </div>
    </div>
  ),
};

/**
 * 交互演示
 *
 * 可交互的完整演示（点击按钮打开）
 */
export const Interactive: Story = {
  args: {
    commands: defaultCommands,
  },
  render: function InteractiveStory(args) {
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
      function handleKeyDown(e: KeyboardEvent): void {
        if ((e.metaKey || e.ctrlKey) && e.key === "p") {
          e.preventDefault();
          setOpen(true);
        }
      }

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
      <div
        style={{
          width: "800px",
          height: "500px",
          position: "relative",
          backgroundColor: "var(--color-bg-base)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
        }}
      >
        <button
          onClick={() => setOpen(true)}
          style={{
            padding: "8px 16px",
            backgroundColor: "var(--color-bg-raised)",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-fg-default)",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Open Command Palette
        </button>
        <div style={{ color: "var(--color-fg-placeholder)", fontSize: "12px" }}>
          or press Cmd/Ctrl+P
        </div>
        <CommandPalette {...args} open={open} onOpenChange={setOpen} />
      </div>
    );
  },
};

/**
 * 多分组
 *
 * 显示多个分组的场景
 */
export const MultipleGroups: Story = {
  args: {
    open: true,
    commands: [
      ...recentFiles,
      ...suggestions,
      {
        id: "cmd-undo",
        label: "Undo",
        shortcut: "⌘Z",
        group: "Edit",
        onSelect: fn(),
      },
      {
        id: "cmd-redo",
        label: "Redo",
        shortcut: "⌘⇧Z",
        group: "Edit",
        onSelect: fn(),
      },
      {
        id: "cmd-cut",
        label: "Cut",
        shortcut: "⌘X",
        group: "Edit",
        onSelect: fn(),
      },
      {
        id: "cmd-copy",
        label: "Copy",
        shortcut: "⌘C",
        group: "Edit",
        onSelect: fn(),
      },
      {
        id: "cmd-paste",
        label: "Paste",
        shortcut: "⌘V",
        group: "Edit",
        onSelect: fn(),
      },
    ],
  },
  render: (args) => (
    <div
      style={{
        width: "800px",
        height: "600px",
        position: "relative",
        backgroundColor: "var(--color-bg-base)",
      }}
    >
      <CommandPalette {...args} />
    </div>
  ),
};
