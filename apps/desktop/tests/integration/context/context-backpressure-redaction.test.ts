import assert from "node:assert/strict";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerContextIpcHandlers } from "../../../main/src/ipc/context";
import type {
  ContextAssembleRequest,
  ContextAssembleResult,
  ContextBudgetProfile,
  ContextBudgetUpdateRequest,
  ContextBudgetUpdateResult,
  ContextInspectRequest,
  ContextInspectResult,
  ContextLayerAssemblyService,
} from "../../../main/src/services/context/layerAssemblyService";
import type { Logger } from "../../../main/src/logging/logger";
import type { CreonowWatchService } from "../../../main/src/services/context/watchService";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

// Scenario Mapping: CE5-R3-S2
{
  // Arrange
  const handlers = new Map<string, Handler>();
  const logs: Array<{ event: string; data?: Record<string, unknown> }> = [];

  const ipcMain: FakeIpcMain = {
    handle: (channel, handler) => {
      handlers.set(channel, handler);
    },
  };

  const logger: Logger = {
    logPath: "<test>",
    info: (event, data) => {
      logs.push({ event, data });
    },
    error: (event, data) => {
      logs.push({ event, data });
    },
  };

  const db = {
    prepare: () => ({
      get: () => ({ rootPath: "/tmp/project" }),
    }),
  } as unknown as Database.Database;

  const watchService: CreonowWatchService = {
    start: (_args) => ({ ok: true, data: { watching: true } }),
    stop: (_args) => ({ ok: true, data: { watching: false } }),
    isWatching: (_args) => false,
  };

  const release = createDeferred<void>();

  const profile: ContextBudgetProfile = {
    version: 1,
    tokenizerId: "cn-byte-estimator",
    tokenizerVersion: "1.0.0",
    totalBudgetTokens: 6000,
    layers: {
      rules: { ratio: 0.15, minimumTokens: 500 },
      settings: { ratio: 0.1, minimumTokens: 200 },
      retrieved: { ratio: 0.25, minimumTokens: 0 },
      immediate: { ratio: 0.5, minimumTokens: 2000 },
    },
  };

  const stubService: ContextLayerAssemblyService = {
    assemble: async (
      _request: ContextAssembleRequest,
    ): Promise<ContextAssembleResult> => {
      await release.promise;
      return {
        prompt: "ok",
        tokenCount: 12,
        stablePrefixHash: "hash",
        stablePrefixUnchanged: false,
        warnings: [],
        assemblyOrder: ["rules", "settings", "retrieved", "immediate"],
        layers: {
          rules: { source: ["kg:entities"], tokenCount: 3, truncated: false },
          settings: { source: [], tokenCount: 0, truncated: false },
          retrieved: { source: [], tokenCount: 0, truncated: false },
          immediate: {
            source: ["editor:cursor-window"],
            tokenCount: 9,
            truncated: false,
          },
        },
      };
    },
    inspect: async (
      _request: ContextInspectRequest,
    ): Promise<ContextInspectResult> => ({
      layersDetail: {
        rules: {
          content: "",
          source: [],
          tokenCount: 0,
          truncated: false,
        },
        settings: {
          content: "",
          source: [],
          tokenCount: 0,
          truncated: false,
        },
        retrieved: {
          content: "",
          source: [],
          tokenCount: 0,
          truncated: false,
        },
        immediate: {
          content: "",
          source: [],
          tokenCount: 0,
          truncated: false,
        },
      },
      totals: {
        tokenCount: 0,
        warningsCount: 0,
      },
      inspectMeta: {
        debugMode: false,
        requestedBy: "integration-test",
        requestedAt: Date.now(),
      },
    }),
    getBudgetProfile: (): ContextBudgetProfile => profile,
    updateBudgetProfile: (
      _request: ContextBudgetUpdateRequest,
    ): ContextBudgetUpdateResult => ({ ok: true, data: profile }),
  };

  registerContextIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db,
    logger,
    userDataDir: "/tmp",
    watchService,
    contextAssemblyService: stubService,
  });

  const assembleHandler = handlers.get("context:prompt:assemble");
  assert.ok(assembleHandler, "Missing handler context:prompt:assemble");
  if (!assembleHandler) {
    throw new Error("Missing handler context:prompt:assemble");
  }

  const payload = {
    projectId: "project-1",
    documentId: "document-1",
    cursorPosition: 88,
    skillId: "continue-writing",
    additionalInput: "SECRET-RAW-PROMPT-FOR-BACKPRESSURE",
  };

  // Act
  const inFlight = [
    assembleHandler({}, payload),
    assembleHandler({}, payload),
    assembleHandler({}, payload),
    assembleHandler({}, payload),
  ] as Array<Promise<IpcResponse<ContextAssembleResult>>>;

  const fifthPromise = assembleHandler({}, payload) as Promise<
    IpcResponse<ContextAssembleResult>
  >;

  release.resolve();

  const fifth = await fifthPromise;
  const settled = await Promise.all(inFlight);

  // Assert
  assert.equal(fifth.ok, false);
  if (!fifth.ok) {
    assert.equal(fifth.error.code, "CONTEXT_BACKPRESSURE");
  }

  for (const response of settled) {
    assert.equal(response.ok, true);
  }

  const backpressureLog = logs.find(
    (entry) => entry.event === "context_backpressure",
  );
  assert.ok(backpressureLog, "Missing context_backpressure log entry");
  assert.equal(
    JSON.stringify(backpressureLog?.data ?? {}).includes(
      payload.additionalInput,
    ),
    false,
  );
}
