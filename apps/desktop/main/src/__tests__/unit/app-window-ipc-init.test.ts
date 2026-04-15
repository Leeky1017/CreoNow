import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockWindow {
  on: (event: string, handler: () => void) => void;
  trigger: (event: string) => void;
  loadURL: ReturnType<typeof vi.fn>;
  loadFile: ReturnType<typeof vi.fn>;
  setAutoHideMenuBar: ReturnType<typeof vi.fn>;
  setMenuBarVisibility: ReturnType<typeof vi.fn>;
  removeMenu: ReturnType<typeof vi.fn>;
  getBounds: ReturnType<typeof vi.fn>;
  isMaximized: ReturnType<typeof vi.fn>;
  isFullScreen: ReturnType<typeof vi.fn>;
  isMinimized: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
}

const mocks = vi.hoisted(() => {
  const appHandlers = new Map<string, (...args: unknown[]) => void>();
  const createWindow = (): MockWindow => {
    const handlers = new Map<string, () => void>();
    return {
      on: vi.fn((event: string, handler: () => void) => {
        handlers.set(event, handler);
      }),
      trigger: (event: string) => handlers.get(event)?.(),
      loadURL: vi.fn(async () => undefined),
      loadFile: vi.fn(async () => undefined),
      setAutoHideMenuBar: vi.fn(),
      setMenuBarVisibility: vi.fn(),
      removeMenu: vi.fn(),
      getBounds: vi.fn(() => ({ x: 10, y: 20, width: 1280, height: 720 })),
      isMaximized: vi.fn(() => false),
      isFullScreen: vi.fn(() => false),
      isMinimized: vi.fn(() => false),
      restore: vi.fn(),
      focus: vi.fn(),
    };
  };

  const windows: MockWindow[] = [];
  const browserWindowConstructorSpy = vi.fn(() => {
    const windowInstance = createWindow();
    windows.push(windowInstance);
    return windowInstance;
  });
  const browserWindowOptions: unknown[] = [];
  const BrowserWindow = function BrowserWindow(options: unknown) {
    browserWindowOptions.push(options);
    return browserWindowConstructorSpy();
  };

  const getAllWindows = vi.fn(() => windows);
  const fromWebContents = vi.fn(() => windows[0] ?? null);

  const app = {
    setPath: vi.fn(),
    getPath: vi.fn(() => "/user-data"),
    requestSingleInstanceLock: vi.fn(() => true),
    quit: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      appHandlers.set(event, handler);
    }),
    whenReady: vi.fn<() => Promise<void>>(),
  };

  const whenReady = {
    promise: Promise.resolve(),
    resolve: () => {
      // no-op
    },
  };

  const resetWhenReady = () => {
    let resolver: (() => void) | null = null;
    const promise = new Promise<void>((resolve) => {
      resolver = resolve;
    });
    app.whenReady.mockImplementation(() => promise);
    return {
      promise,
      resolve: () => resolver?.(),
    };
  };

  const registerAiIpcHandlers = vi.fn();
  const registerProjectIpcHandlers = vi.fn();
  const registerSettingsIpcHandlers = vi.fn();
  const createProjectContextRebinder = vi.fn();
  const createEpisodicMemoryService = vi.fn(() => ({
    listSemanticMemory: vi.fn(),
    evictProjectCache: vi.fn(),
  }));
  const createSqliteEpisodeRepository = vi.fn(() => ({}));

  return {
    app,
    appHandlers,
    BrowserWindow,
    browserWindowConstructorSpy,
    browserWindowOptions,
    getAllWindows,
    fromWebContents,
    windows,
    whenReady,
    resetWhenReady,
    registerAiIpcHandlers,
    registerProjectIpcHandlers,
    registerSettingsIpcHandlers,
    createProjectContextRebinder,
    createEpisodicMemoryService,
    createSqliteEpisodeRepository,
    initDb: vi.fn(() => ({ ok: true, db: { close: vi.fn() } })),
    createMainLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), logPath: "<test>" })),
    applyBrowserWindowSecurityPolicy: vi.fn(),
    createDebouncedSaveWindowState: vi.fn(() => ({ save: vi.fn(), flush: vi.fn() })),
    loadWindowState: vi.fn(() => ({ x: 11, y: 22, width: 1200, height: 760 })),
    resolvePreloadEntryPathFromBuildConfig: vi.fn(() => "/preload.js"),
    registerGlobalExceptionHandlers: vi.fn(),
    initCrashReporter: vi.fn(),
  };
});

