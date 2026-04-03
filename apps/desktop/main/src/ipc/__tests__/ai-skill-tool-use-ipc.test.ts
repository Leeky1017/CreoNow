import { describe, expect, it, vi } from "vitest";
import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

const { orchestratorExecuteSpy } = vi.hoisted(() => ({
  orchestratorExecuteSpy: vi.fn(),
}));

vi.mock("../../services/skills/skillExecutor", () => ({
  createSkillExecutor: vi.fn(() => ({
    execute: vi.fn(),
  })),
}));

vi.mock("../../services/skills/orchestrator", () => ({
  createWritingOrchestrator: vi.fn(() => ({
    execute: orchestratorExecuteSpy,
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

type Handler = (
  event: {
    sender: { id: number; send: (channel: string, payload: unknown) => void };
  },
  payload: unknown,
) => Promise<unknown>;

function createLogger() {
  return {
    logPath: "<test>",
    info: () => undefined,
    error: () => undefined,
  };
}

describe("ai:skill:run tool-use IPC forwarding", () => {
  function createHarness() {
    const handlers = new Map<string, Handler>();
    const sentEvents: Array<{ channel: string; payload: unknown }> = [];
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

    return {
      sentEvents,
      async invokeSkillRun() {
        const handler = handlers.get("ai:skill:run");
        if (!handler) {
          throw new Error("Missing ai:skill:run handler");
        }
        return await handler(
          {
            sender: {
              id: 7,
              send: (channel: string, payload: unknown) => {
                sentEvents.push({ channel, payload });
              },
            },
          },
          {
            skillId: "builtin:continue",
            hasSelection: false,
            input: "甲乙丙丁",
            mode: "ask",
            model: "gpt-5.2",
            stream: true,
            context: {
              projectId: "project-1",
              documentId: "doc-1",
            },
          },
        );
      },
    };
  }

  it("preview 前通过 skill:tool-use 透出 started/completed", async () => {
    orchestratorExecuteSpy.mockReset();
    orchestratorExecuteSpy.mockImplementation(async function* () {
      yield {
        type: "tool-use-started",
        timestamp: Date.now(),
        round: 1,
        toolNames: ["documentRead"],
      };
      yield {
        type: "tool-use-completed",
        timestamp: Date.now(),
        round: 1,
        results: [{ toolName: "documentRead", success: true, durationMs: 12 }],
        hasNextRound: true,
      };
      yield {
        type: "ai-done",
        timestamp: Date.now(),
        fullText: "最终续写。",
        usage: {
          promptTokens: 10,
          completionTokens: 4,
          totalTokens: 14,
        },
      };
      yield {
        type: "permission-requested",
        timestamp: Date.now(),
        level: "preview-confirm",
        description: "confirm writeback",
      };
    });

    const harness = createHarness();
    const result = await harness.invokeSkillRun();

    expect(result).toMatchObject({
      ok: true,
      data: {
        status: "preview",
        outputText: "最终续写。",
      },
    });
    const toolEvents = harness.sentEvents.filter(
      (event) => event.channel === "skill:tool-use",
    );
    expect(toolEvents).toHaveLength(2);
    expect(toolEvents[0]?.payload).toMatchObject({
      type: "tool-use-started",
      round: 1,
      toolNames: ["documentRead"],
    });
    expect(toolEvents[1]?.payload).toMatchObject({
      type: "tool-use-completed",
      round: 1,
      hasNextRound: true,
      results: [{ toolName: "documentRead", success: true, durationMs: 12 }],
    });
  });

  it("preview 前通过 skill:tool-use 透出 failed", async () => {
    orchestratorExecuteSpy.mockReset();
    orchestratorExecuteSpy.mockImplementation(async function* () {
      yield {
        type: "tool-use-failed",
        timestamp: Date.now(),
        round: 2,
        error: {
          code: "TOOL_USE_MAX_ROUNDS_EXCEEDED",
          message: "Maximum tool rounds exceeded",
          retryable: false,
        },
      };
      yield {
        type: "ai-done",
        timestamp: Date.now(),
        fullText: "部分续写。",
        usage: {
          promptTokens: 10,
          completionTokens: 4,
          totalTokens: 14,
        },
      };
      yield {
        type: "permission-requested",
        timestamp: Date.now(),
        level: "preview-confirm",
        description: "confirm writeback",
      };
    });

    const harness = createHarness();
    await harness.invokeSkillRun();

    const toolEvents = harness.sentEvents.filter(
      (event) => event.channel === "skill:tool-use",
    );
    expect(toolEvents).toHaveLength(1);
    expect(toolEvents[0]?.payload).toMatchObject({
      type: "tool-use-failed",
      round: 2,
      error: {
        code: "TOOL_USE_MAX_ROUNDS_EXCEEDED",
        message: "Maximum tool rounds exceeded",
      },
    });
  });

  it("preview 前通过 skill:tool-use 透出 warning", async () => {
    orchestratorExecuteSpy.mockReset();
    orchestratorExecuteSpy.mockImplementation(async function* () {
      yield {
        type: "warning",
        timestamp: Date.now(),
        message: "AI 返回 tool_use 但当前 Skill 未启用 Agentic Loop",
      };
      yield {
        type: "ai-done",
        timestamp: Date.now(),
        fullText: "最终润色。",
        usage: {
          promptTokens: 10,
          completionTokens: 4,
          totalTokens: 14,
        },
      };
      yield {
        type: "permission-requested",
        timestamp: Date.now(),
        level: "preview-confirm",
        description: "confirm writeback",
      };
    });

    const harness = createHarness();
    await harness.invokeSkillRun();

    const toolEvents = harness.sentEvents.filter(
      (event) => event.channel === "skill:tool-use",
    );
    expect(toolEvents).toHaveLength(1);
    expect(toolEvents[0]?.payload).toMatchObject({
      type: "tool-use-warning",
      message: "AI 返回 tool_use 但当前 Skill 未启用 Agentic Loop",
    });
  });
});
