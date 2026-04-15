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
  const skillListMock = vi.fn().mockReturnValue({ ok: true, data: { items: [] } });
  const skillResolveForRunMock = vi.fn().mockReturnValue({
    ok: true,
    data: {
      skill: {
        id: "builtin:chat",
        name: "Chat",
        scope: "builtin",
        packageId: "pkg.creonow.builtin",
        version: "1.0.0",
        filePath: "/mock/skills/pkg.creonow.builtin/1.0.0/skills/chat/SKILL.md",
        prompt: { system: "s", user: "u" },
        output: undefined,
        valid: true,
        dependsOn: [],
        timeoutMs: 30_000,
        permissionLevel: "preview-confirm",
      },
      enabled: true,
      inputType: "document",
    },
  });
  const bridgeStreamChatMock = vi.fn(async function* () {
    throw { kind: "unsupported-provider" };
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
    bridgeStreamChatMock,
    createAiServiceBridgeMock: vi.fn(() => ({
      streamChat: bridgeStreamChatMock,
      estimateTokens: vi.fn(() => 100),
      abort: vi.fn(),
    })),
    createSqliteTraceStoreMock: vi.fn(() => ({})),
    createAiProxySettingsServiceMock: vi.fn(() => ({
      getRaw: vi.fn().mockReturnValue({ ok: true, data: { enabled: false } }),
      get: vi.fn().mockReturnValue({ ok: true, data: {} }),
      update: vi.fn().mockReturnValue({ ok: true, data: {} }),
      test: vi.fn().mockResolvedValue({ ok: true, data: { ok: true, latencyMs: 50 } }),
    })),
    skillListMock,
    skillResolveForRunMock,
    createSkillServiceMock: vi.fn(() => ({
      list: skillListMock,
      resolveForRun: skillResolveForRunMock,
      isDependencyAvailable: vi.fn().mockReturnValue({ ok: true, data: { available: true } }),
    })),
    createSkillExecutorMock: vi.fn(() => ({
      execute: vi.fn(),
    })),
    createWritingOrchestratorMock: vi.fn(() => ({
      run: vi.fn(),
      cancel: vi.fn(),
    })),
    createContextLayerAssemblyServiceMock: vi.fn(() => ({
      assemble: vi.fn().mockResolvedValue({
        prompt: "ctx",
        tokenCount: 10,
        stablePrefixHash: "hash",
        stablePrefixUnchanged: false,
        warnings: [],
        compressionApplied: false,
        capacityPercent: 1,
        layers: [],
      }),
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
    createP3SkillExecutorMock: vi.fn(() => ({
      executeSkill: vi.fn().mockResolvedValue({
        success: true,
        data: { passed: true, issues: [] },
      }),
      registerSkills: vi.fn(),
      dispose: vi.fn(),
    })),
  };
});

vi.mock("../../services/ai/aiService", () => ({
  createAiService: mocks.createAiServiceMock,
}));
vi.mock("../../services/ai/traceStore", () => ({
  createSqliteTraceStore: mocks.createSqliteTraceStoreMock,
}));
vi.mock("../../services/ai/aiServiceBridge", () => ({
  createAiServiceBridge: mocks.createAiServiceBridgeMock,
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
vi.mock("../../services/skills/p3Skills", () => ({
  createP3SkillExecutor: mocks.createP3SkillExecutorMock,
}));
vi.mock("../../services/skills/writingTooling", () => ({
  createWritingToolRegistry: vi.fn(() => ({ getTools: () => [] })),
  createAgenticToolRegistry: vi.fn(() => ({ getTools: () => [] })),
}));
vi.mock("../../services/skills/toolRegistry", () => ({
  createToolRegistry: vi.fn(() => ({
    getAllTools: () => [],
    getToolsByCategory: () => [],
    register: vi.fn(),
    unregister: vi.fn(),
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

function createHarness(
  dbNull = false,
  withCostTracker = false,
  withEventBus = false,
) {
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
    ...(withCostTracker
      ? {
          costTracker: {
            checkBudget: vi.fn(() => ({ ok: true })),
            recordUsage: vi.fn(() => ({ requestCost: 0, sessionTotalCost: 0 })),
            getSessionCost: vi.fn(() => ({
              totalCost: 0,
              totalRequests: 0,
              budgetStatus: "ok" as const,
            })),
          } as unknown as never,
        }
      : {}),
    ...(withEventBus
      ? {
          eventBus: {
            emit: vi.fn(),
            on: vi.fn(),
            off: vi.fn(),
          } as unknown as never,
        }
      : {}),
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
  const makeResolvedSkill = (id: string, enabled = true, valid = true) => ({
    ok: true as const,
    data: {
      skill: {
        id,
        name: "Chat",
        scope: "builtin" as const,
        packageId: "pkg.creonow.builtin",
        version: "1.0.0",
        filePath: `/mock/skills/pkg.creonow.builtin/1.0.0/skills/${id.replace("builtin:", "")}/SKILL.md`,
        prompt: { system: "s", user: "u" },
        output: undefined,
        valid,
        dependsOn: [],
        timeoutMs: 30_000,
        permissionLevel: "preview-confirm" as const,
      },
      enabled,
      inputType: "document" as const,
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.skillListMock.mockReturnValue({ ok: true, data: { items: [] } });
    mocks.skillResolveForRunMock.mockReturnValue(makeResolvedSkill("builtin:chat"));
  });

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

  it("启动阶段预热 Skill registry 并检查必需内置技能", () => {
    const harness = createHarness();
    expect(mocks.createSkillServiceMock).toHaveBeenCalled();
    expect(mocks.skillListMock).toHaveBeenCalledWith({ includeDisabled: true });
    expect(harness.logger.info).toHaveBeenCalledWith("skill_registry_warmup_loaded", {
      validSkillCount: 0,
      builtinValidSkillCount: 0,
    });
    expect(mocks.skillResolveForRunMock).toHaveBeenCalledWith({
      id: "builtin:polish",
    });
    expect(mocks.skillResolveForRunMock).toHaveBeenCalledWith({
      id: "builtin:rewrite",
    });
    expect(mocks.skillResolveForRunMock).toHaveBeenCalledWith({
      id: "builtin:continue",
    });
    expect(mocks.skillResolveForRunMock).toHaveBeenCalledWith({
      id: "builtin:chat",
    });
    expect(mocks.createWritingOrchestratorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        validSkillIds: [],
      }),
    );
  });

  it("提供 eventBus 时接通 quality-check post-writing hook", () => {
    createHarness(false, true, true);
    expect(mocks.createP3SkillExecutorMock).toHaveBeenCalledTimes(1);
    const firstCall =
      mocks.createWritingOrchestratorMock.mock.calls[0] as unknown[] | undefined;
    const orchestratorConfig = firstCall?.[0] as
      | { postWritingHooks?: Array<{ name: string }> }
      | undefined;
    const hookNames = (orchestratorConfig?.postWritingHooks ?? []).map(
      (hook: { name: string }) => hook.name,
    );
    expect(hookNames).toContain("quality-check");
  });

  it("触发 quality-check hook 时经 P3 executor 执行 consistency-check", async () => {
    createHarness(false, true, true);
    const firstCall =
      mocks.createWritingOrchestratorMock.mock.calls[0] as unknown[] | undefined;
    const orchestratorConfig = firstCall?.[0] as
      | {
          postWritingHooks?: Array<{
            name: string;
            execute: (ctx: {
              requestId: string;
              documentId: string;
              projectId?: string;
              sessionId?: string;
              fullText: string;
            }) => Promise<void>;
          }>;
        }
      | undefined;
    const qualityHook = orchestratorConfig?.postWritingHooks?.find(
      (hook) => hook.name === "quality-check",
    );
    const executorInstance = mocks.createP3SkillExecutorMock.mock.results[0]?.value as
      | { executeSkill: ReturnType<typeof vi.fn> }
      | undefined;

    expect(qualityHook).toBeDefined();
    expect(executorInstance).toBeDefined();

    await qualityHook?.execute({
      requestId: "req-001",
      documentId: "doc-001",
      projectId: "proj-001",
      sessionId: "sess-001",
      fullText: "李明在青云城门口看见了与设定不符的细节。",
    });

    expect(executorInstance?.executeSkill).toHaveBeenCalledWith(
      "consistency-check",
      expect.objectContaining({
        projectId: "proj-001",
        documentId: "doc-001",
        documentContent: "李明在青云城门口看见了与设定不符的细节。",
      }),
    );
  });

  it("预热 list 失败时记录 skill_registry_warmup_failed 错误日志", () => {
    mocks.skillListMock.mockReturnValueOnce({
      ok: false,
      error: { code: "INTERNAL", message: "warmup failed" },
    });
    const harness = createHarness();
    expect(harness.logger.error).toHaveBeenCalledWith("skill_registry_warmup_failed", {
      code: "INTERNAL",
      message: "warmup failed",
    });
  });

  it("预热解析内置技能失败时记录 builtin_skill_missing_on_startup 错误日志", () => {
    mocks.skillResolveForRunMock
      .mockReturnValueOnce(makeResolvedSkill("builtin:polish"))
      .mockReturnValueOnce(makeResolvedSkill("builtin:rewrite"))
      .mockReturnValueOnce(makeResolvedSkill("builtin:continue"))
      .mockReturnValueOnce({
        ok: false,
        error: { code: "NOT_FOUND", message: "chat missing" },
      });
    const harness = createHarness();
    expect(harness.logger.error).toHaveBeenCalledWith("builtin_skill_missing_on_startup", {
      skillId: "builtin:chat",
      code: "NOT_FOUND",
      message: "chat missing",
    });
  });

  it("预热解析到 disabled skill 时记录 builtin_skill_disabled_on_startup 日志", () => {
    mocks.skillResolveForRunMock
      .mockReturnValueOnce(makeResolvedSkill("builtin:polish"))
      .mockReturnValueOnce(makeResolvedSkill("builtin:rewrite"))
      .mockReturnValueOnce(makeResolvedSkill("builtin:continue"))
      .mockReturnValueOnce(makeResolvedSkill("builtin:chat", false, true));
    const harness = createHarness();
    expect(harness.logger.info).toHaveBeenCalledWith("builtin_skill_disabled_on_startup", {
      skillId: "builtin:chat",
    });
  });

  it("预热解析到 invalid skill 时记录 builtin_skill_invalid_on_startup 错误日志", () => {
    mocks.skillResolveForRunMock
      .mockReturnValueOnce(makeResolvedSkill("builtin:polish"))
      .mockReturnValueOnce(makeResolvedSkill("builtin:rewrite"))
      .mockReturnValueOnce(makeResolvedSkill("builtin:continue"))
      .mockReturnValueOnce({
        ok: true,
        data: {
          ...makeResolvedSkill("builtin:chat", true, false).data,
          skill: {
            ...makeResolvedSkill("builtin:chat", true, false).data.skill,
            error_code: "INVALID_ARGUMENT",
            error_message: "manifest invalid",
          },
        },
      });
    const harness = createHarness();
    expect(harness.logger.error).toHaveBeenCalledWith("builtin_skill_invalid_on_startup", {
      skillId: "builtin:chat",
      code: "INVALID_ARGUMENT",
      message: "manifest invalid",
    });
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

describe("aiService streamChat fallback wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bridge unsupported-provider 回退 legacy 路径时仍触发 onApiCallStarted", async () => {
    createHarness(false, true);
    const orchestratorConfig = (
      mocks.createWritingOrchestratorMock as unknown as {
        mock: { calls: Array<[unknown]> };
      }
    ).mock.calls[0]?.[0] as
      | {
          aiService: {
            streamChat: (
              messages: Array<{ role: string; content: string }>,
              options: {
                signal: AbortSignal;
                onComplete: (r: unknown) => void;
                onError: (e: unknown) => void;
                onApiCallStarted?: () => void;
                skillId?: string;
              },
            ) => AsyncGenerator<{
              delta: string;
              finishReason: "stop" | "tool_use" | null;
              accumulatedTokens: number;
            }>;
          };
        }
      | undefined;

    expect(orchestratorConfig).toBeDefined();
    const onApiCallStarted = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();
    const chunks: Array<{ delta: string }> = [];

    for await (const chunk of orchestratorConfig!.aiService.streamChat(
      [{ role: "user", content: "fallback test" }],
      {
        signal: new AbortController().signal,
        onComplete,
        onError,
        onApiCallStarted,
        skillId: "builtin:continue",
      },
    )) {
      chunks.push(chunk);
    }

    expect(mocks.bridgeStreamChatMock).toHaveBeenCalledTimes(1);
    expect(mocks.runSkillMock).toHaveBeenCalledTimes(1);
    expect(onApiCallStarted).toHaveBeenCalledTimes(1);
    expect(chunks).toHaveLength(1);
    expect(onError).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("bridge fallback 到 legacy 后，wrapper abort 为 no-op（由 request signal 负责中止）", async () => {
    let resolveRunSkill: ((value: unknown) => void) | undefined;
    mocks.runSkillMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRunSkill = resolve;
        }),
    );

    createHarness(false, true);
    const orchestratorConfig = (
      mocks.createWritingOrchestratorMock as unknown as {
        mock: { calls: Array<[unknown]> };
      }
    ).mock.calls[0]?.[0] as
      | {
          aiService: {
            streamChat: (
              messages: Array<{ role: string; content: string }>,
              options: {
                signal: AbortSignal;
                onComplete: (r: unknown) => void;
                onError: (e: unknown) => void;
                onApiCallStarted?: () => void;
                skillId?: string;
              },
            ) => AsyncGenerator<{
              delta: string;
              finishReason: "stop" | "tool_use" | null;
              accumulatedTokens: number;
            }>;
            abort: () => void;
          };
        }
      | undefined;
    expect(orchestratorConfig).toBeDefined();

    const bridgeService = (
      mocks.createAiServiceBridgeMock as unknown as {
        mock: { results: Array<{ value: { abort: ReturnType<typeof vi.fn> } }> };
      }
    ).mock.results[0]?.value;
    expect(bridgeService).toBeDefined();

    const onComplete = vi.fn();
    const onError = vi.fn();
    const onApiCallStarted = vi.fn();
    const gen = orchestratorConfig!.aiService.streamChat(
      [{ role: "user", content: "fallback-abort" }],
      {
        signal: new AbortController().signal,
        onComplete,
        onError,
        onApiCallStarted,
        skillId: "builtin:continue",
      },
    );

    const pendingNext = gen.next();
    await Promise.resolve();
    orchestratorConfig!.aiService.abort();
    expect(bridgeService?.abort).not.toHaveBeenCalled();

    resolveRunSkill?.({
      ok: true,
      data: {
        executionId: "exec-l",
        runId: "run-l",
        traceId: "trace-l",
        outputText: "late result",
      },
    });
    const firstChunk = await pendingNext;
    expect(firstChunk.done).toBe(false);
    const finished = await gen.next();
    expect(finished.done).toBe(true);
    expect(mocks.bridgeStreamChatMock).toHaveBeenCalledTimes(1);
    expect(mocks.runSkillMock).toHaveBeenCalledTimes(1);
    expect(onApiCallStarted).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
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
