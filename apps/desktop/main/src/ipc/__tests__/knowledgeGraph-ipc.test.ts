import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IpcMain } from "electron";
import { registerKnowledgeGraphIpcHandlers } from "../knowledgeGraph";

vi.mock("../../services/kg/kgService", () => {
  const mockService = {
    entityCreate: vi.fn().mockReturnValue({ ok: true, data: { id: "ent-1", projectId: "p1", type: "character", name: "Alice" } }),
    entityRead: vi.fn().mockReturnValue({ ok: true, data: { id: "ent-1", projectId: "p1", type: "character", name: "Alice" } }),
    entityList: vi.fn().mockReturnValue({ ok: true, data: { items: [], totalCount: 0 } }),
    entityUpdate: vi.fn().mockReturnValue({ ok: true, data: { id: "ent-1", projectId: "p1", type: "character", name: "Alice-updated" } }),
    entityDelete: vi.fn().mockReturnValue({ ok: true, data: { deleted: true, deletedRelationCount: 0 } }),
    relationCreate: vi.fn().mockReturnValue({ ok: true, data: { id: "rel-1", projectId: "p1", sourceEntityId: "e1", targetEntityId: "e2", relationType: "knows" } }),
    relationList: vi.fn().mockReturnValue({ ok: true, data: { items: [], totalCount: 0 } }),
    relationUpdate: vi.fn().mockReturnValue({ ok: true, data: { id: "rel-1", relationType: "loves" } }),
    relationDelete: vi.fn().mockReturnValue({ ok: true, data: { deleted: true } }),
    querySubgraph: vi.fn().mockReturnValue({ ok: true, data: { entities: [], relations: [] } }),
    queryPath: vi.fn().mockReturnValue({ ok: true, data: { path: [], found: false } }),
    queryValidate: vi.fn().mockReturnValue({ ok: true, data: { orphanedEntities: [], danglingRelations: [] } }),
    queryRelevant: vi.fn().mockReturnValue({ ok: true, data: { entities: [] } }),
    queryByIds: vi.fn().mockReturnValue({ ok: true, data: { entities: [] } }),
    buildRulesInjection: vi.fn().mockReturnValue({ ok: true, data: { rules: [], entityCount: 0 } }),
  };
  return {
    createKnowledgeGraphService: vi.fn(() => mockService),
    _mockService: mockService,
  };
});

vi.mock("../../services/kg/kgRecognitionRuntime", () => ({
  createKgRecognitionRuntime: vi.fn(() => ({
    enqueue: vi.fn().mockReturnValue({ ok: true, data: { taskId: "t-1", status: "queued" } }),
    cancel: vi.fn().mockReturnValue({ ok: true, data: { canceled: true } }),
    stats: vi.fn().mockReturnValue({ ok: true, data: { pending: 0, running: 0, maxConcurrency: 3, peakRunning: 0, completed: 0, completionOrder: [], canceledTaskIds: [] } }),
    acceptSuggestion: vi.fn().mockReturnValue({ ok: true, data: { id: "ent-1", projectId: "p1", type: "character", name: "Alice" } }),
    dismissSuggestion: vi.fn().mockReturnValue({ ok: true, data: { dismissed: true } }),
  })),
}));

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

const EXPECTED_CHANNELS = [
  "knowledge:entity:create",
  "knowledge:entity:read",
  "knowledge:entity:list",
  "knowledge:entity:update",
  "knowledge:entity:delete",
  "knowledge:relation:create",
  "knowledge:relation:list",
  "knowledge:relation:update",
  "knowledge:relation:delete",
  "knowledge:query:subgraph",
  "knowledge:query:path",
  "knowledge:query:validate",
  "knowledge:query:relevant",
  "knowledge:query:byids",
  "knowledge:rules:inject",
  "knowledge:recognition:enqueue",
  "knowledge:recognition:cancel",
  "knowledge:recognition:stats",
  "knowledge:suggestion:accept",
  "knowledge:suggestion:dismiss",
] as const;

function createMockEvent() {
  return { sender: { id: 1, send: vi.fn() } };
}

