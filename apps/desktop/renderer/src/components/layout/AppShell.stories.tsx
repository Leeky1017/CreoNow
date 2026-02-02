import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { AppShell } from "./AppShell";
import {
  LayoutStoreProvider,
  createLayoutStore,
} from "../../stores/layoutStore";
import {
  ProjectStoreProvider,
  createProjectStore,
} from "../../stores/projectStore";
import { FileStoreProvider, createFileStore } from "../../stores/fileStore";
import {
  EditorStoreProvider,
  createEditorStore,
} from "../../stores/editorStore";
import { AiStoreProvider, createAiStore } from "../../stores/aiStore";
import {
  MemoryStoreProvider,
  createMemoryStore,
} from "../../stores/memoryStore";
import {
  ContextStoreProvider,
  createContextStore,
} from "../../stores/contextStore";
import {
  SearchStoreProvider,
  createSearchStore,
} from "../../stores/searchStore";
import { KgStoreProvider, createKgStore } from "../../stores/kgStore";
import { ThemeStoreProvider, createThemeStore } from "../../stores/themeStore";

/**
 * Mock preferences for Storybook.
 */
const mockPreferences = {
  get: <T,>(): T | null => null,
  set: (): void => {},
  remove: (): void => {},
  clear: (): void => {},
};

/**
 * Mock IPC for Storybook.
 * Returns proper data structures to avoid null reference errors.
 */
const mockIpc = {
  invoke: async (): Promise<unknown> => ({
    ok: true,
    data: { items: [], settings: {}, content: "" },
  }),
  on: (): (() => void) => () => {},
};

/**
 * Full store provider wrapper for AppShell stories.
 */
function AppShellWrapper({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const layoutStore = React.useMemo(
    () => createLayoutStore(mockPreferences),
    [],
  );
  const projectStore = React.useMemo(
    () =>
      createProjectStore(mockIpc as Parameters<typeof createProjectStore>[0]),
    [],
  );
  const fileStore = React.useMemo(
    () => createFileStore(mockIpc as Parameters<typeof createFileStore>[0]),
    [],
  );
  const editorStore = React.useMemo(
    () => createEditorStore(mockIpc as Parameters<typeof createEditorStore>[0]),
    [],
  );
  const aiStore = React.useMemo(
    () => createAiStore(mockIpc as Parameters<typeof createAiStore>[0]),
    [],
  );
  const memoryStore = React.useMemo(
    () => createMemoryStore(mockIpc as Parameters<typeof createMemoryStore>[0]),
    [],
  );
  const contextStore = React.useMemo(
    () =>
      createContextStore(mockIpc as Parameters<typeof createContextStore>[0]),
    [],
  );
  const searchStore = React.useMemo(
    () => createSearchStore(mockIpc as Parameters<typeof createSearchStore>[0]),
    [],
  );
  const kgStore = React.useMemo(
    () => createKgStore(mockIpc as Parameters<typeof createKgStore>[0]),
    [],
  );
  const themeStore = React.useMemo(() => createThemeStore(mockPreferences), []);

  return (
    <LayoutStoreProvider store={layoutStore}>
      <ProjectStoreProvider store={projectStore}>
        <FileStoreProvider store={fileStore}>
          <EditorStoreProvider store={editorStore}>
            <ThemeStoreProvider store={themeStore}>
              <AiStoreProvider store={aiStore}>
                <MemoryStoreProvider store={memoryStore}>
                  <ContextStoreProvider store={contextStore}>
                    <SearchStoreProvider store={searchStore}>
                      <KgStoreProvider store={kgStore}>
                        {children}
                      </KgStoreProvider>
                    </SearchStoreProvider>
                  </ContextStoreProvider>
                </MemoryStoreProvider>
              </AiStoreProvider>
            </ThemeStoreProvider>
          </EditorStoreProvider>
        </FileStoreProvider>
      </ProjectStoreProvider>
    </LayoutStoreProvider>
  );
}

/**
 * AppShell 组件 Story
 *
 * 设计规范: AppShell 是主要的布局容器，包含 IconBar、Sidebar、Main、RightPanel、StatusBar。
 *
 * 功能：
 * - 三列布局（IconBar + Sidebar + Main + RightPanel）
 * - 支持侧边栏和面板的折叠/展开
 * - 支持 Zen 模式
 * - 支持键盘快捷键
 */
const meta: Meta<typeof AppShell> = {
  title: "Layout/AppShell",
  component: AppShell,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <AppShellWrapper>
        <Story />
      </AppShellWrapper>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认状态
 *
 * 完整的三列布局，侧边栏和面板都展开
 */
export const Default: Story = {
  render: () => (
    <div style={{ height: "600px" }}>
      <AppShell />
    </div>
  ),
};

/**
 * 完整高度
 *
 * 全屏高度的布局
 */
export const FullHeight: Story = {
  render: () => (
    <div style={{ height: "100vh" }}>
      <AppShell />
    </div>
  ),
};

/**
 * 交互指南
 *
 * 展示 AppShell 的交互操作
 */
export const InteractionGuide: Story = {
  render: () => (
    <div>
      <div
        style={{
          padding: "1rem",
          backgroundColor: "var(--color-bg-surface)",
          borderBottom: "1px solid var(--color-separator)",
          fontSize: "12px",
          color: "var(--color-fg-muted)",
        }}
      >
        <p style={{ marginBottom: "0.5rem", fontWeight: 500 }}>键盘快捷键：</p>
        <ul style={{ paddingLeft: "1rem", margin: 0 }}>
          <li>Ctrl/Cmd + \ : 切换侧边栏</li>
          <li>Ctrl/Cmd + L : 切换右侧面板</li>
          <li>Ctrl/Cmd + P : 打开命令面板</li>
          <li>F11 : 进入 Zen 模式</li>
          <li>Esc : 退出 Zen 模式</li>
        </ul>
      </div>
      <div style={{ height: "500px" }}>
        <AppShell />
      </div>
    </div>
  ),
};
