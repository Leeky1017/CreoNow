import { describe, it, expect, vi } from "vitest";
import type { IpcMain } from "electron";
import { registerMemoryIpcHandlers } from "../memory";
import type { EpisodicMemoryService } from "../../services/memory/episodicMemoryService";
import type { MemoryTraceService } from "../../services/memory/memoryTraceService";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

const EXPECTED_CHANNELS = [
  "memory:entry:create",
  "memory:entry:list",
  "memory:entry:update",
  "memory:entry:delete",
  "memory:settings:get",
  "memory:settings:update",
  "memory:injection:preview",
  "memory:episode:record",
  "memory:episode:query",
  "memory:semantic:list",
  "memory:semantic:add",
  "memory:semantic:update",
  "memory:semantic:delete",
  "memory:conflict:resolve",
  "memory:scope:promote",
  "memory:clear:project",
  "memory:clear:all",
  "memory:semantic:distill",
  "memory:trace:get",
  "memory:trace:feedback",
] as const;

function createMockEvent() {
  return { sender: { id: 1, send: vi.fn() } };
}

function createMockEpisodicService(): EpisodicMemoryService {
  return {
    recordEpisode: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        accepted: true,
        episodeId: "ep-1",
        retryCount: 0,
        implicitSignal: "DIRECT_ACCEPT",
        implicitWeight: 1.0,
      },
    }),
    queryEpisodes: vi.fn().mockReturnValue({
      ok: true,
      data: {
        items: [],
        memoryDegraded: false,
        fallbackRules: [],
        semanticRules: [],
      },
    }),
    listSemanticMemory: vi.fn().mockReturnValue({
      ok: true,
      data: { items: [], conflictQueue: [] },
    }),
    addSemanticMemory: vi.fn().mockReturnValue({
      ok: true,
      data: {
        item: {
          id: "rule-1",
          projectId: "p1",
          rule: "test rule",
          category: "style",
          confidence: 0.9,
          scope: "project",
          supportingEpisodes: [],
          contradictingEpisodes: [],
          userConfirmed: false,
          userModified: false,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      },
    }),
    updateSemanticMemory: vi.fn().mockReturnValue({
      ok: true,
      data: {
        item: {
          id: "rule-1",
          projectId: "p1",
          rule: "updated rule",
          category: "style",
          confidence: 0.95,
          scope: "project",
          supportingEpisodes: [],
          contradictingEpisodes: [],
          userConfirmed: false,
          userModified: true,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-02",
        },
      },
    }),
    deleteSemanticMemory: vi.fn().mockReturnValue({
      ok: true,
      data: { deleted: true },
    }),
    resolveSemanticConflict: vi.fn().mockReturnValue({
      ok: true,
      data: {
        item: {
          id: "conflict-1",
          ruleIds: ["r1", "r2"],
          status: "resolved" as const,
        },
        keptRule: {
          id: "r1",
          projectId: "p1",
          rule: "kept",
          category: "style",
          confidence: 0.9,
          scope: "project",
          supportingEpisodes: [],
          contradictingEpisodes: [],
          userConfirmed: true,
          userModified: false,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      },
    }),
    promoteSemanticMemory: vi.fn().mockReturnValue({
      ok: true,
      data: {
        item: {
          id: "rule-1",
          projectId: "p1",
          rule: "promoted rule",
          category: "style",
          confidence: 1.0,
          scope: "global",
          supportingEpisodes: [],
          contradictingEpisodes: [],
          userConfirmed: true,
          userModified: false,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      },
    }),
    clearProjectMemory: vi.fn().mockReturnValue({
      ok: true,
      data: { ok: true, deletedEpisodes: 5, deletedRules: 2 },
    }),
    clearAllMemory: vi.fn().mockReturnValue({
      ok: true,
      data: { ok: true, deletedEpisodes: 10, deletedRules: 4 },
    }),
    distillSemanticMemory: vi.fn().mockResolvedValue({
      ok: true,
      data: { accepted: true, runId: "run-1" },
    }),
  } as unknown as EpisodicMemoryService;
}

function createMockTraceService(): MemoryTraceService {
  return {
    getTrace: vi.fn().mockReturnValue({
      ok: true,
      data: {
        trace: {
          generationId: "gen-1",
          projectId: "p1",
          createdAt: "2024-01-01",
          memoriesUsed: [],
          skillUsed: "draft",
          inputTokens: 100,
          outputTokens: 50,
        },
      },
    }),
    recordFeedback: vi.fn().mockReturnValue({
      ok: true,
      data: { accepted: true, feedbackId: "fb-1" },
    }),
    upsertTrace: vi.fn(),
    listFeedbackForGeneration: vi.fn().mockReturnValue([]),
  };
}

function createHarness(opts?: {
  db?: unknown;
  episodicService?: EpisodicMemoryService | null;
  traceService?: MemoryTraceService;
}) {
  const handlers = new Map<string, Handler>();

  const ipcMain = {
    handle: vi.fn((channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    }),
  } as unknown as IpcMain;

  const logger = {
    logPath: "/dev/null",
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const stmtRun = vi.fn().mockReturnValue({ changes: 1 });
  const stmtGet = vi.fn();
  const stmtAll = vi.fn().mockReturnValue([]);

  const db =
    opts?.db === null
      ? null
      : (opts?.db ?? {
          prepare: vi.fn(() => ({
            run: stmtRun,
            get: stmtGet,
            all: stmtAll,
          })),
          exec: vi.fn(),
          transaction: vi.fn(
            (fn: (...a: unknown[]) => unknown) =>
              (...args: unknown[]) =>
                fn(...args),
          ),
        });

  const episodicService =
    opts?.episodicService === null
      ? undefined
      : (opts?.episodicService ?? undefined);

  const traceService = opts?.traceService;

  registerMemoryIpcHandlers({
    ipcMain,
    db: db as never,
    logger: logger as never,
    episodicService: episodicService as never,
    traceService,
  });

  return {
    invoke: async (
      channel: string,
      payload?: unknown,
    ): Promise<{ ok: boolean; data?: unknown; error?: { code: string; message: string } }> => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return (await handler(createMockEvent(), payload)) as { ok: boolean; data?: unknown; error?: { code: string; message: string } };
    },
    handlers,
    ipcMain,
    logger,
    db,
    stmtRun,
    stmtGet,
    stmtAll,
  };
}

describe("memory IPC handlers", () => {
  // ── Channel registration ──

  it("registers all expected channels", () => {
    const { handlers } = createHarness();
    for (const ch of EXPECTED_CHANNELS) {
      expect(handlers.has(ch), `missing handler for ${ch}`).toBe(true);
    }
  });

  it("channel count matches expected number", () => {
    const { handlers } = createHarness();
    expect(handlers.size).toBe(EXPECTED_CHANNELS.length);
  });

  // ── DB_ERROR when db is null (entry/settings channels) ──

  describe("returns DB_ERROR when db is null for entry channels", () => {
    const dbDependentChannels = [
      "memory:entry:create",
      "memory:entry:list",
      "memory:entry:update",
      "memory:entry:delete",
      "memory:settings:get",
      "memory:settings:update",
      "memory:injection:preview",
    ] as const;

    it.each(dbDependentChannels)(
      "%s → DB_ERROR",
      async (channel) => {
        const { invoke } = createHarness({ db: null });
        const res = await invoke(channel, {
          type: "instruction",
          scope: "global",
          content: "test",
          memoryId: "m1",
          patch: {},
        });
        expect(res.ok).toBe(false);
        expect(res.error?.code).toBe("DB_ERROR");
      },
    );
  });

  // ── Episodic service not available ──

  describe("returns DB_ERROR when episodic service not available", () => {
    const episodicChannels = [
      "memory:episode:record",
      "memory:episode:query",
      "memory:semantic:list",
      "memory:semantic:add",
      "memory:semantic:update",
      "memory:semantic:delete",
      "memory:conflict:resolve",
      "memory:scope:promote",
      "memory:clear:project",
      "memory:clear:all",
      "memory:semantic:distill",
    ] as const;

    it.each(episodicChannels)(
      "%s → DB_ERROR when no episodicService and no db",
      async (channel) => {
        const { invoke } = createHarness({ db: null, episodicService: null });
        const res = await invoke(channel, {
          projectId: "p1",
          sessionId: "s1",
          confirmed: true,
          ruleId: "r1",
          conflictId: "c1",
          chosenRuleId: "r1",
          trigger: "manual",
          sceneType: "dialogue",
          skillUsed: "draft",
          documentId: "d1",
          userInput: "test",
          aiOutput: "output",
          userAction: "accept",
          rule: "test rule",
          category: "style",
          confidence: 0.9,
          patch: {},
        });
        expect(res.ok).toBe(false);
        expect(res.error?.code).toBe("DB_ERROR");
      },
    );
  });

  // ── Episodic service delegation when available ──

  describe("episode:record delegates to episodic service", () => {
    it("returns recorded episode", async () => {
      const episodicService = createMockEpisodicService();
      const { invoke } = createHarness({ episodicService });

      const res = await invoke("memory:episode:record", {
        projectId: "p1",
        sessionId: "s1",
        documentId: "d1",
        sceneType: "dialogue",
        skillUsed: "draft",
        userInput: "Write a scene",
        aiOutput: "The room was dark...",
        userAction: "accept",
      });
      expect(res.ok).toBe(true);
      expect(episodicService.recordEpisode).toHaveBeenCalled();
    });
  });

  describe("episode:query delegates to episodic service", () => {
    it("returns query results", async () => {
      const episodicService = createMockEpisodicService();
      const { invoke } = createHarness({ episodicService });

      const res = await invoke("memory:episode:query", {
        projectId: "p1",
        sceneType: "dialogue",
        skillUsed: "draft",
        limit: 10,
      });
      expect(res.ok).toBe(true);
      expect(episodicService.queryEpisodes).toHaveBeenCalled();
    });
  });

  describe("semantic:list delegates to episodic service", () => {
    it("returns semantic rules", async () => {
      const episodicService = createMockEpisodicService();
      const { invoke } = createHarness({ episodicService });

      const res = await invoke("memory:semantic:list", {
        projectId: "p1",
      });
      expect(res.ok).toBe(true);
      expect(episodicService.listSemanticMemory).toHaveBeenCalled();
    });
  });

  describe("semantic:add delegates to episodic service", () => {
    it("returns added rule", async () => {
      const episodicService = createMockEpisodicService();
      const { invoke } = createHarness({ episodicService });

      const res = await invoke("memory:semantic:add", {
        projectId: "p1",
        rule: "Use short sentences",
        category: "style",
        confidence: 0.9,
      });
      expect(res.ok).toBe(true);
      expect(episodicService.addSemanticMemory).toHaveBeenCalled();
    });
  });

  describe("semantic:update delegates to episodic service", () => {
    it("returns updated rule", async () => {
      const episodicService = createMockEpisodicService();
      const { invoke } = createHarness({ episodicService });

      const res = await invoke("memory:semantic:update", {
        projectId: "p1",
        ruleId: "rule-1",
        patch: { rule: "Updated rule text" },
      });
      expect(res.ok).toBe(true);
      expect(episodicService.updateSemanticMemory).toHaveBeenCalled();
    });
  });

  describe("semantic:delete delegates to episodic service", () => {
    it("returns deleted result", async () => {
      const episodicService = createMockEpisodicService();
      const { invoke } = createHarness({ episodicService });

      const res = await invoke("memory:semantic:delete", {
        projectId: "p1",
        ruleId: "rule-1",
      });
      expect(res.ok).toBe(true);
      expect(episodicService.deleteSemanticMemory).toHaveBeenCalled();
    });
  });

  describe("conflict:resolve delegates to episodic service", () => {
    it("returns resolved conflict", async () => {
      const episodicService = createMockEpisodicService();
      const { invoke } = createHarness({ episodicService });

      const res = await invoke("memory:conflict:resolve", {
        projectId: "p1",
        conflictId: "conflict-1",
        chosenRuleId: "r1",
      });
      expect(res.ok).toBe(true);
      expect(episodicService.resolveSemanticConflict).toHaveBeenCalled();
    });
  });

  describe("scope:promote delegates to episodic service", () => {
    it("returns promoted rule", async () => {
      const episodicService = createMockEpisodicService();
      const { invoke } = createHarness({ episodicService });

      const res = await invoke("memory:scope:promote", {
        projectId: "p1",
        ruleId: "rule-1",
      });
      expect(res.ok).toBe(true);
      expect(episodicService.promoteSemanticMemory).toHaveBeenCalled();
    });
  });

  describe("clear:project delegates to episodic service", () => {
    it("returns clear result", async () => {
      const episodicService = createMockEpisodicService();
      const { invoke } = createHarness({ episodicService });

      const res = await invoke("memory:clear:project", {
        projectId: "p1",
        confirmed: true,
      });
      expect(res.ok).toBe(true);
      expect(episodicService.clearProjectMemory).toHaveBeenCalled();
    });
  });

  describe("clear:all delegates to episodic service", () => {
    it("returns clear result", async () => {
      const episodicService = createMockEpisodicService();
      const { invoke } = createHarness({ episodicService });

      const res = await invoke("memory:clear:all", {
        confirmed: true,
      });
      expect(res.ok).toBe(true);
      expect(episodicService.clearAllMemory).toHaveBeenCalled();
    });
  });

  describe("semantic:distill delegates to episodic service", () => {
    it("returns distill result", async () => {
      const episodicService = createMockEpisodicService();
      const { invoke } = createHarness({ episodicService });

      const res = await invoke("memory:semantic:distill", {
        projectId: "p1",
        trigger: "manual",
      });
      expect(res.ok).toBe(true);
      expect(episodicService.distillSemanticMemory).toHaveBeenCalled();
    });
  });

  // ── Trace service ──

  describe("trace:get returns trace from trace service", () => {
    it("returns trace data", async () => {
      const traceService = createMockTraceService();
      const { invoke } = createHarness({ traceService });

      const res = await invoke("memory:trace:get", {
        projectId: "p1",
        generationId: "gen-1",
      });
      expect(res.ok).toBe(true);
      expect(traceService.getTrace).toHaveBeenCalledWith({
        projectId: "p1",
        generationId: "gen-1",
      });
    });
  });

  describe("trace:feedback records feedback", () => {
    it("returns accepted feedback", async () => {
      const traceService = createMockTraceService();
      const { invoke } = createHarness({ traceService });

      const res = await invoke("memory:trace:feedback", {
        projectId: "p1",
        generationId: "gen-1",
        verdict: "correct",
        reason: "Good output",
      });
      expect(res.ok).toBe(true);
      expect(traceService.recordFeedback).toHaveBeenCalledWith({
        projectId: "p1",
        generationId: "gen-1",
        verdict: "correct",
        reason: "Good output",
      });
    });
  });

  // ── Injected episodicService (no DB needed) ──

  describe("registers with injected episodicService", () => {
    it("episodic channels work without db when service injected", async () => {
      const episodicService = createMockEpisodicService();
      const { invoke } = createHarness({
        db: null,
        episodicService,
      });

      const res = await invoke("memory:episode:record", {
        projectId: "p1",
        sessionId: "s1",
        documentId: "d1",
        sceneType: "dialogue",
        skillUsed: "draft",
        userInput: "test",
        aiOutput: "output",
        userAction: "accept",
      });
      expect(res.ok).toBe(true);
      expect(episodicService.recordEpisode).toHaveBeenCalled();
    });

    it("entry channels still return DB_ERROR when db null", async () => {
      const episodicService = createMockEpisodicService();
      const { invoke } = createHarness({
        db: null,
        episodicService,
      });

      const res = await invoke("memory:entry:create", {
        type: "instruction",
        scope: "global",
        content: "test",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("DB_ERROR");
    });
  });
});