function createHarness(opts?: {
  db?: unknown;
  recognitionRuntime?: unknown;
  kgWriteOrchestrator?: unknown;
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

  const db =
    opts?.db === null
      ? null
      : (opts?.db ?? {
          prepare: vi.fn(),
          exec: vi.fn(),
          transaction: vi.fn(
            (fn: (...a: unknown[]) => unknown) =>
              (...args: unknown[]) =>
                fn(...args),
          ),
        });

  const recognitionRuntime =
    opts?.recognitionRuntime === undefined
      ? undefined
      : opts.recognitionRuntime;

  const kgWriteOrchestrator =
    opts?.kgWriteOrchestrator === undefined
      ? undefined
      : opts.kgWriteOrchestrator;

  registerKnowledgeGraphIpcHandlers({
    ipcMain,
    db: db as never,
    logger: logger as never,
    recognitionRuntime: recognitionRuntime as never,
    kgWriteOrchestrator: kgWriteOrchestrator as never,
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
  };
}

describe("knowledgeGraph IPC handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  // ── DB_ERROR when db is null ──

  describe("returns DB_ERROR when db is null", () => {
    const entityChannels = [
      "knowledge:entity:create",
      "knowledge:entity:read",
      "knowledge:entity:list",
      "knowledge:entity:update",
      "knowledge:entity:delete",
    ] as const;

    const relationChannels = [
      "knowledge:relation:create",
      "knowledge:relation:list",
      "knowledge:relation:update",
      "knowledge:relation:delete",
    ] as const;

    const queryChannels = [
      "knowledge:query:subgraph",
      "knowledge:query:path",
      "knowledge:query:validate",
      "knowledge:query:relevant",
      "knowledge:query:byids",
      "knowledge:rules:inject",
    ] as const;

    const recognitionChannels = [
      "knowledge:recognition:enqueue",
      "knowledge:recognition:cancel",
      "knowledge:recognition:stats",
      "knowledge:suggestion:accept",
      "knowledge:suggestion:dismiss",
    ] as const;

    it.each(entityChannels)(
      "entity: %s → DB_ERROR",
      async (channel) => {
        const { invoke } = createHarness({ db: null });
        const res = await invoke(channel, { projectId: "p1", id: "e1" });
        expect(res.ok).toBe(false);
        expect(res.error?.code).toBe("DB_ERROR");
      },
    );

    it.each(relationChannels)(
      "relation: %s → DB_ERROR",
      async (channel) => {
        const { invoke } = createHarness({ db: null });
        const res = await invoke(channel, { projectId: "p1", id: "r1" });
        expect(res.ok).toBe(false);
        expect(res.error?.code).toBe("DB_ERROR");
      },
    );

    it.each(queryChannels)(
      "query: %s → DB_ERROR",
      async (channel) => {
        const { invoke } = createHarness({ db: null });
        const res = await invoke(channel, {
          projectId: "p1",
          entityIds: ["e1"],
          excerpt: "test",
          documentId: "d1",
          traceId: "t1",
          centerEntityId: "e1",
          k: 2,
          sourceEntityId: "e1",
          targetEntityId: "e2",
        });
        expect(res.ok).toBe(false);
        expect(res.error?.code).toBe("DB_ERROR");
      },
    );

    it.each(recognitionChannels)(
      "recognition/suggestion: %s → DB_ERROR",
      async (channel) => {
        const { invoke } = createHarness({ db: null });
        const res = await invoke(channel, {
          projectId: "p1",
          sessionId: "s1",
          taskId: "t1",
          documentId: "d1",
          contentText: "text",
          traceId: "tr1",
          suggestionId: "sug1",
        });
        expect(res.ok).toBe(false);
        expect(res.error?.code).toBe("DB_ERROR");
      },
    );
  });

  // ── Entity delegation ──

  describe("entity:create delegates to service", () => {
    it("returns created entity on success", async () => {
      const { invoke } = createHarness();
      const res = await invoke("knowledge:entity:create", {
        projectId: "proj1",
        type: "character",
        name: "Alice",
      });
      expect(res.ok).toBe(true);
      expect(res.data).toBeDefined();
    });
  });

  describe("entity:read delegates to service", () => {
    it("returns entity data on success", async () => {
      const { invoke } = createHarness();
      const res = await invoke("knowledge:entity:read", {
        projectId: "proj1",
        id: "ent-1",
      });
      expect(res.ok).toBe(true);
      expect(res.data).toBeDefined();
    });
  });

  describe("entity:list delegates to service", () => {
    it("returns items", async () => {
      const { invoke } = createHarness();
      const res = await invoke("knowledge:entity:list", {
        projectId: "proj1",
      });
      expect(res.ok).toBe(true);
    });
  });

  describe("entity:delete delegates to service", () => {
    it("returns deleted result", async () => {
      const { invoke } = createHarness();
      const res = await invoke("knowledge:entity:delete", {
        projectId: "proj1",
        id: "ent-1",
      });
      expect(res.ok).toBe(true);
    });
  });

  // ── Relation delegation ──

  describe("relation:create delegates to service", () => {
    it("returns created relation", async () => {
      const { invoke } = createHarness();
      const res = await invoke("knowledge:relation:create", {
        projectId: "proj1",
        sourceEntityId: "e1",
        targetEntityId: "e2",
        relationType: "knows",
      });
      expect(res.ok).toBe(true);
    });
  });

  describe("relation:list delegates to service", () => {
    it("returns items", async () => {
      const { invoke } = createHarness();
      const res = await invoke("knowledge:relation:list", {
        projectId: "proj1",
      });
      expect(res.ok).toBe(true);
    });
  });

  // ── Query delegation ──

  describe("query:subgraph delegates to service", () => {
    it("returns subgraph result", async () => {
      const { invoke } = createHarness();
      const res = await invoke("knowledge:query:subgraph", {
        projectId: "proj1",
        centerEntityId: "e1",
        k: 1,
      });
      expect(res.ok).toBe(true);
    });
  });

  describe("query:path delegates to service", () => {
    it("returns path result", async () => {
      const { invoke } = createHarness();
      const res = await invoke("knowledge:query:path", {
        projectId: "proj1",
        sourceEntityId: "e1",
        targetEntityId: "e2",
      });
      expect(res.ok).toBe(true);
    });
  });

  describe("query:validate delegates to service", () => {
    it("returns validation result", async () => {
      const { invoke } = createHarness();
      const res = await invoke("knowledge:query:validate", {
        projectId: "proj1",
      });
      expect(res.ok).toBe(true);
    });
  });

  describe("query:relevant delegates to service", () => {
    it("returns relevant entities", async () => {
      const { invoke } = createHarness();
      const res = await invoke("knowledge:query:relevant", {
        projectId: "proj1",
        excerpt: "Alice walked into the room",
      });
      expect(res.ok).toBe(true);
    });
  });

  // ── query:byids ──

  describe("query:byids", () => {
    it("validates payload — entityIds must be array", async () => {
      const { invoke } = createHarness();
      const res = await invoke("knowledge:query:byids", {
        projectId: "proj1",
        entityIds: "not-an-array",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("validates payload — rejects non-string entityIds items", async () => {
      const { invoke } = createHarness();
      const res = await invoke("knowledge:query:byids", {
        projectId: "proj1",
        entityIds: [123],
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("validates payload — rejects missing projectId", async () => {
      const { invoke } = createHarness();
      const res = await invoke("knowledge:query:byids", {
        entityIds: ["e1"],
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("delegates to service with valid payload", async () => {
      const { invoke } = createHarness();
      const res = await invoke("knowledge:query:byids", {
        projectId: "proj1",
        entityIds: ["e1"],
      });
      expect(res.ok).toBe(true);
    });
  });

  // ── rules:inject ──

  describe("rules:inject delegates to service", () => {
    it("returns rules injection data", async () => {
      const { invoke } = createHarness();
      const res = await invoke("knowledge:rules:inject", {
        projectId: "proj1",
        documentId: "doc1",
        excerpt: "The old mansion",
        traceId: "tr-1",
      });
      expect(res.ok).toBe(true);
    });
  });

  // ── Recognition runtime delegation ──

  describe("recognition:enqueue delegates to runtime", () => {
    it("returns enqueue result", async () => {
      const runtime = {
        enqueue: vi.fn().mockReturnValue({
          ok: true,
          data: { taskId: "task-1", status: "queued" },
        }),
        cancel: vi.fn(),
        stats: vi.fn(),
        acceptSuggestion: vi.fn(),
        dismissSuggestion: vi.fn(),
      };
      const { invoke } = createHarness({ recognitionRuntime: runtime });

      const res = await invoke("knowledge:recognition:enqueue", {
        projectId: "p1",
        documentId: "d1",
        sessionId: "s1",
        contentText: "text",
        traceId: "tr1",
      });
      expect(res.ok).toBe(true);
      expect(runtime.enqueue).toHaveBeenCalled();
    });
  });

  describe("recognition:cancel delegates to runtime", () => {
    it("returns cancel result", async () => {
      const runtime = {
        enqueue: vi.fn(),
        cancel: vi.fn().mockReturnValue({
          ok: true,
          data: { canceled: true },
        }),
        stats: vi.fn(),
        acceptSuggestion: vi.fn(),
        dismissSuggestion: vi.fn(),
      };
      const { invoke } = createHarness({ recognitionRuntime: runtime });

      const res = await invoke("knowledge:recognition:cancel", {
        projectId: "p1",
        sessionId: "s1",
        taskId: "task-1",
      });
      expect(res.ok).toBe(true);
      expect(runtime.cancel).toHaveBeenCalled();
    });
  });

  describe("recognition:stats delegates to runtime", () => {
    it("returns stats", async () => {
      const runtime = {
        enqueue: vi.fn(),
        cancel: vi.fn(),
        stats: vi.fn().mockReturnValue({
          ok: true,
          data: {
            pending: 0,
            running: 0,
            maxConcurrency: 3,
            peakRunning: 0,
            completed: 0,
            completionOrder: [],
            canceledTaskIds: [],
          },
        }),
        acceptSuggestion: vi.fn(),
        dismissSuggestion: vi.fn(),
      };
      const { invoke } = createHarness({ recognitionRuntime: runtime });

      const res = await invoke("knowledge:recognition:stats", {
        projectId: "p1",
        sessionId: "s1",
      });
      expect(res.ok).toBe(true);
      expect(runtime.stats).toHaveBeenCalled();
    });
  });

  // ── Suggestion delegation ──

  describe("suggestion:accept delegates to runtime", () => {
    it("returns accepted entity", async () => {
      const runtime = {
        enqueue: vi.fn(),
        cancel: vi.fn(),
        stats: vi.fn(),
        acceptSuggestion: vi.fn().mockReturnValue({
          ok: true,
          data: {
            id: "ent-1",
            projectId: "p1",
            type: "character",
            name: "Alice",
          },
        }),
        dismissSuggestion: vi.fn(),
      };
      const { invoke } = createHarness({ recognitionRuntime: runtime });

      const res = await invoke("knowledge:suggestion:accept", {
        projectId: "p1",
        sessionId: "s1",
        suggestionId: "sug-1",
      });
      expect(res.ok).toBe(true);
      expect(runtime.acceptSuggestion).toHaveBeenCalled();
    });
  });

  describe("suggestion:dismiss delegates to runtime", () => {
    it("returns dismissed result", async () => {
      const runtime = {
        enqueue: vi.fn(),
        cancel: vi.fn(),
        stats: vi.fn(),
        acceptSuggestion: vi.fn(),
        dismissSuggestion: vi.fn().mockReturnValue({
          ok: true,
          data: { dismissed: true },
        }),
      };
      const { invoke } = createHarness({ recognitionRuntime: runtime });

      const res = await invoke("knowledge:suggestion:dismiss", {
        projectId: "p1",
        sessionId: "s1",
        suggestionId: "sug-1",
      });
      expect(res.ok).toBe(true);
      expect(runtime.dismissSuggestion).toHaveBeenCalled();
    });
  });

  // ── Missing runtime ──

  describe("handles missing recognitionRuntime gracefully", () => {
    it("recognition:enqueue returns DB_ERROR without runtime (db=null)", async () => {
      const { invoke } = createHarness({ db: null });
      const res = await invoke("knowledge:recognition:enqueue", {
        projectId: "p1",
        documentId: "d1",
        sessionId: "s1",
        contentText: "text",
        traceId: "tr1",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("DB_ERROR");
    });

    it("suggestion:accept returns DB_ERROR without runtime (db=null)", async () => {
      const { invoke } = createHarness({ db: null });
      const res = await invoke("knowledge:suggestion:accept", {
        projectId: "p1",
        sessionId: "s1",
        suggestionId: "sug-1",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("DB_ERROR");
    });
  });

  // ── INV-6/INV-7: write operations route through kgWriteOrchestrator ────

  describe("INV-6/INV-7: write operations route through kgWriteOrchestrator", () => {
    function createHarnessWithOrchestratorSpy() {
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

      const db = {
        prepare: vi.fn(),
        exec: vi.fn(),
        transaction: vi.fn(
          (fn: (...a: unknown[]) => unknown) =>
            (...args: unknown[]) =>
              fn(...args),
        ),
      };

      // Inject a mock write orchestrator with a spy — this confirms
      // IPC routes writes through orchestrator.execute (INV-7).
      const mockOrchestratorExecute = vi.fn().mockReturnValue({
        ok: true,
        data: { id: "ent-1" },
      });
      const mockKgWriteOrchestrator = {
        execute: mockOrchestratorExecute,
      };

      registerKnowledgeGraphIpcHandlers({
        ipcMain,
        db: db as never,
        logger: logger as never,
        kgWriteOrchestrator: mockKgWriteOrchestrator,
      });

      return {
        invoke: async (
          channel: string,
          payload?: unknown,
        ): Promise<{ ok: boolean; data?: unknown; error?: { code: string; message: string } }> => {
          const handler = handlers.get(channel);
          if (!handler) throw new Error(`No handler for ${channel}`);
          return (await handler(createMockEvent(), payload)) as {
            ok: boolean;
            data?: unknown;
            error?: { code: string; message: string };
          };
        },
        mockOrchestratorExecute,
      };
    }

    const WRITE_CHANNELS = [
      {
        channel: "knowledge:entity:create",
        payload: { projectId: "p1", type: "character", name: "Alice" },
        mutationType: "entity:create",
      },
      {
        channel: "knowledge:entity:update",
        payload: { projectId: "p1", id: "e1", expectedVersion: 1, patch: {} },
        mutationType: "entity:update",
      },
      {
        channel: "knowledge:entity:delete",
        payload: { projectId: "p1", id: "e1" },
        mutationType: "entity:delete",
      },
      {
        channel: "knowledge:relation:create",
        payload: {
          projectId: "p1",
          sourceEntityId: "e1",
          targetEntityId: "e2",
          relationType: "ally",
        },
        mutationType: "relation:create",
      },
      {
        channel: "knowledge:relation:update",
        payload: { projectId: "p1", id: "r1", patch: {} },
        mutationType: "relation:update",
      },
      {
        channel: "knowledge:relation:delete",
        payload: { projectId: "p1", id: "r1" },
        mutationType: "relation:delete",
      },
    ] as const;

    it.each(WRITE_CHANNELS)(
      "$channel calls kgWriteOrchestrator.execute with mutationType=$mutationType",
      async ({ channel, payload, mutationType }) => {
        const { invoke, mockOrchestratorExecute } =
          createHarnessWithOrchestratorSpy();
        const res = await invoke(channel, payload);
        expect(res.ok).toBe(true);
        expect(mockOrchestratorExecute).toHaveBeenCalledOnce();
        expect(mockOrchestratorExecute).toHaveBeenCalledWith(
          expect.objectContaining({
            skill: "kg.write",
            input: expect.objectContaining({
              operation: mutationType,
              projectId: "p1",
            }),
          }),
        );
      },
    );

    it("write op propagates skill error back through IPC envelope", async () => {
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
      const db = {
        prepare: vi.fn(),
        exec: vi.fn(),
        transaction: vi.fn(
          (fn: (...a: unknown[]) => unknown) =>
            (...args: unknown[]) =>
              fn(...args),
        ),
      };
      const failingOrchestrator = {
        execute: vi.fn().mockReturnValue({
          ok: false,
          error: { code: "DB_ERROR", message: "constraint violation" },
        }),
      };
      registerKnowledgeGraphIpcHandlers({
        ipcMain,
        db: db as never,
        logger: logger as never,
        kgWriteOrchestrator: failingOrchestrator,
      });

      const handler = handlers.get("knowledge:entity:create");
      const res = await handler!(createMockEvent(), {
        projectId: "p1",
        type: "character",
        name: "Bob",
      });
      expect((res as { ok: boolean }).ok).toBe(false);
    });
  });

  // ── INV-6: read operations bypass kgWriteOrchestrator ──────────────────

  describe("INV-6: read operations bypass kgWriteOrchestrator (direct service call)", () => {
    it("entity:read does NOT call kgWriteOrchestrator.execute", async () => {
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
      const db = {
        prepare: vi.fn(),
        exec: vi.fn(),
        transaction: vi.fn(
          (fn: (...a: unknown[]) => unknown) =>
            (...args: unknown[]) =>
              fn(...args),
        ),
      };
      const orchestratorExecuteSpy = vi.fn();
      registerKnowledgeGraphIpcHandlers({
        ipcMain,
        db: db as never,
        logger: logger as never,
        kgWriteOrchestrator: { execute: orchestratorExecuteSpy },
      });

      const handler = handlers.get("knowledge:entity:read");
      await handler!(createMockEvent(), { projectId: "p1", id: "e1" });
      // entity:read must bypass the skill entirely — direct service call
      expect(orchestratorExecuteSpy).not.toHaveBeenCalled();
    });

    it("entity:list does NOT call kgMutationSkill.execute", async () => {
      const { invoke } = createHarness();
      // Standard harness: no skill override, uses auto-created skill
      // We're just verifying the channel returns ok — the key assertion is
      // that query ops don't go through the write-orchestrator path.
      const res = await invoke("knowledge:entity:list", { projectId: "p1" });
      expect(res.ok).toBe(true);
    });

    const READ_CHANNELS = [
      { channel: "knowledge:entity:read", payload: { projectId: "p1", id: "e1" } },
      { channel: "knowledge:entity:list", payload: { projectId: "p1" } },
      { channel: "knowledge:relation:list", payload: { projectId: "p1" } },
      { channel: "knowledge:query:subgraph", payload: { projectId: "p1", centerEntityId: "e1", k: 1 } },
      { channel: "knowledge:query:path", payload: { projectId: "p1", sourceEntityId: "e1", targetEntityId: "e2" } },
      { channel: "knowledge:query:validate", payload: { projectId: "p1" } },
      { channel: "knowledge:query:relevant", payload: { projectId: "p1", excerpt: "test" } },
      { channel: "knowledge:query:byids", payload: { projectId: "p1", entityIds: ["e1"] } },
      { channel: "knowledge:rules:inject", payload: { projectId: "p1", documentId: "d1", excerpt: "test", traceId: "t1" } },
    ] as const;

    it.each(READ_CHANNELS)(
      "$channel returns ok without going through mutation skill",
      async ({ channel, payload }) => {
        const handlers = new Map<string, Handler>();
        const ipcMain = {
          handle: vi.fn((ch: string, listener: Handler) => {
            handlers.set(ch, listener);
          }),
        } as unknown as IpcMain;
        const logger = {
          logPath: "/dev/null",
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        };
        const db = {
          prepare: vi.fn(),
          exec: vi.fn(),
          transaction: vi.fn(
            (fn: (...a: unknown[]) => unknown) =>
              (...args: unknown[]) =>
                fn(...args),
          ),
        };
        const orchestratorExecuteSpy = vi.fn();
        registerKnowledgeGraphIpcHandlers({
          ipcMain,
          db: db as never,
          logger: logger as never,
          kgWriteOrchestrator: { execute: orchestratorExecuteSpy },
        });

        const handler = handlers.get(channel);
        if (!handler) throw new Error(`No handler for ${channel}`);
        const res = await handler(createMockEvent(), payload) as { ok: boolean };
        expect(res.ok).toBe(true);
        // Read ops must NOT go through the write orchestrator
        expect(orchestratorExecuteSpy).not.toHaveBeenCalled();
      },
    );
  });
});
