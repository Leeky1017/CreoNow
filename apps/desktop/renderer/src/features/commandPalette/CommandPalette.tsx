/**
 * CommandPalette - 命令面板组件
 *
 * 设计稿参考：design/Variant/designs/17-command-palette.html
 *
 * 功能：
 * - 三段式布局：Header（搜索框）+ Body（分组列表）+ Footer（键盘提示）
 * - 搜索过滤：实时过滤命令/文件
 * - 键盘导航：↑↓ 移动，Enter 确认，Esc 关闭
 * - 搜索高亮：匹配文字高亮显示
 *
 * 快捷键对齐 design/DESIGN_DECISIONS.md：
 * - Cmd/Ctrl+P: Command Palette
 * - Cmd/Ctrl+,: Open Settings
 * - Cmd/Ctrl+\: Toggle Sidebar（禁止使用 Cmd/Ctrl+B）
 * - Cmd/Ctrl+L: Toggle Right Panel
 * - F11: Toggle Zen Mode
 * - Cmd/Ctrl+N: New Document
 * - Cmd/Ctrl+Shift+N: New Project
 */
import React from "react";

import { Text } from "../../components/primitives/Text";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";

// =============================================================================
// Types
// =============================================================================

/** 命令项 */
export interface CommandItem {
  /** 唯一标识 */
  id: string;
  /** 显示文本 */
  label: string;
  /** 图标（React 节点） */
  icon?: React.ReactNode;
  /** 快捷键（如 "⌘N"） */
  shortcut?: string;
  /** 子文本（如文件路径） */
  subtext?: string;
  /** 分组名称 */
  group?: string;
  /** 选中时执行的操作 */
  onSelect: () => void | Promise<void>;
}

/** 命令分组 */
interface CommandGroup {
  title: string;
  items: CommandItem[];
}

/**
 * Layout action callbacks for CommandPalette
 */
export interface CommandPaletteLayoutActions {
  /** Toggle sidebar collapsed state */
  onToggleSidebar: () => void;
  /** Toggle right panel collapsed state */
  onToggleRightPanel: () => void;
  /** Toggle zen mode */
  onToggleZenMode: () => void;
}

/**
 * Dialog open callbacks for CommandPalette
 */
export interface CommandPaletteDialogActions {
  /** Open settings dialog */
  onOpenSettings: () => void;
  /** Open export dialog */
  onOpenExport: () => void;
  /** Open create project dialog */
  onOpenCreateProject: () => void;
}

/**
 * Document action callbacks for CommandPalette
 */
export interface CommandPaletteDocumentActions {
  /** Create new document in current project */
  onCreateDocument: () => Promise<void>;
}

export interface CommandPaletteProps {
  /** 面板是否打开 */
  open: boolean;
  /** 打开状态变化回调 */
  onOpenChange: (open: boolean) => void;
  /** 自定义命令列表（可选，用于测试） */
  commands?: CommandItem[];
  /** Layout actions (sidebar/panel/zen) */
  layoutActions?: CommandPaletteLayoutActions;
  /** Dialog actions (settings/export/createProject) */
  dialogActions?: CommandPaletteDialogActions;
  /** Document actions (createDocument) */
  documentActions?: CommandPaletteDocumentActions;
}

// =============================================================================
// Icons
// =============================================================================

/** 搜索图标 */
function SearchIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/** 编辑图标 */
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

/** 侧边栏图标 */
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

/** 导出图标 */
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

/** 设置图标 */
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

/** 右侧面板图标 */
function PanelRightIcon({ className }: { className?: string }): JSX.Element {
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
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

/** 禅模式图标 */
function MaximizeIcon({ className }: { className?: string }): JSX.Element {
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
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

/** 文件夹加号图标（新建项目） */
function FolderPlusIcon({ className }: { className?: string }): JSX.Element {
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
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );
}

/**
 * 获取平台相关的修饰键显示
 * macOS: ⌘ (Cmd), Windows/Linux: Ctrl
 */
function getModKey(): string {
  return navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl+";
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * 高亮匹配文字
 * @param text 原文本
 * @param query 搜索关键词
 * @returns 带高亮的 React 节点
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return text;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <>
      {before}
      <span className="text-[var(--color-fg-default)] font-medium">
        {match}
      </span>
      {after}
    </>
  );
}

