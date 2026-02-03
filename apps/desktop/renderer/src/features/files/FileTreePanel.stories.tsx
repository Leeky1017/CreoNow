import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { FileTreePanel } from "./FileTreePanel";
import {
  FileStoreProvider,
  createFileStore,
  type DocumentListItem,
} from "../../stores/fileStore";
import {
  EditorStoreProvider,
  createEditorStore,
} from "../../stores/editorStore";

/**
 * FileTreePanel 组件 Story
 *
 * Phase 4.1 - 左侧文件树面板
 *
 * 目标：
 * - 修复 Rename 输入框溢出
 * - Rename/Delete 不再 inline，改为菜单（右键 ContextMenu + ⋯ 菜单）
 */

function createMockIpc(options: {
  items?: DocumentListItem[];
  currentDocumentId?: string | null;
}) {
  const items = options.items ?? [];
  const currentDocumentId = options.currentDocumentId ?? null;

  return {
    invoke: async (channel: string): Promise<unknown> => {
      if (channel === "file:document:list") {
        return { ok: true, data: { items } };
      }
      if (channel === "file:document:getCurrent") {
        if (currentDocumentId) {
          return { ok: true, data: { documentId: currentDocumentId } };
        }
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "No current document" },
        };
      }
      if (channel === "file:document:create") {
        return { ok: true, data: { documentId: `new-${Date.now()}` } };
      }
      if (channel === "file:document:setCurrent") {
        return {
          ok: true,
          data: { documentId: currentDocumentId ?? "doc-1" },
        };
      }
      if (channel === "file:document:rename") {
        return { ok: true, data: { updated: true } };
      }
      if (channel === "file:document:delete") {
        return { ok: true, data: { deleted: true } };
      }
      if (channel === "file:document:read") {
        return { ok: true, data: { contentJson: "{}" } };
      }
      return { ok: true, data: {} };
    },
    on: (): (() => void) => () => {},
  };
}

