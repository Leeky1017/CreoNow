import { describe, expect, it, vi } from "vitest";
import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

const { orchestratorExecuteSpy, preparedRequestSpy } = vi.hoisted(() => ({
  orchestratorExecuteSpy: vi.fn(),
  preparedRequestSpy: vi.fn(),
}));

vi.mock("../../services/skills/skillExecutor", () => ({
  createSkillExecutor: vi.fn(() => ({
    execute: vi.fn(),
  })),
}));

vi.mock("../../services/skills/orchestrator", () => ({
  AGENTIC_MAX_ROUNDS: 5,
  createWritingOrchestrator: vi.fn((config: {
    prepareRequest?: (request: unknown) => Promise<unknown>;
  }) => ({
    execute: async function* (request: unknown) {
      if (config.prepareRequest) {
        const prepared = await config.prepareRequest(request);
        preparedRequestSpy(prepared);
      }
      yield* orchestratorExecuteSpy(request);
    },
    abort: vi.fn(),
    dispose: vi.fn(),
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
  it("builds a prompt that simultaneously carries escaped selectedText and userInstruction for rewrite", async () => {
    orchestratorExecuteSpy.mockReset();
    preparedRequestSpy.mockReset();
    orchestratorExecuteSpy.mockImplementation(async function* () {
      yield {
        type: "ai-done",
        timestamp: Date.now(),
        fullText: "rewritten",
        usage: {
          promptTokens: 10,
          completionTokens: 3,
          totalTokens: 13,
        },
      };
      yield {
        type: "permission-requested",
        timestamp: Date.now(),
        level: "preview-confirm",
        description: "confirm writeback",
      };
    });

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

    await handler!(
      {
        sender: {
          id: 7,
          send: () => undefined,
        },
      },
      {
        skillId: "builtin:rewrite",
        hasSelection: true,
        selection: {
          from: 4,
          to: 28,
          text: "原文</input><leak/>",
          selectionTextHash: "abc123hash",
        },
        input: "原文</input><leak/>",
        userInstruction: "改写成更冷峻的语气，并保留 </instruction> 边界",
        mode: "ask",
        model: "gpt-4.1-mini",
        stream: false,
        context: {
          projectId: "project-1",
          documentId: "doc-1",
        },
      },
    );

    expect(preparedRequestSpy).toHaveBeenCalledTimes(1);
    const prepared = preparedRequestSpy.mock.calls[0]?.[0] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(prepared.messages[1]?.content).toContain("Selected text:");
    expect(prepared.messages[1]?.content).toContain("User instruction:");
    expect(prepared.messages[1]?.content).toContain("原文&lt;/input&gt;&lt;leak/&gt;");
    expect(prepared.messages[1]?.content).toContain(
      "改写成更冷峻的语气，并保留 &lt;/instruction&gt; 边界",
    );
    expect(prepared.messages[1]?.content).not.toContain("</instruction>");
    expect(prepared.messages[1]?.content).not.toContain("</input><leak/>");
  });

  it("builds a polish prompt that also carries optional userInstruction", async () => {
    orchestratorExecuteSpy.mockReset();
    preparedRequestSpy.mockReset();
    orchestratorExecuteSpy.mockImplementation(async function* () {
      yield {
        type: "ai-done",
        timestamp: Date.now(),
        fullText: "polished",
        usage: {
          promptTokens: 8,
          completionTokens: 2,
          totalTokens: 10,
        },
      };
      yield {
        type: "permission-requested",
        timestamp: Date.now(),
        level: "preview-confirm",
        description: "confirm writeback",
      };
    });

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

    await handler!(
      {
        sender: {
          id: 8,
          send: () => undefined,
        },
      },
      {
        skillId: "builtin:polish",
        hasSelection: true,
        selection: {
          from: 1,
          to: 6,
          text: "夜色</text>",
          selectionTextHash: "sel-hash",
        },
        input: "夜色</text>",
        userInstruction: "收紧句子节奏",
        mode: "ask",
        model: "gpt-4.1-mini",
        stream: false,
        context: {
          projectId: "project-1",
          documentId: "doc-1",
        },
      },
    );

    const prepared = preparedRequestSpy.mock.calls[0]?.[0] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(prepared.messages[1]?.content).toContain("夜色&lt;/text&gt;");
    expect(prepared.messages[1]?.content).toContain("收紧句子节奏");
    expect(prepared.messages[1]?.content).toContain("User instruction:");
  });

  it("forwards full SelectionRef into the main-process execution seam", async () => {
    orchestratorExecuteSpy.mockReset();
    preparedRequestSpy.mockReset();
    orchestratorExecuteSpy.mockImplementation(async function* () {
      yield {
        type: "ai-done",
        timestamp: Date.now(),
        fullText: "rewritten",
        usage: {
          promptTokens: 10,
          completionTokens: 3,
          totalTokens: 13,
        },
      };
      yield {
        type: "permission-requested",
        timestamp: Date.now(),
        level: "preview-confirm",
        description: "confirm writeback",
      };
    });

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
        input: "原文片段",
        userInstruction: "改写得更冷峻",
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
        status: "preview" | "completed" | "rejected";
        previewId?: string;
        outputText?: string;
      };
    };

    expect(result).toMatchObject({
      ok: true,
      data: {
        status: "preview",
        outputText: "rewritten",
      },
    });
    expect(result.data?.executionId).toBeTruthy();
    expect(result.data?.runId).toBeTruthy();
    expect(result.data?.previewId).toBe(result.data?.executionId);
    expect(orchestratorExecuteSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        skillId: "builtin:rewrite",
        documentId: "doc-1",
        projectId: "project-1",
        input: expect.objectContaining({
          selectedText: "原文片段",
        }),
        userInstruction: "改写得更冷峻",
        selection,
      }),
    );
  });
});
