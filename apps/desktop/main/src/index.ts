import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { BrowserWindow, app, ipcMain, safeStorage } from "electron";

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
import { createValidatedIpcMain } from "./ipc/runtime-validation";
import { registerVersionIpcHandlers } from "./ipc/version";
import { createMainLogger, type Logger } from "./logging/logger";
import { createEmbeddingService } from "./services/embedding/embeddingService";
import { createSemanticChunkIndexService } from "./services/embedding/semanticChunkIndexService";
import { createJudgeService } from "./services/judge/judgeService";
import { createJudgeQualityService } from "./services/ai/judgeQualityService";
import { createKgRecognitionRuntime } from "./services/kg/kgRecognitionRuntime";
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
export function createMainWindow(logger: Logger): BrowserWindow {
  const preload = resolvePreloadPath();
  const isE2E = process.env.CREONOW_E2E === "1";
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    const devUrl = new URL(process.env.VITE_DEV_SERVER_URL);
    if (isE2E) {
      devUrl.searchParams.set("creonow_e2e", "1");
    }
    const target = devUrl.toString();
    void win.loadURL(target).catch((error) => {
      logger.error("window_load_failed", {
        target,
        message: error instanceof Error ? error.message : String(error),
      });
    });
  } else {
    const target = path.join(__dirname, "../renderer/index.html");
    void win
      .loadFile(target, { query: isE2E ? { creonow_e2e: "1" } : {} })
      .catch((error) => {
        logger.error("window_load_failed", {
          target,
          message: error instanceof Error ? error.message : String(error),
        });
      });
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
  const judgeQualityService = createJudgeQualityService({
    logger: deps.logger,
  });
  const watchService = createCreonowWatchService({ logger: deps.logger });
  const embeddingService = createEmbeddingService({ logger: deps.logger });
  const semanticIndex = createSemanticChunkIndexService({
    logger: deps.logger,
    embedding: embeddingService,
    defaultModel: deps.env.CREONOW_EMBEDDING_MODEL ?? "default",
  });
  const recognitionRuntime = deps.db
    ? createKgRecognitionRuntime({
        db: deps.db,
        logger: deps.logger,
      })
    : null;

  const ragRerank = {
    enabled: deps.env.CREONOW_RAG_RERANK === "1",
    model: deps.env.CREONOW_RAG_RERANK_MODEL,
  };

  const guardedIpcMain = createValidatedIpcMain({
    ipcMain,
    logger: deps.logger,
    defaultTimeoutMs: 30_000,
  });
  const secretStorage = {
    isEncryptionAvailable: () => safeStorage.isEncryptionAvailable(),
    encryptString: (plainText: string) => safeStorage.encryptString(plainText),
    decryptString: (cipherText: Buffer) =>
      safeStorage.decryptString(cipherText),
  };

  guardedIpcMain.handle(
    "app:system:ping",
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

  guardedIpcMain.handle(
    "db:debug:tablenames",
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
    ipcMain: guardedIpcMain,
    db: deps.db,
    userDataDir: deps.userDataDir,
    builtinSkillsDir: deps.builtinSkillsDir,
    logger: deps.logger,
    env: deps.env,
    secretStorage,
  });

  registerAiProxyIpcHandlers({
    ipcMain: guardedIpcMain,
    db: deps.db,
    logger: deps.logger,
    secretStorage,
  });

  registerProjectIpcHandlers({
    ipcMain: guardedIpcMain,
    db: deps.db,
    userDataDir: deps.userDataDir,
    logger: deps.logger,
  });

  registerContextIpcHandlers({
    ipcMain: guardedIpcMain,
    db: deps.db,
    logger: deps.logger,
    userDataDir: deps.userDataDir,
    watchService,
  });

  registerConstraintsIpcHandlers({
    ipcMain: guardedIpcMain,
    db: deps.db,
    logger: deps.logger,
  });

  registerJudgeIpcHandlers({
    ipcMain: guardedIpcMain,
    judgeService,
    judgeQualityService,
    logger: deps.logger,
  });

  registerFileIpcHandlers({
    ipcMain: guardedIpcMain,
    db: deps.db,
    logger: deps.logger,
    recognitionRuntime,
    semanticIndex,
  });

  registerExportIpcHandlers({
    ipcMain: guardedIpcMain,
    db: deps.db,
    logger: deps.logger,
    userDataDir: deps.userDataDir,
  });

  registerStatsIpcHandlers({
    ipcMain: guardedIpcMain,
    db: deps.db,
    logger: deps.logger,
  });

  registerEmbeddingIpcHandlers({
    ipcMain: guardedIpcMain,
    db: deps.db,
    logger: deps.logger,
    embedding: embeddingService,
    semanticIndex,
    defaultModel: deps.env.CREONOW_EMBEDDING_MODEL ?? "default",
  });

  registerSearchIpcHandlers({
    ipcMain: guardedIpcMain,
    db: deps.db,
    logger: deps.logger,
    semanticIndex,
  });

  registerRagIpcHandlers({
    ipcMain: guardedIpcMain,
    db: deps.db,
    logger: deps.logger,
    embedding: embeddingService,
    ragRerank,
    semanticIndex,
    defaultModel: deps.env.CREONOW_EMBEDDING_MODEL ?? "default",
  });

  registerSkillIpcHandlers({
    ipcMain: guardedIpcMain,
    db: deps.db,
    userDataDir: deps.userDataDir,
    builtinSkillsDir: deps.builtinSkillsDir,
    logger: deps.logger,
  });

  registerMemoryIpcHandlers({
    ipcMain: guardedIpcMain,
    db: deps.db,
    logger: deps.logger,
  });

  registerKnowledgeGraphIpcHandlers({
    ipcMain: guardedIpcMain,
    db: deps.db,
    logger: deps.logger,
    recognitionRuntime,
  });

  registerVersionIpcHandlers({
    ipcMain: guardedIpcMain,
    db: deps.db,
    logger: deps.logger,
  });
}

function logAppInitFatal(error: unknown): void {
  const payload =
    error instanceof Error
      ? { error: error.message, stack: error.stack }
      : { error: String(error) };

  try {
    const logger = createMainLogger(app.getPath("userData"));
    logger.error("app_init_fatal", payload);
  } catch {
    // Swallow to ensure startup rejection is fully handled.
  }
}

enableE2EUserDataIsolation();

app
  .whenReady()
  .then(() => {
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

    createMainWindow(logger);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow(logger);
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
  })
  .catch((error) => {
    logAppInitFatal(error);
    app.quit();
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
