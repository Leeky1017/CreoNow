import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import React from "react";
import { AppShell } from "./AppShell";
import {
  LayoutStoreProvider,
  createLayoutStore,
  type UseLayoutStore,
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
import {
  VersionStoreProvider,
  createVersionStore,
} from "../../stores/versionStore";
import { AiStoreProvider, createAiStore } from "../../stores/aiStore";
import {
  MemoryStoreProvider,
  createMemoryStore,
} from "../../stores/memoryStore";
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
      if (channel === "project:project:list") {
        return { ok: true, data: { items: [] } };
      }
      if (channel === "project:project:getcurrent") {
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "No project" },
        };
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
  layoutStoreOverride,
}: {
  children: React.ReactNode;
  layoutStoreOverride?: UseLayoutStore;
}): JSX.Element {
  const layoutStore = React.useMemo(
    () => layoutStoreOverride ?? createLayoutStore(mockPreferences),
    [layoutStoreOverride],
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
  const versionStore = React.useMemo(
    () =>
      createVersionStore(mockIpc as Parameters<typeof createVersionStore>[0]),
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
            <VersionStoreProvider store={versionStore}>
              <ThemeStoreProvider store={themeStore}>
                <AiStoreProvider store={aiStore}>
                  <MemoryStoreProvider store={memoryStore}>
                    <SearchStoreProvider store={searchStore}>
                      <KgStoreProvider store={kgStore}>
                        {children}
                      </KgStoreProvider>
                    </SearchStoreProvider>
                  </MemoryStoreProvider>
                </AiStoreProvider>
              </ThemeStoreProvider>
            </VersionStoreProvider>
          </EditorStoreProvider>
        </FileStoreProvider>
      </ProjectStoreProvider>
    </LayoutStoreProvider>
  );
}

async function renderWithWrapper(options?: {
  layoutStoreOverride?: UseLayoutStore;
}) {
  let result: ReturnType<typeof render>;

  await act(async () => {
    result = render(
      <AppShellTestWrapper layoutStoreOverride={options?.layoutStoreOverride}>
        <AppShell />
      </AppShellTestWrapper>,
    );
  });
  await waitFor(() => {
    expect(mockIpc.invoke).toHaveBeenCalled();
  });

  return result!;
}

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIpc = createMockIpc();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

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
  // Layout结构测试
  // ===========================================================================
  describe("Layout结构", () => {
    it("应该有 flex Layout", async () => {
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

    it("sidebar should not have width transition (drag jank fix)", async () => {
      await renderWithWrapper();

      const sidebar = screen.getByTestId("layout-sidebar");

      expect(sidebar.style.transition).toBe("");
    });
  });

  // ===========================================================================
  // Keyboard Shortcuts测试
  // ===========================================================================
  describe("Keyboard Shortcuts", () => {
    it("Ctrl + \\ 应该Toggle Sidebar", async () => {
      await renderWithWrapper();

      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).not.toHaveClass("hidden");

      // 触发 Ctrl + \
      await act(async () => {
        fireEvent.keyDown(document, { key: "\\", ctrlKey: true });
      });

      // Sidebar应该隐藏
      expect(sidebar).toHaveClass("hidden");
    });

    it("Ctrl + L 应该Toggle Right Panel", async () => {
      await renderWithWrapper();

      const panel = screen.getByTestId("layout-panel");
      expect(panel).not.toHaveClass("hidden");

      // 触发 Ctrl + L
      await act(async () => {
        fireEvent.keyDown(document, { key: "l", ctrlKey: true });
      });

      // Panel应该隐藏
      expect(panel).toHaveClass("hidden");
    });

    it("Ctrl + L 从折叠to open时应该强制切换到 AI tab", async () => {
      const layoutStore = createLayoutStore(mockPreferences);
      layoutStore.setState({
        panelCollapsed: true,
        activeRightPanel: "info",
      });
      await renderWithWrapper({ layoutStoreOverride: layoutStore });

      const panel = screen.getByTestId("layout-panel");
      expect(panel).toHaveClass("hidden");

      await act(async () => {
        fireEvent.keyDown(document, { key: "l", ctrlKey: true });
      });

      expect(panel).not.toHaveClass("hidden");
      expect(screen.getByTestId("right-panel-tab-ai")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByTestId("right-panel-tab-info")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    it("F11 应该切换 Zen Mode", async () => {
      await renderWithWrapper();

      // 触发 F11
      await act(async () => {
        fireEvent.keyDown(document, { key: "F11" });
      });

      // Zen Mode下Sidebar和Panel都应该隐藏
      const sidebar = screen.getByTestId("layout-sidebar");
      const panel = screen.getByTestId("layout-panel");
      expect(sidebar).toHaveClass("hidden");
      expect(panel).toHaveClass("hidden");
    });

    it("Zen Mode下 Escape 应该退出 Zen Mode", async () => {
      await renderWithWrapper();

      // 进入 Zen Mode
      await act(async () => {
        fireEvent.keyDown(document, { key: "F11" });
      });

      // 按 Escape 退出
      await act(async () => {
        fireEvent.keyDown(document, { key: "Escape" });
      });

      // Sidebar应该Restore显示
      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).not.toHaveClass("hidden");
    });

    it("Zen Mode下 Ctrl + P 不应to openCommandPanel", async () => {
      await renderWithWrapper();

      await act(async () => {
        fireEvent.keyDown(document, { key: "F11" });
      });

      await act(async () => {
        fireEvent.keyDown(document, { key: "p", ctrlKey: true });
      });

      expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument();
    });

    it("Zen Mode下 Ctrl + L 不应Expand右侧Panel（AI 禁用）", async () => {
      await renderWithWrapper();

      await act(async () => {
        fireEvent.keyDown(document, { key: "F11" });
      });

      const panel = screen.getByTestId("layout-panel");
      expect(panel).toHaveClass("hidden");

      await act(async () => {
        fireEvent.keyDown(document, { key: "l", ctrlKey: true });
      });

      expect(panel).toHaveClass("hidden");
    });

    it("Ctrl + P 应该to openCommandPanel", async () => {
      await renderWithWrapper();

      // 触发 Ctrl + P
      await act(async () => {
        fireEvent.keyDown(document, { key: "p", ctrlKey: true });
      });

      // CommandPanel应该to open
      await waitFor(() => {
        expect(screen.getByTestId("command-palette")).toBeInTheDocument();
      });
    });
  });
});

describe("AppShell — integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIpc = createMockIpc();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("CommandPanelFiles集成", () => {
    it("Ctrl+P 后SearchFiles并 Enter，应触发 setcurrent + read to openDocuments链路", async () => {
      const invokeSpy = vi.fn().mockImplementation(async (channel: string) => {
        await Promise.resolve();

        if (channel === "project:project:list") {
          return {
            ok: true,
            data: {
              items: [{ projectId: "project-1", rootPath: "/tmp/project-1" }],
            },
          };
        }
        if (channel === "project:project:getcurrent") {
          return {
            ok: true,
            data: { projectId: "project-1", rootPath: "/tmp/project-1" },
          };
        }
        if (channel === "file:document:list") {
          return {
            ok: true,
            data: {
              items: [
                {
                  documentId: "doc-1",
                  title: "第一章.md",
                  type: "chapter",
                  status: "draft",
                  sortOrder: 0,
                  updatedAt: 1,
                },
                {
                  documentId: "doc-3",
                  title: "第三章.md",
                  type: "chapter",
                  status: "draft",
                  sortOrder: 1,
                  updatedAt: 2,
                },
              ],
            },
          };
        }
        if (channel === "file:document:getcurrent") {
          return {
            ok: true,
            data: { documentId: "doc-1" },
          };
        }
        if (channel === "file:document:read") {
          return {
            ok: true,
            data: {
              contentHash: "hash",
              contentJson: '{"type":"doc","content":[]}',
              contentMd: "",
              contentText: "",
              createdAt: 1,
              documentId: "doc-1",
              projectId: "project-1",
              sortOrder: 0,
              status: "draft",
              title: "第一章.md",
              type: "chapter",
              updatedAt: 1,
            },
          };
        }
        if (channel === "file:document:setcurrent") {
          return { ok: true, data: { documentId: "doc-3" } };
        }

        return { ok: true, data: { items: [], settings: {}, content: "" } };
      });

      mockIpc = {
        invoke: invokeSpy,
        on: (): (() => void) => () => {},
      };

      await renderWithWrapper();

      await act(async () => {
        fireEvent.keyDown(document, { key: "p", ctrlKey: true });
      });

      const input = await screen.findByPlaceholderText("Search commands or files...");
      await act(async () => {
        fireEvent.change(input, { target: { value: "第三章" } });
      });

      await waitFor(() => {
        expect(screen.getByText("第三章.md")).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.keyDown(input, { key: "Enter" });
      });

      await waitFor(() => {
        expect(invokeSpy).toHaveBeenCalledWith("file:document:setcurrent", {
          projectId: "project-1",
          documentId: "doc-3",
        });
      });
    });
  });

  // ===========================================================================
  // Sidebar交互测试
  // ===========================================================================
  describe("Sidebar交互", () => {
    it("点击 IconBar Files 按钮应该Toggle Sidebar", async () => {
      await renderWithWrapper();

      const filesButton = screen.getByTestId("icon-bar-files");
      const sidebar = screen.getByTestId("layout-sidebar");

      // 初始Status:sidebar Expand（files 是默认 activeLeftPanel）
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
    it("无Project时应该显示欢迎页面", async () => {
      await renderWithWrapper();

      // 等待 bootstrap Done后，无Project时显示 WelcomeScreen
      await waitFor(() => {
        const main = screen.getByRole("main");
        expect(main).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // 快捷键去抖测试
  // ===========================================================================
  describe("快捷键去抖", () => {
    it("Ctrl+\\ 300ms 内连按多次只执行一次 sidebar 切换", async () => {
      await renderWithWrapper();

      const sidebar = screen.getByTestId("layout-sidebar");
      expect(sidebar).not.toHaveClass("hidden");

      vi.useFakeTimers();

      // 快速连按 3 次
      await act(async () => {
        fireEvent.keyDown(document, { key: "\\", ctrlKey: true });
        fireEvent.keyDown(document, { key: "\\", ctrlKey: true });
        fireEvent.keyDown(document, { key: "\\", ctrlKey: true });
      });

      // Advance past debounce window
      await act(async () => {
        vi.advanceTimersByTime(350);
      });

      // Only one toggle should have executed (collapsed)
      expect(sidebar).toHaveClass("hidden");

      vi.useRealTimers();
    });

    it("Ctrl+L 300ms 内连按多次只执行一次 panel 切换", async () => {
      await renderWithWrapper();

      const panel = screen.getByTestId("layout-panel");
      expect(panel).not.toHaveClass("hidden");

      vi.useFakeTimers();

      // 快速连按 3 次
      await act(async () => {
        fireEvent.keyDown(document, { key: "l", ctrlKey: true });
        fireEvent.keyDown(document, { key: "l", ctrlKey: true });
        fireEvent.keyDown(document, { key: "l", ctrlKey: true });
      });

      // Advance past debounce window
      await act(async () => {
        vi.advanceTimersByTime(350);
      });

      // Only one toggle should have executed (collapsed)
      expect(panel).toHaveClass("hidden");

      vi.useRealTimers();
    });
  });
});
