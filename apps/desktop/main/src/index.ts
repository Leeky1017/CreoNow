import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { BrowserWindow, app, ipcMain } from "electron";

import type { IpcResponse } from "../../../../packages/shared/types/ipc-generated";
import { initDb, type DbInitOk } from "./db/init";
import { registerAiIpcHandlers } from "./ipc/ai";
import { registerAiProxyIpcHandlers } from "./ipc/aiProxy";
import { registerContextIpcHandlers } from "./ipc/context";
import { registerConstraintsIpcHandlers } from "./ipc/constraints";
import { registerFileIpcHandlers } from "./ipc/file";
import { registerExportIpcHandlers } from "./ipc/export";
import { registerJudgeIpcHandlers } from "./ipc/judge";
import { registerKnowledgeGraphIpcHandlers } from "./ipc/knowledgeGraph";
import { registerEmbeddingIpcHandlers } from "./ipc/embedding";
import { registerMemoryIpcHandlers } from "./ipc/memory";
import { registerProjectIpcHandlers } from "./ipc/project";
import { registerRagIpcHandlers } from "./ipc/rag";
import { registerSearchIpcHandlers } from "./ipc/search";
import { registerSkillIpcHandlers } from "./ipc/skills";
import { registerStatsIpcHandlers } from "./ipc/stats";
import { registerVersionIpcHandlers } from "./ipc/version";
import { createMainLogger, type Logger } from "./logging/logger";
import { createJudgeService } from "./services/judge/judgeService";
import { createCreonowWatchService } from "./services/context/watchService";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Allow E2E to isolate `userData` to a temp directory.
 *
 * Why: Windows E2E must be repeatable and must not touch a developer's real profile.
 */
function enableE2EUserDataIsolation(): void {
  const userDataDir = process.env.CREONOW_USER_DATA_DIR;
  if (typeof userDataDir !== "string" || userDataDir.length === 0) {
    return;
  }

  // Must be set before app 'ready' for full isolation.
  app.setPath("userData", userDataDir);
}

/**
 * Resolve the preload entry path across build output formats.
 *
 * Why: electron-vite may emit different extensions depending on config/environment.
 */
function resolvePreloadPath(): string {
  const dir = path.join(__dirname, "../preload");
  const candidates = ["index.cjs", "index.js", "index.mjs"];
  for (const fileName of candidates) {
    const p = path.join(dir, fileName);
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return path.join(dir, "index.cjs");
}

/**
 * Resolve builtin skills directory across dev + build outputs.
 *
 * Why: electron-builder packages only `dist/**`, but dev runs from `main/src`.
 */
function resolveBuiltinSkillsDir(mainDir: string): string {
  const candidates = [
    path.join(mainDir, "skills"), // build: dist/main/skills
    path.join(mainDir, "../skills"), // dev: main/skills
  ];
  for (const p of candidates) {
    try {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        return p;
      }
    } catch {
      // Ignore.
    }
  }
  return candidates[0];
}

/**
 * Create the app's main BrowserWindow.
 *
 * Why: keep a single place for window defaults used by E2E and later features.
 */
function createMainWindow(): BrowserWindow {
  const preload = resolvePreloadPath();
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  return win;
}

/**
 * Register all IPC handlers.
 *
 * Why: dependencies are explicit (no implicit injection) and handlers must always
 * return an Envelope `{ ok: true|false }` without leaking exceptions across IPC.
 */
function registerIpcHandlers(deps: {
  db: DbInitOk["db"] | null;
  logger: Logger;
  userDataDir: string;
  builtinSkillsDir: string;
  env: NodeJS.ProcessEnv;
}): void {
  const judgeService = createJudgeService({
    logger: deps.logger,
    isE2E: process.env.CREONOW_E2E === "1",
  });
  const watchService = createCreonowWatchService({ logger: deps.logger });

  ipcMain.handle(
    "app:ping",
    async (): Promise<IpcResponse<Record<string, never>>> => {
      try {
        return { ok: true, data: {} };
      } catch {
        return {
          ok: false,
          error: { code: "INTERNAL", message: "Ping failed" },
        };
      }
    },
  );

  ipcMain.handle(
    "db:debug:tableNames",
    async (): Promise<IpcResponse<{ tableNames: string[] }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      try {
        const rows = deps.db
          .prepare<
            [],
            { name: string }
          >("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
          .all();
        const tableNames = rows.map((r) => r.name).sort();
        return { ok: true, data: { tableNames } };
      } catch (error) {
        deps.logger.error("db_list_tables_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Failed to list tables" },
        };
      }
    },
  );

  registerAiIpcHandlers({
    ipcMain,
    db: deps.db,
    userDataDir: deps.userDataDir,
    builtinSkillsDir: deps.builtinSkillsDir,
    logger: deps.logger,
    env: deps.env,
  });

  registerAiProxyIpcHandlers({
    ipcMain,
    db: deps.db,
    logger: deps.logger,
  });

  registerProjectIpcHandlers({
    ipcMain,
    db: deps.db,
    userDataDir: deps.userDataDir,
    logger: deps.logger,
  });

  registerContextIpcHandlers({
    ipcMain,
    db: deps.db,
    logger: deps.logger,
    userDataDir: deps.userDataDir,
    watchService,
  });

  registerConstraintsIpcHandlers({
    ipcMain,
    db: deps.db,
    logger: deps.logger,
  });

  registerJudgeIpcHandlers({
    ipcMain,
    judgeService,
  });

  registerFileIpcHandlers({
    ipcMain,
    db: deps.db,
    logger: deps.logger,
  });

  registerExportIpcHandlers({
    ipcMain,
    db: deps.db,
    logger: deps.logger,
    userDataDir: deps.userDataDir,
  });

  registerStatsIpcHandlers({
    ipcMain,
    db: deps.db,
    logger: deps.logger,
  });

  registerEmbeddingIpcHandlers({
    ipcMain,
    db: deps.db,
    logger: deps.logger,
  });

  registerSearchIpcHandlers({
    ipcMain,
    db: deps.db,
    logger: deps.logger,
  });

  registerRagIpcHandlers({
    ipcMain,
    db: deps.db,
    logger: deps.logger,
  });

  registerSkillIpcHandlers({
    ipcMain,
    db: deps.db,
    userDataDir: deps.userDataDir,
    builtinSkillsDir: deps.builtinSkillsDir,
    logger: deps.logger,
  });

  registerMemoryIpcHandlers({
    ipcMain,
    db: deps.db,
    logger: deps.logger,
  });

  registerKnowledgeGraphIpcHandlers({
    ipcMain,
    db: deps.db,
    logger: deps.logger,
  });

  registerVersionIpcHandlers({
    ipcMain,
    db: deps.db,
    logger: deps.logger,
  });
}

enableE2EUserDataIsolation();

void app.whenReady().then(() => {
  const userDataDir = app.getPath("userData");
  const logger = createMainLogger(userDataDir);
  logger.info("app_ready", { user_data_dir: "<userData>" });

  const dbRes = initDb({ userDataDir, logger });
  const db: DbInitOk["db"] | null = dbRes.ok ? dbRes.db : null;
  if (!dbRes.ok) {
    logger.error("db_init_failed", { code: dbRes.error.code });
  }

  registerIpcHandlers({
    db,
    logger,
    userDataDir,
    builtinSkillsDir: resolveBuiltinSkillsDir(__dirname),
    env: process.env,
  });

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  app.on("before-quit", () => {
    if (!db) {
      return;
    }
    try {
      db.close();
    } catch (error) {
      logger.error("db_close_failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