/**
 * 将命令列表按分组组织
 */
function groupCommands(commands: CommandItem[]): CommandGroup[] {
  const groups = new Map<string, CommandItem[]>();

  for (const command of commands) {
    const groupName = command.group ?? "Commands";
    const existing = groups.get(groupName) ?? [];
    groups.set(groupName, [...existing, command]);
  }

  return Array.from(groups.entries()).map(([title, items]) => ({
    title,
    items,
  }));
}

/**
 * 过滤命令列表
 */
function filterCommands(commands: CommandItem[], query: string): CommandItem[] {
  if (!query.trim()) {
    return commands;
  }

  const lowerQuery = query.toLowerCase();
  return commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(lowerQuery) ||
      cmd.subtext?.toLowerCase().includes(lowerQuery),
  );
}

// =============================================================================
// Component
// =============================================================================

export function CommandPalette({
  open,
  onOpenChange,
  commands: customCommands,
  layoutActions,
  dialogActions,
  documentActions,
}: CommandPaletteProps): JSX.Element | null {
  const currentProjectId = useProjectStore((s) => s.current?.projectId ?? null);
  const documentId = useEditorStore((s) => s.documentId);

  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // 获取平台相关的修饰键
  const modKey = React.useMemo(() => getModKey(), []);

  // 默认命令列表 - 对齐 design/DESIGN_DECISIONS.md 快捷键规范
  const defaultCommands = React.useMemo<CommandItem[]>(
    () => [
      // === Settings ===
      {
        id: "open-settings",
        label: "Open Settings",
        icon: <SettingsIcon className="text-[var(--color-fg-muted)]" />,
        shortcut: `${modKey},`,
        group: "Suggestions",
        onSelect: () => {
          setErrorText(null);
          if (dialogActions?.onOpenSettings) {
            dialogActions.onOpenSettings();
            onOpenChange(false);
          } else {
            setErrorText("ACTION_FAILED: Settings dialog not available");
          }
        },
      },
      // === Export ===
      {
        id: "export",
        label: "Export…",
        icon: <DownloadIcon className="text-[var(--color-fg-muted)]" />,
        group: "Suggestions",
        onSelect: () => {
          setErrorText(null);
          // Always open ExportDialog; it handles NO_PROJECT error internally
          if (dialogActions?.onOpenExport) {
            dialogActions.onOpenExport();
            onOpenChange(false);
          } else {
            setErrorText("ACTION_FAILED: Export dialog not available");
          }
        },
      },
      // === Layout: Toggle Sidebar ===
      {
        id: "toggle-sidebar",
        label: "Toggle Sidebar",
        icon: <SidebarIcon className="text-[var(--color-fg-muted)]" />,
        shortcut: `${modKey}\\`,
        group: "Layout",
        onSelect: () => {
          setErrorText(null);
          if (layoutActions?.onToggleSidebar) {
            layoutActions.onToggleSidebar();
            onOpenChange(false);
          } else {
            setErrorText("ACTION_FAILED: Layout actions not available");
          }
        },
      },
      // === Layout: Toggle Right Panel ===
      {
        id: "toggle-right-panel",
        label: "Toggle Right Panel",
        icon: <PanelRightIcon className="text-[var(--color-fg-muted)]" />,
        shortcut: `${modKey}L`,
        group: "Layout",
        onSelect: () => {
          setErrorText(null);
          if (layoutActions?.onToggleRightPanel) {
            layoutActions.onToggleRightPanel();
            onOpenChange(false);
          } else {
            setErrorText("ACTION_FAILED: Layout actions not available");
          }
        },
      },
      // === Layout: Zen Mode ===
      {
        id: "toggle-zen-mode",
        label: "Toggle Zen Mode",
        icon: <MaximizeIcon className="text-[var(--color-fg-muted)]" />,
        shortcut: "F11",
        group: "Layout",
        onSelect: () => {
          setErrorText(null);
          if (layoutActions?.onToggleZenMode) {
            layoutActions.onToggleZenMode();
            onOpenChange(false);
          } else {
            setErrorText("ACTION_FAILED: Layout actions not available");
          }
        },
      },
      // === Document: Create New Document ===
      {
        id: "create-new-document",
        label: "Create New Document",
        icon: <EditIcon className="text-[var(--color-fg-muted)]" />,
        shortcut: `${modKey}N`,
        group: "Document",
        onSelect: async () => {
          setErrorText(null);
          if (!currentProjectId) {
            setErrorText("NO_PROJECT: Please open a project first");
            return;
          }
          if (documentActions?.onCreateDocument) {
            try {
              await documentActions.onCreateDocument();
              onOpenChange(false);
            } catch {
              setErrorText("ACTION_FAILED: Failed to create document");
            }
          } else {
            setErrorText("ACTION_FAILED: Document actions not available");
          }
        },
      },
      // === Project: Create New Project ===
      {
        id: "create-new-project",
        label: "Create New Project",
        icon: <FolderPlusIcon className="text-[var(--color-fg-muted)]" />,
        shortcut: `${modKey}⇧N`,
        group: "Project",
        onSelect: () => {
          setErrorText(null);
          if (dialogActions?.onOpenCreateProject) {
            dialogActions.onOpenCreateProject();
            onOpenChange(false);
          } else {
            setErrorText("ACTION_FAILED: Create project dialog not available");
          }
        },
      },
    ],
    [
      currentProjectId,
      dialogActions,
      documentActions,
      documentId,
      layoutActions,
      modKey,
      onOpenChange,
    ],
  );

  const commands = customCommands ?? defaultCommands;

  // 过滤和分组
  const filteredCommands = filterCommands(commands, query);
  const groups = groupCommands(filteredCommands);

  // 扁平化列表（用于键盘导航）
  const flatItems = React.useMemo(
    () => groups.flatMap((g) => g.items),
    [groups],
  );

  // 当搜索词变化时重置 activeIndex
  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // 打开时重置状态（使用 useLayoutEffect 确保同步执行，避免闪烁）
  React.useLayoutEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setErrorText(null);
      // 延迟聚焦以确保 DOM 已渲染
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // 滚动活动项到可视区域
  React.useEffect(() => {
    if (!listRef.current) return;

    const activeElement = listRef.current.querySelector(
      `[data-index="${activeIndex}"]`,
    );
    if (activeElement) {
      activeElement.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // 键盘导航（使用 useCallback 确保 flatItems 闭包正确）
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent): void => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < flatItems.length - 1 ? prev + 1 : prev,
          );
          break;

        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;

        case "Enter":
          e.preventDefault();
          if (flatItems[activeIndex]) {
            void flatItems[activeIndex].onSelect();
          }
          break;

        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [flatItems, activeIndex, onOpenChange],
  );

  if (!open) {
    return null;
  }

  return (
    <div
      className="cn-overlay"
      onClick={() => onOpenChange(false)}
      onKeyDown={handleKeyDown}
    >
      {/* 命令面板 */}
      <div
        data-testid="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        onClick={(e) => e.stopPropagation()}
        className="w-[600px] max-w-[90vw] flex flex-col bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] shadow-xl overflow-hidden"
      >
        {/* Header: 搜索框 */}
        <div className="h-14 flex items-center px-4 border-b border-[var(--color-border-default)]">
          <SearchIcon
            className={
              query
                ? "text-[var(--color-fg-default)] mr-3 shrink-0"
                : "text-[var(--color-fg-muted)] mr-3 shrink-0"
            }
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索命令或文件..."
            className="flex-1 bg-transparent border-none text-[15px] text-[var(--color-fg-default)] placeholder:text-[var(--color-fg-placeholder)] outline-none"
            aria-label="Search commands"
          />
        </div>

        {/* Body: 命令列表 */}
        <div
          ref={listRef}
          className="max-h-[424px] overflow-y-auto p-2"
          role="listbox"
          data-active-index={activeIndex}
        >
          {/* 错误提示 */}
          {errorText && (
            <div className="px-3 py-2 mb-2 bg-[var(--color-error-subtle)] rounded-[var(--radius-sm)]">
              <Text
                data-testid="command-palette-error"
                size="small"
                color="error"
              >
                {errorText}
              </Text>
            </div>
          )}

          {/* 空结果 */}
          {flatItems.length === 0 && (
            <div className="h-40 flex flex-col items-center justify-center gap-3">
              <SearchIcon className="text-[var(--color-fg-placeholder)] w-8 h-8" />
              <Text size="small" color="placeholder">
                未找到匹配的命令
              </Text>
            </div>
          )}

          {/* 分组列表 */}
          {groups.map((group) => {
            // 计算该分组第一项在扁平列表中的起始索引
            let startIndex = 0;
            for (const g of groups) {
              if (g === group) break;
              startIndex += g.items.length;
            }

            return (
              <div key={group.title} className="mb-1">
                {/* 分组标题 */}
                <div className="px-3 pt-3 pb-1.5 first:pt-1">
                  <Text size="label" color="placeholder">
                    {group.title}
                  </Text>
                </div>

                {/* 分组项目 */}
                {group.items.map((item, itemIndex) => {
                  const flatIndex = startIndex + itemIndex;
                  const isActive = flatIndex === activeIndex;

                  return (
                    <div
                      key={item.id}
                      data-testid={`command-item-${item.id}`}
                      data-index={flatIndex}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => void item.onSelect()}
                      onMouseEnter={() => setActiveIndex(flatIndex)}
                      className={`
                        relative h-10 flex items-center px-3 rounded-[var(--radius-sm)] cursor-pointer mb-0.5
                        transition-colors duration-[var(--duration-fast)]
                        ${
                          isActive
                            ? "bg-[var(--color-bg-hover)] text-[var(--color-fg-default)]"
                            : "text-[var(--color-fg-muted)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--color-fg-default)]"
                        }
                      `}
                    >
                      {/* Active 指示器 */}
                      {isActive && (
                        <div className="absolute left-0 top-2.5 bottom-2.5 w-0.5 bg-[var(--color-accent-blue)] rounded-r-sm" />
                      )}

                      {/* 图标 */}
                      {item.icon && (
                        <div className="w-4 h-4 mr-3 flex items-center justify-center shrink-0">
                          {item.icon}
                        </div>
                      )}

                      {/* 文本 */}
                      <div className="flex-1 text-[13px] truncate flex items-center gap-2">
                        <span>{highlightMatch(item.label, query)}</span>
                        {item.subtext && (
                          <span className="text-[var(--color-fg-placeholder)] ml-1.5">
                            {item.subtext}
                          </span>
                        )}
                      </div>

                      {/* 快捷键 */}
                      {item.shortcut && (
                        <div
                          className={`
                          ml-2 px-1.5 py-0.5 text-[11px] rounded
                          bg-[var(--color-bg-selected)] border border-[rgba(255,255,255,0.05)]
                          ${isActive ? "text-[var(--color-fg-default)] border-[rgba(255,255,255,0.1)]" : "text-[var(--color-fg-muted)]"}
                        `}
                        >
                          {item.shortcut}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer: 键盘提示 */}
        <div className="h-9 px-4 flex items-center justify-end gap-4 border-t border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center gap-1.5">
            <span className="px-1 min-w-4 h-4 flex items-center justify-center text-[11px] text-[var(--color-fg-muted)] bg-[rgba(255,255,255,0.05)] rounded">
              ↑↓
            </span>
            <Text size="tiny" color="placeholder">
              导航
            </Text>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1 min-w-4 h-4 flex items-center justify-center text-[11px] text-[var(--color-fg-muted)] bg-[rgba(255,255,255,0.05)] rounded">
              ↵
            </span>
            <Text size="tiny" color="placeholder">
              选择
            </Text>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1 min-w-4 h-4 flex items-center justify-center text-[11px] text-[var(--color-fg-muted)] bg-[rgba(255,255,255,0.05)] rounded">
              esc
            </span>
            <Text size="tiny" color="placeholder">
              关闭
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