vi.mock("electron", () => ({
  BrowserWindow: Object.assign(mocks.BrowserWindow, {
    getAllWindows: mocks.getAllWindows,
    fromWebContents: mocks.fromWebContents,
  }),
  app: mocks.app,
  ipcMain: { handle: vi.fn() },
  dialog: { showOpenDialog: vi.fn(async () => ({ canceled: true, filePaths: [] })) },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => false),
    encryptString: vi.fn((value: string) => Buffer.from(value, "utf8")),
    decryptString: vi.fn((value: Buffer) => value.toString("utf8")),
  },
}));

vi.mock("../../browserWindowSecurity", () => ({
  applyBrowserWindowSecurityPolicy: mocks.applyBrowserWindowSecurityPolicy,
}));
vi.mock("../../db/init", () => ({
  initDb: mocks.initDb,
}));
vi.mock("../../globalExceptionHandlers", () => ({
  registerGlobalExceptionHandlers: mocks.registerGlobalExceptionHandlers,
}));
vi.mock("../../ipc/ai", () => ({ registerAiIpcHandlers: mocks.registerAiIpcHandlers }));
vi.mock("../../ipc/project", () => ({ registerProjectIpcHandlers: mocks.registerProjectIpcHandlers }));
vi.mock("../../ipc/settings", () => ({ registerSettingsIpcHandlers: mocks.registerSettingsIpcHandlers }));

vi.mock("../../ipc/aiProxy", () => ({ registerAiProxyIpcHandlers: vi.fn() }));
vi.mock("../../ipc/context", () => ({ registerContextIpcHandlers: vi.fn() }));
vi.mock("../../ipc/constraints", () => ({ registerConstraintsIpcHandlers: vi.fn() }));
vi.mock("../../ipc/dialog", () => ({ registerDialogIpcHandlers: vi.fn() }));
vi.mock("../../ipc/file", () => ({ registerFileIpcHandlers: vi.fn() }));
vi.mock("../../ipc/export", () => ({ registerExportIpcHandlers: vi.fn() }));
vi.mock("../../ipc/backup", () => ({ registerBackupIpcHandlers: vi.fn() }));
vi.mock("../../ipc/judge", () => ({ registerJudgeIpcHandlers: vi.fn() }));
vi.mock("../../ipc/knowledgeGraph", () => ({ registerKnowledgeGraphIpcHandlers: vi.fn() }));
vi.mock("../../ipc/embedding", () => ({ registerEmbeddingIpcHandlers: vi.fn() }));
vi.mock("../../ipc/memory", () => ({ registerMemoryIpcHandlers: vi.fn() }));
vi.mock("../../ipc/rag", () => ({ registerRagIpcHandlers: vi.fn() }));
vi.mock("../../ipc/search", () => ({ registerSearchIpcHandlers: vi.fn() }));
vi.mock("../../ipc/skills", () => ({ registerSkillIpcHandlers: vi.fn() }));
vi.mock("../../ipc/stats", () => ({ registerStatsIpcHandlers: vi.fn() }));
vi.mock("../../ipc/debugChannelGate", () => ({ registerDbDebugIpcHandlers: vi.fn() }));
vi.mock("../../ipc/version", () => ({ registerVersionIpcHandlers: vi.fn() }));
vi.mock("../../ipc/cost", () => ({ registerCostIpcHandlers: vi.fn() }));
vi.mock("../../ipc/diff", () => ({ registerDiffIpcHandlers: vi.fn() }));
vi.mock("../../ipc/window", () => ({ registerWindowIpcHandlers: vi.fn() }));
vi.mock("../../ipc/rendererLog", () => ({ registerRendererLogIpcHandlers: vi.fn() }));
vi.mock("../../ipc/simpleMemory", () => ({ registerSimpleMemoryIpcHandlers: vi.fn() }));
vi.mock("../../ipc/sessionMemory", () => ({ registerSessionMemoryIpcHandlers: vi.fn() }));
vi.mock("../../ipc/projectSessionBinding", () => ({
  createProjectSessionBindingRegistry: vi.fn(() => ({ clear: vi.fn() })),
}));
vi.mock("../../ipc/runtime-validation", () => ({
  createValidatedIpcMain: vi.fn(() => ({ handle: vi.fn() })),
}));

