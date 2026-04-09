import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalDevServerUrl = process.env.VITE_DEV_SERVER_URL;

type WindowLoadHarness = {
  createMainWindow: (logger: {
    logPath: string;
    info: (event: string, data?: Record<string, unknown>) => void;
    error: (event: string, data?: Record<string, unknown>) => void;
  }) => unknown;
  loadURLMock: ReturnType<typeof vi.fn>;
  loadFileMock: ReturnType<typeof vi.fn>;
};

async function loadWindowLoadHarness(): Promise<WindowLoadHarness> {
  vi.resetModules();

  const loadURLMock = vi.fn(async () => undefined);
  const loadFileMock = vi.fn(async () => undefined);

  vi.doMock("../../../main/src/runtimePathResolver", () => ({
    resolvePreloadEntryPathFromBuildConfig: vi.fn(() => "/tmp/mock-preload.cjs"),
  }));

  vi.doMock("../../../main/src/windowState", () => ({
    loadWindowState: vi.fn(() => null),
    createDebouncedSaveWindowState: vi.fn(() => ({
      save: vi.fn(),
      flush: vi.fn(),
      cancel: vi.fn(),
    })),
    WINDOW_STATE_DEFAULTS: { x: 0, y: 0, width: 1280, height: 800 },
  }));

  vi.doMock("electron", () => {
    class BrowserWindowMock {
      static getAllWindows = vi.fn(() => []);

      loadURL = loadURLMock;
      loadFile = loadFileMock;
      isMaximized = vi.fn(() => false);
      isFullScreen = vi.fn(() => false);
      isMinimized = vi.fn(() => false);
      getBounds = vi.fn(() => ({ x: 0, y: 0, width: 1280, height: 800 }));
      on = vi.fn();
      restore = vi.fn();
      focus = vi.fn();
    }

    return {
      BrowserWindow: BrowserWindowMock,
      app: {
        whenReady: vi.fn(() => new Promise<void>(() => {})),
        on: vi.fn(),
        quit: vi.fn(),
        setPath: vi.fn(),
        getPath: vi.fn(() => "/tmp/creonow-test-user-data"),
        getVersion: vi.fn(() => "0.0.0-test"),
        requestSingleInstanceLock: vi.fn(() => true),
      },
      ipcMain: {},
      crashReporter: {
        start: vi.fn(),
      },
      safeStorage: {
        isEncryptionAvailable: vi.fn(() => false),
        encryptString: vi.fn(),
        decryptString: vi.fn(),
      },
    };
  });

  const mod = await import("../../../main/src/index");
  return {
    createMainWindow: (
      mod as unknown as {
        createMainWindow: WindowLoadHarness["createMainWindow"];
      }
    ).createMainWindow,
    loadURLMock,
    loadFileMock,
  };
}

function createLoggerMock() {
  return {
    logPath: "/tmp/main.log",
    info: vi.fn(),
    error: vi.fn(),
  };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  if (originalDevServerUrl === undefined) {
    delete process.env.VITE_DEV_SERVER_URL;
  } else {
    process.env.VITE_DEV_SERVER_URL = originalDevServerUrl;
  }
});

describe("createMainWindow load catch", () => {
  it("logs window_load_failed when loadURL rejects", async () => {
    process.env.VITE_DEV_SERVER_URL = "http://127.0.0.1:5173";
    const harness = await loadWindowLoadHarness();
    harness.loadURLMock.mockRejectedValueOnce(new Error("dev server unreachable"));

    const logger = createLoggerMock();
    harness.createMainWindow(logger);
    await flushMicrotasks();

    expect(logger.error).toHaveBeenCalledWith(
      "window_load_failed",
      expect.objectContaining({
        target: "http://127.0.0.1:5173",
        message: "dev server unreachable",
      }),
    );
  });

  it("logs window_load_failed when loadFile rejects", async () => {
    delete process.env.VITE_DEV_SERVER_URL;
    const harness = await loadWindowLoadHarness();
    harness.loadFileMock.mockRejectedValueOnce(new Error("index file missing"));

    const logger = createLoggerMock();
    harness.createMainWindow(logger);
    await flushMicrotasks();

    expect(logger.error).toHaveBeenCalledWith(
      "window_load_failed",
      expect.objectContaining({
        message: "index file missing",
      }),
    );
  });

  it("does not log window_load_failed when load succeeds", async () => {
    process.env.VITE_DEV_SERVER_URL = "http://127.0.0.1:5173";
    const harness = await loadWindowLoadHarness();
    harness.loadURLMock.mockResolvedValueOnce(undefined);

    const logger = createLoggerMock();
    harness.createMainWindow(logger);
    await flushMicrotasks();

    expect(
      logger.error.mock.calls.some(
        (call) => Array.isArray(call) && call[0] === "window_load_failed",
      ),
    ).toBe(false);
  });
});
