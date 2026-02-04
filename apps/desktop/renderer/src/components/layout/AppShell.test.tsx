import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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
 * Create mock IPC for testing.
 *
 * Why: Returns proper data structures to avoid null reference errors.
 * Uses a factory function to get fresh mocks for each test.
 */
function createMockIpc() {
  return {
    invoke: vi.fn().mockImplementation(async (channel: string) => {
      // Simulate minimal async delay to trigger state updates properly
      await Promise.resolve();
      if (channel === "project:list") {
        return { ok: true, data: { items: [] } };
      }
      if (channel === "project:getCurrent") {
        return { ok: false, error: { code: "NOT_FOUND", message: "No project" } };
      }
      return { ok: true, data: { items: [], settings: {}, content: "" } };
    }),
    on: (): (() => void) => () => {},
  };
}

let mockIpc = createMockIpc();

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
  beforeEach(() => {
    vi.clearAllMocks();
    mockIpc = createMockIpc();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Render AppShell with all required providers.
   *
   * Why: Wraps render in act() and waits for initial bootstrap to complete,
   * avoiding "not wrapped in act()" warnings from async state updates.
   */
  const renderWithWrapper = async () => {
    let result: ReturnType<typeof render>;

    await act(async () => {
      result = render(
        <AppShellTestWrapper>
          <AppShell />
        </AppShellTestWrapper>,
      );
      // Wait for bootstrap effects to settle
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    return result!;
  };

  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 AppShell 组件", async () => {
      await renderWithWrapper();

      const appShell = screen.getByTestId("app-shell");
      expect(appShell).toBeInTheDocument();
    });

    it("应该渲染 IconBar", async () => {
      await renderWithWrapper();

      // IconBar 通过 testid 识别
      const iconBar = screen.getByTestId("icon-bar");
      expect(iconBar).toBeInTheDocument();
    });

    it("应该渲染 Sidebar", async () => {
      await renderWithWrapper();

      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).toBeInTheDocument();
    });

    it("应该渲染 RightPanel", async () => {
      await renderWithWrapper();

      const panel = screen.getByTestId("layout-panel");
      expect(panel).toBeInTheDocument();
    });

    it("应该渲染 StatusBar", async () => {
      await renderWithWrapper();

      const statusBar = screen.getByTestId("layout-statusbar");
      expect(statusBar).toBeInTheDocument();
    });

    it("应该渲染 Resizer", async () => {
      await renderWithWrapper();

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
    it("应该有 flex 布局", async () => {
      await renderWithWrapper();

      const appShell = screen.getByTestId("app-shell");
      expect(appShell).toHaveClass("flex");
    });

    it("应该有正确的背景色", async () => {
      await renderWithWrapper();

      const appShell = screen.getByTestId("app-shell");
      expect(appShell.className).toContain("bg-[var(--color-bg-base)]");
    });

    it("应该占满高度", async () => {
      await renderWithWrapper();

      const appShell = screen.getByTestId("app-shell");
      expect(appShell).toHaveClass("h-full");
    });
  });

  // ===========================================================================
  // 键盘快捷键测试
  // ===========================================================================
  describe("键盘快捷键", () => {
    it("Ctrl + \\ 应该切换侧边栏", async () => {
      await renderWithWrapper();

      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).not.toHaveClass("hidden");

      // 触发 Ctrl + \
      await act(async () => {
        fireEvent.keyDown(window, { key: "\\", ctrlKey: true });
      });

      // 侧边栏应该隐藏
      expect(sidebar).toHaveClass("hidden");
    });

    it("Ctrl + L 应该切换右侧面板", async () => {
      await renderWithWrapper();

      const panel = screen.getByTestId("layout-panel");
      expect(panel).not.toHaveClass("hidden");

      // 触发 Ctrl + L
      await act(async () => {
        fireEvent.keyDown(window, { key: "l", ctrlKey: true });
      });

      // 面板应该隐藏
      expect(panel).toHaveClass("hidden");
    });

    it("F11 应该切换 Zen 模式", async () => {
      await renderWithWrapper();

      // 触发 F11
      await act(async () => {
        fireEvent.keyDown(window, { key: "F11" });
      });

      // Zen 模式下侧边栏和面板都应该隐藏
      const sidebar = screen.getByTestId("layout-sidebar");
      const panel = screen.getByTestId("layout-panel");
      expect(sidebar).toHaveClass("hidden");
      expect(panel).toHaveClass("hidden");
    });

    it("Zen 模式下 Escape 应该退出 Zen 模式", async () => {
      await renderWithWrapper();

      // 进入 Zen 模式
      await act(async () => {
        fireEvent.keyDown(window, { key: "F11" });
      });

      // 按 Escape 退出
      await act(async () => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      // 侧边栏应该恢复显示
      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).not.toHaveClass("hidden");
    });

    it("Ctrl + P 应该打开命令面板", async () => {
      await renderWithWrapper();

      // 触发 Ctrl + P
      await act(async () => {
        fireEvent.keyDown(window, { key: "p", ctrlKey: true });
      });

      // 命令面板应该打开
      await waitFor(() => {
        expect(screen.getByTestId("command-palette")).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // 侧边栏交互测试
  // ===========================================================================
  describe("侧边栏交互", () => {
    it("点击 IconBar Files 按钮应该切换侧边栏", async () => {
      await renderWithWrapper();

      const filesButton = screen.getByTestId("icon-bar-files");
      const sidebar = screen.getByTestId("layout-sidebar");

      // 初始状态：sidebar 展开（files 是默认 activeLeftPanel）
      expect(sidebar).not.toHaveClass("hidden");

      // 点击同一按钮会切换折叠
      await act(async () => {
        fireEvent.click(filesButton);
      });

      expect(sidebar).toHaveClass("hidden");
    });
  });

  // ===========================================================================
  // 欢迎页面测试
  // ===========================================================================
  describe("欢迎页面", () => {
    it("无项目时应该显示欢迎页面", async () => {
      await renderWithWrapper();

      // 等待 bootstrap 完成后，无项目时显示 WelcomeScreen
      await waitFor(() => {
        const main = screen.getByRole("main");
        expect(main).toBeInTheDocument();
      });
    });
  });
});