vi.mock("../../logging/logger", () => ({
  createMainLogger: mocks.createMainLogger,
}));

vi.mock("../../services/embedding/embeddingService", () => ({ createEmbeddingService: vi.fn(() => ({})) }));
vi.mock("../../services/embedding/onnxRuntime", () => ({ createOnnxEmbeddingRuntime: vi.fn(() => ({})) }));
vi.mock("../../services/embedding/semanticChunkIndexService", () => ({
  createSemanticChunkIndexService: vi.fn(() => ({})),
}));
vi.mock("../../services/judge/judgeService", () => ({ createJudgeService: vi.fn(() => ({})) }));
vi.mock("../../services/ai/judgeQualityService", () => ({ createJudgeQualityService: vi.fn(() => ({})) }));
vi.mock("../../services/ai/judgeAdvancedRunner", () => ({ createAdvancedCheckRunner: vi.fn(() => vi.fn()) }));
vi.mock("../../services/ai/aiProxySettingsService", () => ({
  createAiProxySettingsService: vi.fn(() => ({ getRaw: vi.fn(() => ({ ok: false })) })),
}));
vi.mock("../../services/kg/kgRecognitionRuntime", () => ({ createKgRecognitionRuntime: vi.fn(() => ({})) }));
vi.mock("../../services/kg/stateExtractor", () => ({ createStateExtractor: vi.fn(() => ({})) }));
vi.mock("../../services/ai/costTracker", () => ({ createCostTracker: vi.fn(() => ({})) }));
vi.mock("../../services/context/tokenEstimation", () => ({ estimateTokens: vi.fn(() => 0) }));
vi.mock("../../services/context/projectScopedCache", () => ({
  createContextProjectScopedCache: vi.fn(() => ({ bindProject: vi.fn(), unbindProject: vi.fn() })),
}));
vi.mock("../../services/context/watchService", () => ({ createCreonowWatchService: vi.fn(() => ({})) }));
vi.mock("../../services/projects/projectLifecycle", () => ({
  createProjectLifecycle: vi.fn(() => ({ register: vi.fn() })),
}));
vi.mock("../../services/project/contextRebinder", () => ({
  createProjectContextRebinder: mocks.createProjectContextRebinder,
}));
vi.mock("../../services/memory/episodicMemoryService", () => ({
  createEpisodicMemoryService: mocks.createEpisodicMemoryService,
  createSqliteEpisodeRepository: mocks.createSqliteEpisodeRepository,
}));
vi.mock("../../services/kg/trieCache", () => ({
  trieCacheInvalidate: vi.fn(),
}));
vi.mock("../../services/utilityprocess/utilityProcessFoundation", () => ({
  createUtilityProcessFoundation: vi.fn(() => ({
    compute: { getRole: vi.fn(() => "compute") },
    data: { getRole: vi.fn(() => "data") },
  })),
}));
vi.mock("../../services/shared/eventBus", () => ({ createMainEventBus: vi.fn(() => ({})) }));
vi.mock("../../runtimePathResolver", () => ({
  resolvePreloadEntryPathFromBuildConfig: mocks.resolvePreloadEntryPathFromBuildConfig,
}));
vi.mock("../../config/runtimeGovernance", () => ({
  resolveRuntimeGovernanceFromEnv: vi.fn(() => ({ embedding: { queueDebounceMs: 100 } })),
}));
vi.mock("../../windowState", () => ({
  WINDOW_STATE_DEFAULTS: { width: 1280, height: 800 },
  createDebouncedSaveWindowState: mocks.createDebouncedSaveWindowState,
  loadWindowState: mocks.loadWindowState,
}));
vi.mock("../../crashReporterSetup", () => ({ initCrashReporter: mocks.initCrashReporter }));

