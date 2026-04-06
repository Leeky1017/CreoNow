import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IpcMain } from "electron";
import { registerEmbeddingIpcHandlers } from "../embedding";

vi.mock("../../services/embedding/embeddingComputeOffload", () => ({
  createEmbeddingComputeOffload: vi.fn().mockReturnValue({
    encode: vi.fn().mockResolvedValue({
      ok: true,
      data: { vectors: [[0.1]], dimension: 1 },
    }),
  }),
}));

const mockSemanticIndex = vi.hoisted(() => ({
  upsertDocument: vi.fn().mockReturnValue({ ok: true, data: {} }),
  search: vi.fn().mockReturnValue({
    ok: true,
    data: {
      chunks: [
        {
          chunkId: "c1",
          documentId: "d1",
          projectId: "p1",
          text: "found text",
          score: 0.92,
          startOffset: 0,
          endOffset: 10,
          updatedAt: 1000,
        },
      ],
    },
  }),
  reindexProject: vi.fn().mockReturnValue({
    ok: true,
    data: { indexedDocuments: 2, indexedChunks: 8, changedChunks: 3 },
  }),
}));

vi.mock("../../services/embedding/semanticChunkIndexService", () => ({
  createSemanticChunkIndexService: vi.fn().mockReturnValue(mockSemanticIndex),
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
            snippet: "fts snippet",
            score: 0.8,
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
  "embedding:text:generate",
  "embedding:semantic:search",
  "embedding:index:reindex",
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

  registerEmbeddingIpcHandlers({
    ipcMain,
    db: db as never,
    logger: logger as never,
    embedding: embedding as never,
    semanticIndex: mockSemanticIndex as never,
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
    embedding,
  };
}

describe("embedding IPC handlers", () => {
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

  // ── DB_ERROR when db is null ──

  describe("returns DB_ERROR when db is null", () => {
    it.each([...EXPECTED_CHANNELS])("%s → DB_ERROR", async (channel) => {
      const { invoke } = createHarness({ db: null });
      const res = await invoke(channel, {
        texts: ["hello"],
        projectId: "p1",
        queryText: "test",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("DB_ERROR");
    });
  });

  // ── embedding:text:generate ──

  describe("embedding:text:generate", () => {
    it("rejects invalid payload (missing texts)", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:text:generate", { something: true });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects texts with non-string elements", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:text:generate", { texts: [42] });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects model of wrong type", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:text:generate", {
        texts: ["hello"],
        model: 123,
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects non-object payload", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:text:generate", "text");
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("returns vectors on success (direct encode path)", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:text:generate", {
        texts: ["hello"],
      });
      expect(res.ok).toBe(true);
      const data = res.data as { vectors: number[][]; dimension: number };
      expect(data.vectors).toBeDefined();
      expect(data.dimension).toBe(2);
    });

    it("propagates encoding error", async () => {
      const { invoke, embedding } = createHarness();
      embedding.encode.mockReturnValueOnce({
        ok: false,
        error: { code: "MODEL_NOT_READY", message: "model loading" },
      });
      const res = await invoke("embedding:text:generate", {
        texts: ["hello"],
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("MODEL_NOT_READY");
    });
  });

  // ── embedding:semantic:search ──

  describe("embedding:semantic:search", () => {
    it("rejects non-object payload", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:semantic:search", null);
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects missing projectId", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:semantic:search", {
        queryText: "test",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects missing queryText", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:semantic:search", {
        projectId: "p1",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects empty projectId", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:semantic:search", {
        projectId: "  ",
        queryText: "test",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects empty queryText", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:semantic:search", {
        projectId: "p1",
        queryText: "",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("returns semantic results on success", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:semantic:search", {
        projectId: "p1",
        queryText: "find it",
      });
      expect(res.ok).toBe(true);
      const data = res.data as { mode: string; results: unknown[] };
      expect(data.mode).toBe("semantic");
      expect(data.results).toHaveLength(1);
    });

    it("falls back to FTS when semantic returns MODEL_NOT_READY", async () => {
      mockSemanticIndex.search.mockReturnValueOnce({
        ok: false,
        error: { code: "MODEL_NOT_READY", message: "not ready" },
      });
      const { invoke } = createHarness();
      const res = await invoke("embedding:semantic:search", {
        projectId: "p1",
        queryText: "fallback test",
      });
      expect(res.ok).toBe(true);
      const data = res.data as { mode: string; fallback: { from: string; to: string } };
      expect(data.mode).toBe("fts-fallback");
      expect(data.fallback.from).toBe("semantic");
      expect(data.fallback.to).toBe("fts");
    });

    it("detects cross-project in semantic results", async () => {
      mockSemanticIndex.search.mockReturnValueOnce({
        ok: true,
        data: {
          chunks: [
            {
              chunkId: "c1",
              documentId: "d1",
              projectId: "DIFFERENT_PROJECT",
              text: "leaked",
              score: 0.9,
              startOffset: 0,
              endOffset: 6,
            },
          ],
        },
      });
      const { invoke } = createHarness();
      const res = await invoke("embedding:semantic:search", {
        projectId: "p1",
        queryText: "cross project",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("SEARCH_PROJECT_FORBIDDEN");
    });

    it("isolates corrupted offsets", async () => {
      mockSemanticIndex.search.mockReturnValueOnce({
        ok: true,
        data: {
          chunks: [
            {
              chunkId: "bad1",
              documentId: "d1",
              projectId: "p1",
              text: "bad",
              score: 0.8,
              startOffset: -1,
              endOffset: 5,
            },
            {
              chunkId: "good1",
              documentId: "d1",
              projectId: "p1",
              text: "good",
              score: 0.85,
              startOffset: 0,
              endOffset: 4,
            },
          ],
        },
      });
      const { invoke, logger } = createHarness();
      const res = await invoke("embedding:semantic:search", {
        projectId: "p1",
        queryText: "test corruption",
      });
      expect(res.ok).toBe(true);
      const data = res.data as {
        results: unknown[];
        isolation?: { code: string; isolatedChunkIds: string[] };
      };
      expect(data.results).toHaveLength(1);
      expect(data.isolation?.code).toBe("SEARCH_DATA_CORRUPTED");
      expect(data.isolation?.isolatedChunkIds).toContain("bad1");
      expect(logger.error).toHaveBeenCalledWith(
        "embedding_data_corrupted_isolated",
        expect.objectContaining({ isolatedChunkIds: ["bad1"] }),
      );
    });

    it("rejects topK of wrong type", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:semantic:search", {
        projectId: "p1",
        queryText: "test",
        topK: "ten",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects model of wrong type", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:semantic:search", {
        projectId: "p1",
        queryText: "test",
        model: 123,
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });
  });

  // ── embedding:index:reindex ──

  describe("embedding:index:reindex", () => {
    it("rejects non-object payload", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:index:reindex", "bad");
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects missing projectId", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:index:reindex", {});
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects empty projectId", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:index:reindex", { projectId: "  " });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects batchSize of wrong type", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:index:reindex", {
        projectId: "p1",
        batchSize: "ten",
      });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INVALID_ARGUMENT");
    });

    it("returns reindex result on success", async () => {
      const { invoke } = createHarness();
      const res = await invoke("embedding:index:reindex", { projectId: "p1" });
      expect(res.ok).toBe(true);
      const data = res.data as {
        indexedDocuments: number;
        indexedChunks: number;
        changedChunks: number;
      };
      expect(data.indexedDocuments).toBe(2);
      expect(data.indexedChunks).toBe(8);
    });

    it("propagates reindex error", async () => {
      mockSemanticIndex.reindexProject.mockReturnValueOnce({
        ok: false,
        error: { code: "INTERNAL_ERROR", message: "reindex boom" },
      });
      const { invoke } = createHarness();
      const res = await invoke("embedding:index:reindex", { projectId: "p1" });
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe("INTERNAL_ERROR");
    });
  });
});
