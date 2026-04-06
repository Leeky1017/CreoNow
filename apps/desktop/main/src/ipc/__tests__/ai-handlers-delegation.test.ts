/**
 * Tests for ai.ts IPC handlers: channel registration, DB-not-ready guards,
 * and basic delegation for models/cancel/feedback channels.
 *
 * Heavy internal wiring (services, orchestrators, etc.) is mocked via vi.mock
 * to test IPC-level behavior in isolation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IpcMain } from "electron";

const mocks = vi.hoisted(() => {
  const listModelsMock = vi.fn().mockResolvedValue({
    ok: true,
    data: { source: "openai", items: [{ id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" }] },
  });
  const cancelMock = vi.fn().mockReturnValue({ ok: true, data: { canceled: true } });
  const feedbackMock = vi.fn().mockReturnValue({ ok: true, data: { recorded: true } });
  const runSkillMock = vi.fn().mockResolvedValue({
    ok: true,
    data: { executionId: "exec-1", runId: "run-1", traceId: "trace-1", outputText: "ok" },
  });

  return {
    listModelsMock,
    cancelMock,
    feedbackMock,
    runSkillMock,
    createAiServiceMock: vi.fn(() => ({
      listModels: listModelsMock,
      cancel: cancelMock,
      feedback: feedbackMock,
      runSkill: runSkillMock,
    })),
    createSqliteTraceStoreMock: vi.fn(() => ({})),
    createAiProxySettingsServiceMock: vi.fn(() => ({
      getRaw: vi.fn().mockReturnValue({ ok: true, data: { enabled: false } }),
      get: vi.fn().mockReturnValue({ ok: true, data: {} }),
      update: vi.fn().mockReturnValue({ ok: true, data: {} }),
      test: vi.fn().mockResolvedValue({ ok: true, data: { ok: true, latencyMs: 50 } }),
    })),
    createSkillServiceMock: vi.fn(() => ({
      listSkills: vi.fn().mockReturnValue({ ok: true, data: { items: [] } }),
      getSkill: vi.fn(),
    })),
    createSkillExecutorMock: vi.fn(() => ({
      execute: vi.fn(),
    })),
    createWritingOrchestratorMock: vi.fn(() => ({
      run: vi.fn(),
      cancel: vi.fn(),
    })),
    createContextLayerAssemblyServiceMock: vi.fn(() => ({
      assemble: vi.fn().mockReturnValue({ ok: true, data: { layers: [] } }),
    })),
    createKnowledgeGraphServiceMock: vi.fn(() => ({})),
    createMemoryServiceMock: vi.fn(() => ({})),
    createEpisodicMemoryServiceMock: vi.fn(() => ({})),
    createSqliteEpisodeRepositoryMock: vi.fn(() => ({})),
    createStatsServiceMock: vi.fn(() => ({
      increment: vi.fn().mockReturnValue({ ok: true, data: {} }),
    })),
    createDocumentServiceMock: vi.fn(() => ({
      read: vi.fn(),
    })),
  };
});

vi.mock("../../services/ai/aiService", () => ({
  createAiService: mocks.createAiServiceMock,
}));
vi.mock("../../services/ai/traceStore", () => ({
  createSqliteTraceStore: mocks.createSqliteTraceStoreMock,
}));
vi.mock("../../services/ai/aiProxySettingsService", () => ({
  createAiProxySettingsService: mocks.createAiProxySettingsServiceMock,
}));
vi.mock("../../services/skills/skillService", () => ({
  createSkillService: mocks.createSkillServiceMock,
}));
vi.mock("../../services/skills/skillExecutor", () => ({
  createSkillExecutor: mocks.createSkillExecutorMock,
}));
vi.mock("../../services/skills/orchestrator", () => ({
  createWritingOrchestrator: mocks.createWritingOrchestratorMock,
  AGENTIC_MAX_ROUNDS: 10,
}));
vi.mock("../../services/context/layerAssemblyService", () => ({
  createContextLayerAssemblyService: mocks.createContextLayerAssemblyServiceMock,
}));
vi.mock("../../services/kg/kgService", () => ({
  createKnowledgeGraphService: mocks.createKnowledgeGraphServiceMock,
}));
vi.mock("../../services/memory/memoryService", () => ({
  createMemoryService: mocks.createMemoryServiceMock,
}));
vi.mock("../../services/memory/episodicMemoryService", () => ({
  createEpisodicMemoryService: mocks.createEpisodicMemoryServiceMock,
  createSqliteEpisodeRepository: mocks.createSqliteEpisodeRepositoryMock,
}));
vi.mock("../../services/stats/statsService", () => ({
  createStatsService: mocks.createStatsServiceMock,
}));
vi.mock("../../services/documents/documentService", () => ({
  createDocumentService: mocks.createDocumentServiceMock,
}));
vi.mock("../../services/skills/writingTooling", () => ({
  createWritingToolRegistry: vi.fn(() => ({ getTools: () => [] })),
  createAgenticToolRegistry: vi.fn(() => ({ getTools: () => [] })),
}));
vi.mock("../../services/skills/toolRegistry", () => ({
  createToolRegistry: vi.fn(() => ({
    getAllTools: () => [],
    getToolsByCategory: () => [],
  })),
}));
vi.mock("../../services/skills/toolUseHandler", () => ({
  createToolUseHandler: vi.fn(() => ({
    handle: vi.fn(),
  })),
}));
vi.mock("../../services/skills/contextPromptPolicy", () => ({
  normalizeAssembledContextPrompt: vi.fn((x: unknown) => x),
}));
vi.mock("../../services/skills/promptTemplate", () => ({
  renderPromptTemplate: vi.fn((t: string) => t),
}));
vi.mock("../../services/context/tokenEstimation", () => ({
  estimateTokens: vi.fn(() => 100),
}));
vi.mock("../../services/memory/preferenceLearning", () => ({
  recordSkillFeedbackAndLearn: vi.fn().mockReturnValue({
    ok: true,
    data: { recorded: true },
  }),
}));
vi.mock("../../services/editor/prosemirrorSchema", () => ({
  editorSchema: {
    nodeFromJSON: vi.fn(() => ({
      content: { size: 100 },
      textBetween: vi.fn(() => "test text"),
    })),
  },
}));
vi.mock("../../services/shared/degradationCounter", () => {
  class MockDegradationCounter {
    increment = vi.fn();
    getCount = vi.fn().mockReturnValue(0);
  }
  return {
    DegradationCounter: MockDegradationCounter,
    logWarn: vi.fn(),
  };
});

const { registerAiIpcHandlers } = await import("../ai");

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

interface IpcResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function createHarness(dbNull = false) {
  const handlers = new Map<string, Handler>();

  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    logPath: "<test>",
  };

  const db = dbNull
    ? null
    : ({
        prepare: vi.fn(() => ({
          run: vi.fn(() => ({ changes: 0 })),
          get: vi.fn(),
          all: vi.fn(() => []),
        })),
        exec: vi.fn(),
        transaction: vi.fn((fn: () => void) => fn),
      } as never);

  registerAiIpcHandlers({
    ipcMain,
    db,
    userDataDir: "/mock/user-data",
    builtinSkillsDir: "/mock/skills",
    logger: logger as never,
    env: {
      CREONOW_AI_PROVIDER: "openai",
      CREONOW_AI_BASE_URL: "https://api.openai.com",
      CREONOW_AI_API_KEY: "sk-test-key-12345678",
    },
  });

  return {
    invoke: async <T>(channel: string, payload?: unknown) => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return (await handler({ sender: { id: 1 } }, payload)) as IpcResponse<T>;
    },
    handlers,
    logger,
  };
}

// ── Channel Registration ──

describe("AI IPC channel registration", () => {
  it("注册所有预期通道", () => {
    const harness = createHarness();
    const expectedChannels = [
      "ai:models:list",
      "ai:skill:run",
      "ai:skill:confirm",
      "ai:skill:cancel",
      "ai:skill:feedback",
      "ai:chat:send",
      "ai:chat:list",
      "ai:chat:clear",
      "ai:chat:sessions",
      "ai:chatsession:delete",
    ];
    for (const ch of expectedChannels) {
      expect(harness.handlers.has(ch), `missing channel: ${ch}`).toBe(true);
    }
  });
});

// ── ai:models:list ──

describe("ai:models:list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("成功返回模型列表", async () => {
    const harness = createHarness();
    const res = await harness.invoke<{ source: string; items: unknown[] }>(
      "ai:models:list",
    );
    expect(res.ok).toBe(true);
    expect(res.data?.source).toBe("openai");
    expect(res.data?.items).toHaveLength(1);
  });

  it("aiService 返回错误时传递错误", async () => {
    mocks.listModelsMock.mockResolvedValueOnce({
      ok: false,
      error: { code: "AI_AUTH_FAILED", message: "Bad key" },
    });
    const harness = createHarness();
    const res = await harness.invoke("ai:models:list");
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("AI_AUTH_FAILED");
  });

  it("aiService 抛异常 → INTERNAL", async () => {
    mocks.listModelsMock.mockRejectedValueOnce(new Error("boom"));
    const harness = createHarness();
    const res = await harness.invoke("ai:models:list");
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INTERNAL");
  });
});

// ── ai:skill:cancel ──

describe("ai:skill:cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("缺少 executionId 和 runId → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("ai:skill:cancel", {});
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("提供 executionId 委托到 aiService.cancel", async () => {
    const harness = createHarness();
    const res = await harness.invoke("ai:skill:cancel", {
      executionId: "exec-42",
    });
    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ canceled: true });
  });
});

// ── ai:skill:feedback ──

describe("ai:skill:feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("空 runId → INVALID_ARGUMENT", async () => {
    const harness = createHarness();
    const res = await harness.invoke("ai:skill:feedback", {
      runId: "",
      action: "accept",
      evidenceRef: "doc://test",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("未知 runId → NOT_FOUND", async () => {
    const harness = createHarness();
    const res = await harness.invoke("ai:skill:feedback", {
      runId: "unknown-run",
      action: "accept",
      evidenceRef: "doc://test",
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("NOT_FOUND");
  });
});

// ── ai:chat:list (DB not ready) ──

describe("ai:chat:list", () => {
  it("DB 未就绪 → DB_NOT_READY 或 DB_ERROR", async () => {
    const harness = createHarness(true);
    const res = await harness.invoke("ai:chat:list", {
      projectId: "proj-1",
    });
    expect(res.ok).toBe(false);
    expect(["DB_NOT_READY", "DB_ERROR"]).toContain(res.error?.code);
  });
});

// ── ai:chat:clear (DB not ready) ──

describe("ai:chat:clear", () => {
  it("DB 未就绪 → DB_NOT_READY 或 DB_ERROR", async () => {
    const harness = createHarness(true);
    const res = await harness.invoke("ai:chat:clear", {
      projectId: "proj-1",
    });
    expect(res.ok).toBe(false);
    expect(["DB_NOT_READY", "DB_ERROR"]).toContain(res.error?.code);
  });
});

// ── ai:chat:sessions (DB not ready) ──

describe("ai:chat:sessions", () => {
  it("DB 未就绪 → DB_NOT_READY 或 DB_ERROR", async () => {
    const harness = createHarness(true);
    const res = await harness.invoke("ai:chat:sessions", {
      projectId: "proj-1",
    });
    expect(res.ok).toBe(false);
    expect(["DB_NOT_READY", "DB_ERROR"]).toContain(res.error?.code);
  });
});