describe("index.ts app/window/ipc 初始化", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.windows.length = 0;
    mocks.browserWindowOptions.length = 0;
    mocks.appHandlers.clear();
    mocks.whenReady = mocks.resetWhenReady();
    delete process.env.VITE_DEV_SERVER_URL;
    delete process.env.CREONOW_E2E;
  });

  it("createMainWindow 以安全 webPreferences 创建窗口并持久化尺寸", async () => {
    const mod = await import("../../index");

    const logger = { info: vi.fn(), error: vi.fn(), logPath: "<test>" };
    const windowInstance = mod.createMainWindow(logger as never) as unknown as MockWindow;

    expect(mocks.browserWindowOptions[0]).toEqual(expect.objectContaining({
        minWidth: 1024,
        minHeight: 640,
        webPreferences: expect.objectContaining({
          preload: "/preload.js",
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        }),
      }));
    expect(mocks.applyBrowserWindowSecurityPolicy).toHaveBeenCalledTimes(1);

    windowInstance.trigger("move");
    windowInstance.trigger("close");

    const saveStore = mocks.createDebouncedSaveWindowState.mock.results[0]?.value;
    expect(saveStore?.save).toHaveBeenCalledWith({ x: 10, y: 20, width: 1280, height: 720 });
    expect(saveStore?.flush).toHaveBeenCalledTimes(1);
  });

  it("whenReady 后会初始化 DB 并注册关键 IPC handlers", async () => {
    await import("../../index");

    mocks.whenReady.resolve();
    await mocks.whenReady.promise;
    await Promise.resolve();

    expect(mocks.initDb).toHaveBeenCalledTimes(1);
    expect(mocks.registerAiIpcHandlers).toHaveBeenCalledTimes(1);
    expect(mocks.registerProjectIpcHandlers).toHaveBeenCalledTimes(1);
    expect(mocks.registerSettingsIpcHandlers).toHaveBeenCalledTimes(1);
    expect(mocks.createProjectContextRebinder).toHaveBeenCalledTimes(1);
    expect(mocks.createProjectContextRebinder).toHaveBeenCalledWith(
      expect.objectContaining({
        episodicMemoryCache: expect.objectContaining({
          evictProjectCache: expect.any(Function),
        }),
      }),
    );
  });

  it("second-instance 事件会恢复并聚焦已有窗口", async () => {
    await import("../../index");
    const existing = {
      isMinimized: vi.fn(() => true),
      restore: vi.fn(),
      focus: vi.fn(),
    };
    mocks.getAllWindows.mockReturnValueOnce([existing as unknown as MockWindow]);

    mocks.appHandlers.get("second-instance")?.();

    expect(existing.restore).toHaveBeenCalledTimes(1);
    expect(existing.focus).toHaveBeenCalledTimes(1);
  });

  it("window-all-closed 在非 darwin 平台触发退出", async () => {
    await import("../../index");

    mocks.appHandlers.get("window-all-closed")?.();

    expect(mocks.app.quit).toHaveBeenCalled();
  });
});
