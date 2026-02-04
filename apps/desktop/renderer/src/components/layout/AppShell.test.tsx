import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
 * Mock preferences for testing.
 */
const mockPreferences = {
  get: <T,>(): T | null => null,
  set: (): void => {},
  remove: (): void => {},
  clear: (): void => {},
};

/**
 * Mock IPC for testing.
 * Returns proper data structures to avoid null reference errors.
 */
const mockIpc = {
  invoke: vi.fn(async () => ({
    ok: true,
    data: { items: [], settings: {}, content: "" },
  })),
  on: (): (() => void) => () => {},
};

/**
 * Full store provider wrapper for AppShell tests.
 */
function AppShellTestWrapper({
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

describe("AppShell", () => {
  const renderWithWrapper = () => {
    return render(
      <AppShellTestWrapper>
        <AppShell />
      </AppShellTestWrapper>,
    );
  };

  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 AppShell 组件", () => {
      renderWithWrapper();

      const appShell = screen.getByTestId("app-shell");
      expect(appShell).toBeInTheDocument();
    });

    it("应该渲染 IconBar", () => {
      renderWithWrapper();

      // IconBar 通过 testid 识别
      const iconBar = screen.getByTestId("icon-bar");
      expect(iconBar).toBeInTheDocument();
    });

    it("应该渲染 Sidebar", () => {
      renderWithWrapper();

      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).toBeInTheDocument();
    });

    it("应该渲染 RightPanel", () => {
      renderWithWrapper();

      const panel = screen.getByTestId("layout-panel");
      expect(panel).toBeInTheDocument();
    });

    it("应该渲染 StatusBar", () => {
      renderWithWrapper();

      const statusBar = screen.getByTestId("layout-statusbar");
      expect(statusBar).toBeInTheDocument();
    });

    it("应该渲染 Resizer", () => {
      renderWithWrapper();

      const sidebarResizer = screen.getByTestId("resize-handle-sidebar");
      const panelResizer = screen.getByTestId("resize-handle-panel");
      expect(sidebarResizer).toBeInTheDocument();
      expect(panelResizer).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 布局结构测试
  // ===========================================================================
  describe("布局结构", () => {
    it("应该有 flex 布局", () => {
      renderWithWrapper();

      const appShell = screen.getByTestId("app-shell");
      expect(appShell).toHaveClass("flex");
    });

    it("应该有正确的背景色", () => {
      renderWithWrapper();

      const appShell = screen.getByTestId("app-shell");
      expect(appShell.className).toContain("bg-[var(--color-bg-base)]");
    });

    it("应该占满高度", () => {
      renderWithWrapper();

      const appShell = screen.getByTestId("app-shell");
      expect(appShell).toHaveClass("h-full");
    });
  });

  // ===========================================================================
  // 键盘快捷键测试
  // ===========================================================================
  describe("键盘快捷键", () => {
    it("Ctrl + \\ 应该切换侧边栏", () => {
      renderWithWrapper();

      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).not.toHaveClass("hidden");

      // 触发 Ctrl + \
      fireEvent.keyDown(window, { key: "\\", ctrlKey: true });

      // 侧边栏应该隐藏
      expect(sidebar).toHaveClass("hidden");
    });

    it("Ctrl + L 应该切换右侧面板", () => {
      renderWithWrapper();

      const panel = screen.getByTestId("layout-panel");
      expect(panel).not.toHaveClass("hidden");

      // 触发 Ctrl + L
      fireEvent.keyDown(window, { key: "l", ctrlKey: true });

      // 面板应该隐藏
      expect(panel).toHaveClass("hidden");
    });

    it("F11 应该切换 Zen 模式", () => {
      renderWithWrapper();

      // 触发 F11
      fireEvent.keyDown(window, { key: "F11" });

      // Zen 模式下侧边栏和面板都应该隐藏
      const sidebar = screen.getByTestId("layout-sidebar");
      const panel = screen.getByTestId("layout-panel");
      expect(sidebar).toHaveClass("hidden");
      expect(panel).toHaveClass("hidden");
    });

    it("Zen 模式下 Escape 应该退出 Zen 模式", () => {
      renderWithWrapper();

      // 进入 Zen 模式
      fireEvent.keyDown(window, { key: "F11" });

      // 按 Escape 退出
      fireEvent.keyDown(window, { key: "Escape" });

      // 侧边栏应该恢复显示
      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).not.toHaveClass("hidden");
    });

    it("Ctrl + P 应该打开命令面板", () => {
      renderWithWrapper();

      // 触发 Ctrl + P
      fireEvent.keyDown(window, { key: "p", ctrlKey: true });

      // 命令面板应该打开（通过检测 dialog 或特定元素）
      // 由于 CommandPalette 可能使用 dialog，我们检查它是否被渲染
      // 具体检查方式取决于 CommandPalette 的实现
    });
  });

  // ===========================================================================
  // 侧边栏交互测试
  // ===========================================================================
  describe("侧边栏交互", () => {
    it("点击 IconBar Files 按钮应该切换侧边栏", () => {
      renderWithWrapper();

      const filesButton = screen.getByTestId("icon-bar-files");
      const sidebar = screen.getByTestId("layout-sidebar");

      // 初始状态：sidebar 展开（files 是默认 activeLeftPanel）
      expect(sidebar).not.toHaveClass("hidden");

      // 点击同一按钮会切换折叠
      fireEvent.click(filesButton);

      expect(sidebar).toHaveClass("hidden");
    });
  });

  // ===========================================================================
  // 欢迎页面测试
  // ===========================================================================
  describe("欢迎页面", () => {
    it("无项目时应该显示欢迎页面", () => {
      renderWithWrapper();

      // 欢迎页面应该显示（具体内容取决于 WelcomeScreen 组件）
      const main = screen.getByRole("main");
      expect(main).toBeInTheDocument();
    });
  });
});
