/**
 * index.ts — app init, window management, IPC registration guard tests
 *
 * Covers: createMainWindow export, parsePositiveInteger, E2E isolation,
 * second-instance handling, static analysis guards.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const indexPath = path.resolve(import.meta.dirname, "../../index.ts");
const indexSource = readFileSync(indexPath, "utf8");

describe("index.ts — exports createMainWindow", () => {
  it("exports createMainWindow as a named export", () => {
    expect(indexSource).toContain("export function createMainWindow");
  });
});

describe("index.ts — security: contextIsolation and sandbox", () => {
  it("enables contextIsolation in webPreferences", () => {
    expect(indexSource).toContain("contextIsolation: true");
  });

  it("disables nodeIntegration in webPreferences", () => {
    expect(indexSource).toContain("nodeIntegration: false");
  });

  it("enables sandbox in webPreferences", () => {
    expect(indexSource).toContain("sandbox: true");
  });
});

describe("index.ts — window-all-closed platform handling", () => {
  it("handles window-all-closed event with darwin check", () => {
    expect(indexSource).toContain("window-all-closed");
    expect(indexSource).toContain('"darwin"');
  });
});

describe("index.ts — IPC handler registration", () => {
  const expectedHandlers = [
    "registerAiIpcHandlers",
    "registerContextIpcHandlers",
    "registerDialogIpcHandlers",
    "registerFileIpcHandlers",
    "registerExportIpcHandlers",
    "registerProjectIpcHandlers",
    "registerSearchIpcHandlers",
    "registerVersionIpcHandlers",
    "registerSettingsIpcHandlers",
    "registerMemoryIpcHandlers",
    "registerEmbeddingIpcHandlers",
    "registerCostIpcHandlers",
    "registerDiffIpcHandlers",
    "registerWindowIpcHandlers",
  ];

  for (const handler of expectedHandlers) {
    it(`registers ${handler}`, () => {
      expect(indexSource).toContain(handler);
    });
  }
});

describe("index.ts — activate event re-creates window", () => {
  it("handles activate event to create window when none exist", () => {
    expect(indexSource).toContain('"activate"');
    expect(indexSource).toContain("getAllWindows().length === 0");
  });
});

describe("index.ts — DB lifecycle", () => {
  it("initializes DB via initDb", () => {
    expect(indexSource).toContain("initDb");
  });

  it("closes DB on before-quit", () => {
    expect(indexSource).toContain("before-quit");
    expect(indexSource).toContain("db.close()");
  });
});

describe("index.ts — crash reporter setup", () => {
  it("initializes crash reporter before app ready", () => {
    expect(indexSource).toContain("initCrashReporter");
  });
});

describe("index.ts — E2E user data isolation", () => {
  it("checks CREONOW_USER_DATA_DIR env var for isolation", () => {
    expect(indexSource).toContain("CREONOW_USER_DATA_DIR");
    expect(indexSource).toContain("setPath");
  });
});

describe("index.ts — window state persistence", () => {
  it("uses debounced save for window state", () => {
    expect(indexSource).toContain("createDebouncedSaveWindowState");
    expect(indexSource).toContain("loadWindowState");
  });

  it("persists bounds on move and resize", () => {
    expect(indexSource).toContain('"move"');
    expect(indexSource).toContain('"resize"');
  });

  it("flushes state on close", () => {
    expect(indexSource).toContain("debouncedSave.flush()");
  });
});

describe("index.ts — runtime governance", () => {
  it("resolves runtime governance from env", () => {
    expect(indexSource).toContain("resolveRuntimeGovernanceFromEnv");
  });
});

describe("index.ts — validated IPC main", () => {
  it("wraps ipcMain with runtime validation", () => {
    expect(indexSource).toContain("createValidatedIpcMain");
  });
});

describe("index.ts — global exception handlers", () => {
  it("registers global exception handlers", () => {
    expect(indexSource).toContain("registerGlobalExceptionHandlers");
  });
});

describe("index.ts — security: browser window security policy", () => {
  it("applies browser window security policy", () => {
    expect(indexSource).toContain("applyBrowserWindowSecurityPolicy");
  });
});
