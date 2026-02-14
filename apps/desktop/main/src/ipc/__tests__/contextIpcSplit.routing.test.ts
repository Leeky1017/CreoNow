import assert from "node:assert/strict";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

import type { Logger } from "../../logging/logger";
import type { ContextLayerAssemblyService } from "../../services/context/layerAssemblyService";
import type { CreonowWatchService } from "../../services/context/watchService";
import { registerContextAssemblyHandlers } from "../contextAssembly";
import { registerContextBudgetHandlers } from "../contextBudget";
import { registerContextFsHandlers } from "../contextFs";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function createWatchService(): CreonowWatchService {
  return {
    start: () => ({ ok: true, data: { watching: true } }),
    stop: () => ({ ok: true, data: { watching: false } }),
    isWatching: () => false,
  };
}

function createContextAssemblyService(): ContextLayerAssemblyService {
  return {
    getBudgetProfile: () => ({
      version: 1,
      tokenizerId: "test-tokenizer",
      tokenizerVersion: "1",
      maxPromptTokens: 2048,
      reserveResponseTokens: 512,
      perLayerCaps: {
        rules: 0.25,
        retrieved: 0.25,
        memory: 0.25,
        settings: 0.25,
      },
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
    updateBudgetProfile: () => ({
      ok: false,
      error: { code: "NOT_IMPLEMENTED", message: "not used in this test" },
    }),
    assemble: async () => {
      throw new Error("not used in this test");
    },
    inspect: async () => {
      throw new Error("not used in this test");
    },
  } as unknown as ContextLayerAssemblyService;
}

function createDeps(handlers: Map<string, Handler>): {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  userDataDir: string;
  watchService: CreonowWatchService;
  contextAssemblyService: ContextLayerAssemblyService;
  inFlightByDocument: Map<string, number>;
} {
  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  return {
    ipcMain,
    db: null,
    logger: createLogger(),
    userDataDir: "<test-user-data>",
    watchService: createWatchService(),
    contextAssemblyService: createContextAssemblyService(),
    inFlightByDocument: new Map<string, number>(),
  };
}

function assertChannels(
  handlers: Map<string, Handler>,
  expected: string[],
  scenarioId: string,
): void {
  const actual = [...handlers.keys()].sort();
  const sortedExpected = [...expected].sort();
  assert.deepEqual(
    actual,
    sortedExpected,
    `${scenarioId}: channel registration mismatch`,
  );
}

// SCIS-S1: context channels are registered by prefix groups.
const assemblyHandlers = new Map<string, Handler>();
registerContextAssemblyHandlers(createDeps(assemblyHandlers));
assertChannels(
  assemblyHandlers,
  ["context:prompt:assemble", "context:prompt:inspect"],
  "SCIS-S1/assembly+inspect",
);

const budgetHandlers = new Map<string, Handler>();
registerContextBudgetHandlers(createDeps(budgetHandlers));
assertChannels(
  budgetHandlers,
  ["context:budget:get", "context:budget:update"],
  "SCIS-S1/budget",
);

const fsHandlers = new Map<string, Handler>();
registerContextFsHandlers(createDeps(fsHandlers));
assertChannels(
  fsHandlers,
  [
    "context:creonow:ensure",
    "context:creonow:status",
    "context:rules:list",
    "context:rules:read",
    "context:settings:list",
    "context:settings:read",
    "context:watch:start",
    "context:watch:stop",
  ],
  "SCIS-S1/fs",
);
