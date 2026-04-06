import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IpcMain } from "electron";
import { registerRagIpcHandlers } from "../rag";

vi.mock("../../config/runtimeGovernance", () => ({
  resolveRuntimeGovernanceFromEnv: vi.fn().mockReturnValue({
    rag: { maxTokens: 1500 },
  }),
}));

vi.mock("../../services/embedding/semanticChunkIndexService", () => ({
  createSemanticChunkIndexService: vi.fn().mockReturnValue({
    upsertDocument: vi.fn().mockReturnValue({ ok: true, data: {} }),
    search: vi.fn().mockReturnValue({
      ok: true,
      data: {
        chunks: [
          {
            chunkId: "c1",
            documentId: "d1",
            projectId: "p1",
            text: "chunk text",
            score: 0.9,
            updatedAt: 1000,
            startOffset: 0,
            endOffset: 10,
          },
        ],
      },
    }),
    reindexProject: vi.fn().mockReturnValue({
      ok: true,
      data: { indexedDocuments: 1, indexedChunks: 5, changedChunks: 2 },
    }),
  }),
}));

vi.mock("../../services/rag/hybridRagRanking", () => ({
  rankHybridRagCandidates: vi.fn().mockReturnValue([
    {
      documentId: "d1",
      chunkId: "c1",
      text: "chunk text",
      score: 0.9,
      tokenEstimate: 10,
    },
  ]),
  truncateHybridRagCandidates: vi.fn().mockReturnValue({
    chunks: [
      {
        chunkId: "c1",
        documentId: "d1",
        text: "chunk text",
        score: 0.9,
        tokenEstimate: 10,
      },
    ],
    truncated: false,
    usedTokens: 10,
  }),
}));

vi.mock("../../services/search/ftsService", () => ({
  createFtsService: vi.fn().mockReturnValue({
    searchFulltext: vi.fn().mockReturnValue({
      ok: true,
      data: {
        items: [
          {
            documentId: "d1",
            projectId: "p1",
            snippet: "fts result text",
            score: 0.85,
            title: "Doc1",
            updatedAt: 1000,
          },
        ],
      },
    }),
  }),
}));

type Handler = (event: unknown, payload: unknown, signal?: AbortSignal) => Promise<unknown>;

const EXPECTED_CHANNELS = [
  "rag:config:get",
  "rag:config:update",
  "rag:context:retrieve",
] as const;

function createMockEvent() {
  return { sender: { id: 1, send: vi.fn() } };
}

function createHarness(opts?: { db?: unknown }) {
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

  const stmtAll = vi.fn().mockReturnValue([
    { documentId: "d1", contentText: "hello world", updatedAt: 1000 },
  ]);

  const db =
    opts?.db === null
      ? null
      : (opts?.db ?? {
          prepare: vi.fn().mockReturnValue({
            get: vi.fn(),
            all: stmtAll,
            run: vi.fn(),
          }),
        });

  const embedding = {
    encode: vi.fn().mockReturnValue({
      ok: true,
      data: { vectors: [[0.1, 0.2]], dimension: 2 },
    }),
  };

  registerRagIpcHandlers({
    ipcMain,
    db: db as never,
    logger: logger as never,
    embedding: embedding as never,
    ragRerank: { enabled: false },
  });

  return {
    invoke: async (
      channel: string,
      payload?: unknown,
      signal?: AbortSignal,
    ): Promise<{
      ok: boolean;
      data?: unknown;
      error?: { code: string; message: string };
    }> => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return (await handler(createMockEvent(), payload, signal)) as {
        ok: boolean;
        data?: unknown;
        error?: { code: string; message: string };
      };
    },
    handlers,
    logger,
    db,
    embedding,
  };
}

describe("rag IPC handlers", () => {
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

  it("channel count matches expected", () => {
    const { handlers } = createHarness();
    expect(handlers.size).toBe(EXPECTED_CHANNELS.length);
  });

  // ── rag:config:get ──

  describe("rag:config:get", () => {
    it("returns default config", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:config:get");
      expect(res.ok).toBe(true);
      const data = res.data as { topK: number; minScore: number; maxTokens: number };
      expect(data.topK).toBe(5);
      expect(data.minScore).toBe(0.7);
      expect(data.maxTokens).toBe(1500);
    });
  });

  // ── rag:config:update ──

  describe("rag:config:update", () => {
    it("updates topK", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:config:update", { topK: 10 });
      expect(res.ok).toBe(true);
      const data = res.data as { topK: number };
      expect(data.topK).toBe(10);
    });

    it("rejects non-object payload", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:config:update", "invalid");
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects topK of wrong type", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:config:update", { topK: "five" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects minScore of wrong type", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:config:update", { minScore: "low" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects maxTokens of wrong type", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:config:update", { maxTokens: true });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects model of wrong type", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:config:update", { model: 123 });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("normalizes invalid topK to default", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:config:update", { topK: -1 });
      expect(res.ok).toBe(true);
      const data = res.data as { topK: number };
      expect(data.topK).toBe(5);
    });

    it("normalizes out-of-range minScore to default", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:config:update", { minScore: 2.0 });
      expect(res.ok).toBe(true);
      const data = res.data as { minScore: number };
      expect(data.minScore).toBe(0.7);
    });
  });

  // ── rag:context:retrieve ──

  describe("rag:context:retrieve", () => {
    it("returns DB_ERROR when db is null", async () => {
      const { invoke } = createHarness({ db: null });
      const res = await invoke("rag:context:retrieve", {
        projectId: "p1",
        queryText: "test",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("DB_ERROR");
    });

    it("rejects non-object payload", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:context:retrieve", "not-an-object");
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects missing projectId", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:context:retrieve", {
        queryText: "test",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects missing queryText", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:context:retrieve", {
        projectId: "p1",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects empty projectId", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:context:retrieve", {
        projectId: "",
        queryText: "test",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects empty queryText", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:context:retrieve", {
        projectId: "p1",
        queryText: "   ",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects topK of wrong type", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:context:retrieve", {
        projectId: "p1",
        queryText: "test",
        topK: "five",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects model of wrong type", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:context:retrieve", {
        projectId: "p1",
        queryText: "test",
        model: 123,
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("returns chunks on happy path (hybrid)", async () => {
      const { invoke } = createHarness();
      const res = await invoke("rag:context:retrieve", {
        projectId: "p1",
        queryText: "find something",
      });
      expect(res.ok).toBe(true);
      const data = res.data as { chunks: unknown[]; truncated: boolean; usedTokens: number };
      expect(data.chunks).toBeDefined();
      expect(typeof data.truncated).toBe("boolean");
      expect(typeof data.usedTokens).toBe("number");
    });

    it("falls back to FTS when semantic returns MODEL_NOT_READY", async () => {
      const { createSemanticChunkIndexService } = await import(
        "../../services/embedding/semanticChunkIndexService"
      );
      vi.mocked(createSemanticChunkIndexService).mockReturnValueOnce({
        upsertDocument: vi.fn().mockReturnValue({ ok: true, data: {} }),
        search: vi.fn().mockReturnValue({
          ok: false,
          error: { code: "MODEL_NOT_READY", message: "not ready" },
        }),
        reindexProject: vi.fn(),
      } as never);

      const { invoke } = createHarness();
      const res = await invoke("rag:context:retrieve", {
        projectId: "p1",
        queryText: "fallback test",
      });
      expect(res.ok).toBe(true);
      const data = res.data as { fallback?: { from: string; to: string } };
      expect(data.fallback?.from).toBe("semantic");
      expect(data.fallback?.to).toBe("fts");
    });
  });
});
