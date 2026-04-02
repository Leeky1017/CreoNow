import { describe, expect, it, vi } from "vitest";
import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

const executeSpy = vi.fn(async () => ({
  ok: true as const,
  data: {
    executionId: "exec-1",
    runId: "run-1",
    outputText: "rewritten",
  },
}));

vi.mock("../../services/skills/skillExecutor", () => ({
  createSkillExecutor: vi.fn(() => ({
    execute: executeSpy,
  })),
}));

vi.mock("../../services/ai/aiService", () => ({
  createAiService: vi.fn(() => ({
    runSkill: vi.fn(),
    listModels: vi.fn(async () => ({ ok: true, data: { source: "openai", items: [] } })),
    cancel: vi.fn(() => ({ ok: true, data: { canceled: true } })),
    feedback: vi.fn(() => ({ ok: true, data: { recorded: true } })),
  })),
}));

vi.mock("../../services/ai/traceStore", () => ({
  createSqliteTraceStore: vi.fn(() => ({})),
}));

vi.mock("../../services/memory/memoryService", () => ({
  createMemoryService: vi.fn(() => ({})),
}));

vi.mock("../../services/memory/episodicMemoryService", () => ({
  createEpisodicMemoryService: vi.fn(() => ({})),
  createSqliteEpisodeRepository: vi.fn(() => ({})),
}));

vi.mock("../../services/context/layerAssemblyService", () => ({
  createContextLayerAssemblyService: vi.fn(() => ({
    assemble: vi.fn(async () => ({ ok: true, data: { prompt: "" } })),
  })),
}));

vi.mock("../../services/kg/kgService", () => ({
  createKnowledgeGraphService: vi.fn(() => ({})),
}));

vi.mock("../../services/stats/statsService", () => ({
  createStatsService: vi.fn(() => ({
    increment: vi.fn(() => ({ ok: true, data: undefined })),
  })),
}));

import { registerAiIpcHandlers } from "../ai";

type Handler = (event: { sender: { id: number; send: (channel: string, payload: unknown) => void } }, payload: unknown) => Promise<unknown>;

function createLogger() {
  return {
    logPath: "<test>",
    info: () => undefined,
    error: () => undefined,
  };
}

describe("ai:skill:run selection contract", () => {
  it("forwards full SelectionRef into the main-process execution seam", async () => {
    const handlers = new Map<string, Handler>();
    const ipcMain = {
      handle: (channel: string, listener: Handler) => {
        handlers.set(channel, listener);
      },
    } as unknown as IpcMain;

    registerAiIpcHandlers({
      ipcMain,
      db: {} as Database.Database,
      userDataDir: "<test-user-data>",
      builtinSkillsDir: "<test-skills>",
      logger: createLogger(),
      env: process.env,
    });

    const handler = handlers.get("ai:skill:run");
    expect(handler).toBeDefined();

    const selection = {
      from: 4,
      to: 9,
      text: "原文片段",
      selectionTextHash: "abc123hash",
    };

    const result = await handler!(
      {
        sender: {
          id: 7,
          send: () => undefined,
        },
      },
      {
        skillId: "builtin:rewrite",
        hasSelection: true,
        selection,
        input: "Selection context:\n原文片段\n\n润色",
        mode: "ask",
        model: "gpt-4.1-mini",
        stream: false,
        context: {
          projectId: "project-1",
          documentId: "doc-1",
        },
      },
    ) as {
      ok: boolean;
      data?: {
        executionId: string;
        runId: string;
        outputText?: string;
      };
    };

    expect(result).toMatchObject({
      ok: true,
      data: {
        executionId: "exec-1",
        runId: "run-1",
        outputText: "rewritten",
      },
    });
    expect(executeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        hasSelection: true,
        selection,
      }),
    );
  });
});