function FileTreePanelWrapper(props: {
  projectId: string;
  items?: DocumentListItem[];
  currentDocumentId?: string | null;
  bootstrapStatus?: "idle" | "loading" | "ready" | "error";
  initialRenameDocumentId?: string;
}): JSX.Element {
  // 固定初始值，避免 Storybook render 频繁 re-create store（造成交互不稳定）
  const [{ initialProps, fileStore, editorStore }] = React.useState(() => {
    const initialProps = {
      items: props.items,
      currentDocumentId: props.currentDocumentId,
      projectId: props.projectId,
      bootstrapStatus: props.bootstrapStatus,
      initialRenameDocumentId: props.initialRenameDocumentId,
    };

    const mockIpc = createMockIpc({
      items: initialProps.items,
      currentDocumentId: initialProps.currentDocumentId,
    });

    return {
      initialProps,
      fileStore: createFileStore(
        mockIpc as Parameters<typeof createFileStore>[0],
      ),
      editorStore: createEditorStore(
        mockIpc as Parameters<typeof createEditorStore>[0],
      ),
    };
  });

  React.useEffect(() => {
    fileStore.setState({
      projectId: initialProps.projectId,
      items: initialProps.items ?? [],
      currentDocumentId: initialProps.currentDocumentId ?? null,
      bootstrapStatus: initialProps.bootstrapStatus ?? "ready",
      lastError: null,
    });

    editorStore.setState({
      bootstrapStatus: "ready",
      projectId: initialProps.projectId,
      documentId: initialProps.currentDocumentId ?? null,
      documentContentJson: null,
      editor: null,
      lastSavedOrQueuedJson: null,
      autosaveStatus: "idle",
      autosaveError: null,
    });
  }, [editorStore, fileStore, initialProps]);

  return (
    <EditorStoreProvider store={editorStore}>
      <FileStoreProvider store={fileStore}>
        <div
          style={{
            width: 280,
            height: 400,
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}
        >
          <FileTreePanel
            projectId={initialProps.projectId}
            initialRenameDocumentId={initialProps.initialRenameDocumentId}
          />
        </div>
      </FileStoreProvider>
    </EditorStoreProvider>
  );
}

const meta: Meta<typeof FileTreePanel> = {
  title: "Features/FileTreePanel",
  component: FileTreePanel,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FileTreePanel>;

/**
 * 默认状态
 *
 * 有项目 ID 时的基本状态
 */
export const Default: Story = {
  render: () => (
    <FileTreePanelWrapper
      projectId="project-1"
      items={[
        {
          documentId: "doc-1",
          title: "Chapter 1",
          updatedAt: Date.now() - 86400000,
        },
        {
          documentId: "doc-2",
          title: "Chapter 2",
          updatedAt: Date.now() - 172800000,
        },
        {
          documentId: "doc-3",
          title: "Epilogue",
          updatedAt: Date.now() - 259200000,
        },
      ]}
      currentDocumentId="doc-1"
    />
  ),
};

/**
 * 空状态
 *
 * 无文档时显示提示
 */
export const Empty: Story = {
  render: () => (
    <FileTreePanelWrapper
      projectId="project-empty"
      items={[]}
      currentDocumentId={null}
    />
  ),
};

/**
 * 加载状态
 *
 * 正在加载文件列表
 */
export const Loading: Story = {
  render: () => (
    <FileTreePanelWrapper
      projectId="project-loading"
      items={[]}
      currentDocumentId={null}
      bootstrapStatus="loading"
    />
  ),
};

/**
 * 大量文件
 *
 * 测试滚动与性能
 */
export const ManyFiles: Story = {
  render: () => {
    const items: DocumentListItem[] = Array.from({ length: 50 }, (_, i) => ({
      documentId: `doc-${i + 1}`,
      title: `Document ${i + 1}`,
      updatedAt: Date.now() - i * 3600000,
    }));
    return (
      <FileTreePanelWrapper
        projectId="project-many"
        items={items}
        currentDocumentId="doc-10"
      />
    );
  },
};

/**
 * 超长文件名
 *
 * 测试文本截断
 */
export const LongFileNames: Story = {
  render: () => (
    <FileTreePanelWrapper
      projectId="project-long"
      items={[
        {
          documentId: "doc-1",
          title:
            "This is a very long document title that should be truncated properly in the UI",
          updatedAt: Date.now() - 86400000,
        },
        {
          documentId: "doc-2",
          title:
            "Another extremely long title for testing text overflow behavior in the file tree panel",
          updatedAt: Date.now() - 172800000,
        },
        {
          documentId: "doc-3",
          title: "Short",
          updatedAt: Date.now() - 259200000,
        },
      ]}
      currentDocumentId="doc-1"
    />
  ),
};

/**
 * 选中状态
 */
export const WithSelection: Story = {
  render: () => (
    <FileTreePanelWrapper
      projectId="project-sel"
      items={[
        {
          documentId: "doc-1",
          title: "Introduction",
          updatedAt: Date.now() - 86400000,
        },
        {
          documentId: "doc-2",
          title: "Main Content",
          updatedAt: Date.now() - 172800000,
        },
        {
          documentId: "doc-3",
          title: "Conclusion",
          updatedAt: Date.now() - 259200000,
        },
        {
          documentId: "doc-4",
          title: "Appendix A",
          updatedAt: Date.now() - 345600000,
        },
        {
          documentId: "doc-5",
          title: "Appendix B",
          updatedAt: Date.now() - 432000000,
        },
      ]}
      currentDocumentId="doc-2"
    />
  ),
};

/**
 * Rename 演示
 *
 * 进入即自动进入 Rename 模式，用于稳定复现并验证“不会溢出”。
 */
export const RenameDemo: Story = {
  render: () => (
    <FileTreePanelWrapper
      projectId="project-rename"
      items={[
        {
          documentId: "doc-short",
          title: "Short Name",
          updatedAt: Date.now() - 86400000,
        },
        {
          documentId: "doc-long",
          title:
            "This is a very long document title that should be properly handled during rename",
          updatedAt: Date.now() - 172800000,
        },
      ]}
      currentDocumentId="doc-long"
      initialRenameDocumentId="doc-long"
    />
  ),
};

// =============================================================================
// P2: 键盘导航测试
// =============================================================================

/**
 * 键盘导航演示
 *
 * 展示文件树的键盘操作。
 *
 * 验证点：
 * - ↑↓ 键在文件之间移动选中项
 * - Enter 键打开选中文件
 * - → 键展开文件夹（如有）
 * - ← 键折叠文件夹（如有）
 * - Delete 键删除选中文件（需确认）
 * - F2 键重命名选中文件
 *
 * 浏览器测试步骤：
 * 1. 点击文件列表区域获取焦点
 * 2. 按 ↓ 键，验证选中项移动到下一个文件
 * 3. 按 ↑ 键，验证选中项移动到上一个文件
 * 4. 按 Enter 键，验证操作提示显示打开的文件
 * 5. 按 F2 键，验证进入重命名模式
 */
function KeyboardNavigationDemo(): JSX.Element {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [lastAction, setLastAction] = React.useState<string | null>(null);

  // 使用固定时间戳（Storybook 演示用，避免 react-hooks/purity 错误）
  const items: DocumentListItem[] = [
    { documentId: "doc-1", title: "Chapter 1 - Introduction", updatedAt: 1706745600000 },
    { documentId: "doc-2", title: "Chapter 2 - Development", updatedAt: 1706659200000 },
    { documentId: "doc-3", title: "Chapter 3 - Climax", updatedAt: 1706572800000 },
    { documentId: "doc-4", title: "Chapter 4 - Resolution", updatedAt: 1706486400000 },
    { documentId: "doc-5", title: "Epilogue", updatedAt: 1706400000000 },
  ];

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
        setLastAction(`↓ 选中: "${items[Math.min(selectedIndex + 1, items.length - 1)]?.title}"`);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        setLastAction(`↑ 选中: "${items[Math.max(selectedIndex - 1, 0)]?.title}"`);
      } else if (e.key === "Enter") {
        setLastAction(`Enter 打开: "${items[selectedIndex]?.title}"`);
      } else if (e.key === "F2") {
        setLastAction(`F2 重命名: "${items[selectedIndex]?.title}"`);
      } else if (e.key === "Delete") {
        setLastAction(`Delete 删除: "${items[selectedIndex]?.title}" (需确认)`);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, items]);

  return (
    <div style={{ display: "flex", gap: "24px", padding: "24px" }}>
      {/* 操作提示 */}
      <div
        style={{
          width: "280px",
          padding: "16px",
          backgroundColor: "var(--color-bg-surface)",
          borderRadius: "8px",
          border: "1px solid var(--color-border-default)",
          fontSize: "12px",
          color: "var(--color-fg-muted)",
        }}
      >
        <p style={{ fontWeight: 500, marginBottom: "12px" }}>
          键盘导航测试（Windows）：
        </p>
        <ul style={{ paddingLeft: "1rem", margin: 0, lineHeight: 1.8 }}>
          <li>
            <code style={{ backgroundColor: "var(--color-bg-raised)", padding: "2px 4px", borderRadius: "3px" }}>↑↓</code> 移动选中项
          </li>
          <li>
            <code style={{ backgroundColor: "var(--color-bg-raised)", padding: "2px 4px", borderRadius: "3px" }}>Enter</code> 打开文件
          </li>
          <li>
            <code style={{ backgroundColor: "var(--color-bg-raised)", padding: "2px 4px", borderRadius: "3px" }}>F2</code> 重命名
          </li>
          <li>
            <code style={{ backgroundColor: "var(--color-bg-raised)", padding: "2px 4px", borderRadius: "3px" }}>Delete</code> 删除
          </li>
          <li>
            <code style={{ backgroundColor: "var(--color-bg-raised)", padding: "2px 4px", borderRadius: "3px" }}>→</code> 展开文件夹
          </li>
          <li>
            <code style={{ backgroundColor: "var(--color-bg-raised)", padding: "2px 4px", borderRadius: "3px" }}>←</code> 折叠文件夹
          </li>
        </ul>
        {lastAction && (
          <div
            style={{
              marginTop: "16px",
              padding: "10px",
              backgroundColor: "var(--color-bg-selected)",
              borderRadius: "6px",
              color: "var(--color-fg-default)",
              fontSize: "11px",
            }}
          >
            最近操作: {lastAction}
          </div>
        )}
      </div>

      {/* 文件树 */}
      <FileTreePanelWrapper
        projectId="project-keyboard"
        items={items}
        currentDocumentId={items[selectedIndex]?.documentId ?? null}
      />
    </div>
  );
}

export const KeyboardNavigation: Story = {
  render: () => <KeyboardNavigationDemo />,
  parameters: {
    docs: {
      description: {
        story:
          "键盘导航演示。↑↓ 移动，Enter 打开，F2 重命名，Delete 删除。",
      },
    },
  },
};
