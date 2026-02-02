// @ts-nocheck - Story files use simplified mock types
import type { Meta, StoryObj } from "@storybook/react";
import { FileTreePanel } from "./FileTreePanel";
import { FileStoreProvider, createFileStore } from "../../stores/fileStore";
import { EditorStoreProvider, createEditorStore } from "../../stores/editorStore";

// Create mock stores for Storybook
const mockInvoke = async () => ({ ok: true as const, data: {} });

const createMockFileStore = (items: Array<{ documentId: string; title: string }> = []) => {
  const store = createFileStore({ invoke: mockInvoke as never });
  store.setState({
    projectId: "storybook-project",
    items: items.map((item) => ({
      documentId: item.documentId,
      title: item.title,
      updatedAt: Date.now(),
    })),
    currentDocumentId: items[0]?.documentId ?? null,
    bootstrapStatus: "ready",
    lastError: null,
  });
  return store;
};

const createMockEditorStore = () => {
  const store = createEditorStore({ invoke: mockInvoke as never });
  store.setState({
    bootstrapStatus: "ready",
    projectId: "storybook-project",
    documentId: "doc-1",
    documentContentJson: null,
    editor: null,
    lastSavedOrQueuedJson: null,
    autosaveStatus: "idle",
    autosaveError: null,
  });
  return store;
};

const defaultItems = [
  { documentId: "doc-1", title: "第一章" },
  { documentId: "doc-2", title: "第二章" },
  { documentId: "doc-3", title: "第三章" },
];

const longNameItems = [
  { documentId: "doc-1", title: "这是一个非常非常长的文档标题用于测试文本溢出处理" },
  { documentId: "doc-2", title: "Another very long document title for testing" },
];

/**
 * FileTreePanel 组件 Story
 *
 * 功能：
 * - 显示项目文档列表
 * - 支持创建/重命名/删除文档
 * - 显示空状态、加载状态、错误状态
 */
const meta: Meta<typeof FileTreePanel> = {
  title: "Features/FileTreePanel",
  component: FileTreePanel,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    projectId: {
      control: "text",
      description: "Project ID",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认状态
 *
 * 有项目 ID 时的基本状态
 */
export const Default: Story = {
  args: {
    projectId: "project-1",
  },
  render: (args) => (
    <EditorStoreProvider store={createMockEditorStore()}>
      <FileStoreProvider store={createMockFileStore(defaultItems)}>
        <div style={{ width: "280px", height: "400px", backgroundColor: "var(--color-bg-surface)" }}>
          <FileTreePanel {...args} />
        </div>
      </FileStoreProvider>
    </EditorStoreProvider>
  ),
};

/**
 * 空状态
 *
 * 无文档时显示提示
 */
export const Empty: Story = {
  args: {
    projectId: "empty-project",
  },
  render: (args) => (
    <EditorStoreProvider store={createMockEditorStore()}>
      <FileStoreProvider store={createMockFileStore([])}>
        <div style={{ width: "280px", height: "400px", backgroundColor: "var(--color-bg-surface)" }}>
          <FileTreePanel {...args} />
        </div>
      </FileStoreProvider>
    </EditorStoreProvider>
  ),
};

/**
 * 窄宽度
 *
 * 最小宽度下的布局
 */
export const NarrowWidth: Story = {
  args: {
    projectId: "project-1",
  },
  render: (args) => (
    <EditorStoreProvider store={createMockEditorStore()}>
      <FileStoreProvider store={createMockFileStore(defaultItems)}>
        <div style={{ width: "180px", height: "400px", backgroundColor: "var(--color-bg-surface)" }}>
          <FileTreePanel {...args} />
        </div>
      </FileStoreProvider>
    </EditorStoreProvider>
  ),
};

/**
 * 超长文件名
 *
 * 测试文本溢出处理
 */
export const LongFileName: Story = {
  args: {
    projectId: "long-names-project",
  },
  render: (args) => (
    <EditorStoreProvider store={createMockEditorStore()}>
      <FileStoreProvider store={createMockFileStore(longNameItems)}>
        <div style={{ width: "240px", height: "400px", backgroundColor: "var(--color-bg-surface)" }}>
          <FileTreePanel {...args} />
        </div>
      </FileStoreProvider>
    </EditorStoreProvider>
  ),
};

/**
 * 全高度
 *
 * 完整高度场景
 */
export const FullHeight: Story = {
  args: {
    projectId: "project-1",
  },
  render: (args) => (
    <EditorStoreProvider store={createMockEditorStore()}>
      <FileStoreProvider store={createMockFileStore(defaultItems)}>
        <div style={{ width: "280px", height: "100vh", backgroundColor: "var(--color-bg-surface)" }}>
          <FileTreePanel {...args} />
        </div>
      </FileStoreProvider>
    </EditorStoreProvider>
  ),
};
