import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRagService } from "../ragService";

vi.mock("../queryPlanner", () => ({
  planFtsQueries: vi.fn().mockReturnValue({
    queries: ["planned query 1", "planned query 2"],
  }),
}));

const mockFtsSearchFulltext = vi.fn();

vi.mock("../../search/ftsService", () => ({
  createFtsService: vi.fn().mockReturnValue({
    searchFulltext: (...args: unknown[]) => mockFtsSearchFulltext(...args),
  }),
}));

function createMockEmbedding() {
  return {
    encode: vi.fn().mockReturnValue({
      ok: true,
      data: {
        vectors: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [0.7, 0.8, 0.9]],
        dimension: 3,
      },
    }),
  };
}

function createMockCache() {
  const store = new Map<string, number[]>();
  return {
    get: vi.fn((key: string) => store.get(key) ?? undefined),
    set: vi.fn((key: string, val: number[]) => { store.set(key, val); }),
    delete: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    size: 0,
  };
}

function createHarness(opts?: {
  rerankEnabled?: boolean;
  rerankModel?: string;
}) {
  const embedding = createMockEmbedding();
  const cache = createMockCache();

  mockFtsSearchFulltext.mockReturnValue({
    ok: true,
    data: {
      items: [
        {
          documentId: "d1",
          projectId: "p1",
          snippet: "matching snippet",
          score: 0.85,
          title: "Doc 1",
          updatedAt: 1000,
        },
        {
          documentId: "d2",
          projectId: "p1",
          snippet: "another snippet",
          score: 0.75,
          title: "Doc 2",
          updatedAt: 900,
        },
      ],
    },
  });

  const db = {
    prepare: vi.fn().mockReturnValue({
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
      run: vi.fn(),
    }),
  };

  const logger = {
    logPath: "/dev/null",
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const svc = createRagService({
    db: db as never,
    logger: logger as never,
    embedding: embedding as never,
    embeddingCache: cache as never,
    rerank: {
      enabled: opts?.rerankEnabled ?? false,
      model: opts?.rerankModel,
    },
  });

  return { svc, embedding, cache, logger, db };
}

describe("RagService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Input validation ──

  describe("normalizeLimit", () => {
    it("uses default limit when undefined", () => {
      const { svc } = createHarness();
      const res = svc.retrieve({ projectId: "p1", queryText: "test" });
      expect(res.ok).toBe(true);
    });

    it("rejects non-integer limit", () => {
      const { svc } = createHarness();
      const res = svc.retrieve({
        projectId: "p1",
        queryText: "test",
        limit: 3.5,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("rejects zero limit", () => {
      const { svc } = createHarness();
      const res = svc.retrieve({
        projectId: "p1",
        queryText: "test",
        limit: 0,
      });
      expect(res.ok).toBe(false);
    });

    it("rejects negative limit", () => {
      const { svc } = createHarness();
      const res = svc.retrieve({
        projectId: "p1",
        queryText: "test",
        limit: -1,
      });
      expect(res.ok).toBe(false);
    });

    it("rejects limit exceeding MAX_LIMIT", () => {
      const { svc } = createHarness();
      const res = svc.retrieve({
        projectId: "p1",
        queryText: "test",
        limit: 999,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.message).toContain("too large");
      }
    });

    it("accepts valid limit", () => {
      const { svc } = createHarness();
      const res = svc.retrieve({
        projectId: "p1",
        queryText: "test",
        limit: 5,
      });
      expect(res.ok).toBe(true);
    });
  });

  describe("normalizeBudgetTokens", () => {
    it("uses default budgetTokens when undefined", () => {
      const { svc } = createHarness();
      const res = svc.retrieve({ projectId: "p1", queryText: "test" });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.diagnostics.budgetTokens).toBe(800);
      }
    });

    it("rejects non-integer budgetTokens", () => {
      const { svc } = createHarness();
      const res = svc.retrieve({
        projectId: "p1",
        queryText: "test",
        budgetTokens: 100.5,
      });
      expect(res.ok).toBe(false);
    });

    it("rejects too small budgetTokens", () => {
      const { svc } = createHarness();
      const res = svc.retrieve({
        projectId: "p1",
        queryText: "test",
        budgetTokens: 10,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.message).toContain("too small");
      }
    });

    it("rejects too large budgetTokens", () => {
      const { svc } = createHarness();
      const res = svc.retrieve({
        projectId: "p1",
        queryText: "test",
        budgetTokens: 99999,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.message).toContain("too large");
      }
    });

    it("accepts valid budgetTokens", () => {
      const { svc } = createHarness();
      const res = svc.retrieve({
        projectId: "p1",
        queryText: "test",
        budgetTokens: 500,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.diagnostics.budgetTokens).toBe(500);
      }
    });
  });

  // ── Retrieve happy path ──

  describe("retrieve", () => {
    it("returns items with diagnostics", () => {
      const { svc } = createHarness();
      const res = svc.retrieve({ projectId: "p1", queryText: "test query" });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(Array.isArray(res.data.items)).toBe(true);
        expect(res.data.diagnostics).toBeDefined();
        expect(res.data.diagnostics.mode).toBe("fulltext");
        expect(res.data.diagnostics.planner).toBeDefined();
        expect(res.data.diagnostics.rerank.enabled).toBe(false);
      }
    });

    it("items contain sourceRef, snippet, and score", () => {
      const { svc } = createHarness();
      const res = svc.retrieve({ projectId: "p1", queryText: "test" });
      expect(res.ok).toBe(true);
      if (res.ok && res.data.items.length > 0) {
        const item = res.data.items[0];
        expect(item.sourceRef).toContain("doc:");
        expect(item.snippet).toBeDefined();
        expect(typeof item.score).toBe("number");
      }
    });

    it("diagnostics include planner info", () => {
      const { svc } = createHarness();
      const res = svc.retrieve({ projectId: "p1", queryText: "test" });
      expect(res.ok).toBe(true);
      if (res.ok) {
        const planner = res.data.diagnostics.planner;
        expect(planner.queries).toBeDefined();
        expect(planner.perQueryHits).toBeDefined();
        expect(typeof planner.selectedQuery).toBe("string");
      }
    });
  });

  // ── FTS error propagation ──

  describe("FTS error propagation", () => {
    it("propagates first query FTS error when all planned queries fail", async () => {
      const { planFtsQueries } = vi.mocked(
        await import("../queryPlanner"),
      );
      planFtsQueries.mockReturnValueOnce({ queries: ["single query"] });

      const { svc } = createHarness();

      // Override AFTER createHarness which sets default success mock
      mockFtsSearchFulltext.mockReturnValue({
        ok: false,
        error: { code: "SEARCH_ERROR", message: "FTS crashed" },
      });

      const res = svc.retrieve({ projectId: "p1", queryText: "test" });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe("SEARCH_ERROR");
      }
    });

    it("tolerates secondary query FTS errors", () => {
      let callCount = 0;
      mockFtsSearchFulltext.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            data: {
              items: [
                {
                  documentId: "d1",
                  projectId: "p1",
                  snippet: "first",
                  score: 0.9,
                  title: "Doc 1",
                  updatedAt: 1000,
                },
              ],
            },
          };
        }
        return {
          ok: false,
          error: { code: "SEARCH_ERROR", message: "secondary fail" },
        };
      });
      const { svc } = createHarness();
      const res = svc.retrieve({ projectId: "p1", queryText: "test" });
      expect(res.ok).toBe(true);
    });
  });

  // ── Rerank ──

  describe("reranking", () => {
    it("enables rerank when configured", () => {
      const { svc } = createHarness({ rerankEnabled: true });
      const res = svc.retrieve({ projectId: "p1", queryText: "test" });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.diagnostics.mode).toBe("fulltext_reranked");
        expect(res.data.diagnostics.rerank.enabled).toBe(true);
      }
    });

    it("falls back to FTS scores when encoding fails", () => {
      const { svc, embedding } = createHarness({ rerankEnabled: true });
      embedding.encode.mockReturnValue({
        ok: false,
        error: { code: "MODEL_NOT_READY", message: "not ready" },
      });
      const res = svc.retrieve({ projectId: "p1", queryText: "test" });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.diagnostics.rerank.reason).toBe("MODEL_NOT_READY");
      }
    });

    it("disabled rerank reports reason", () => {
      const { svc } = createHarness({ rerankEnabled: false });
      const res = svc.retrieve({ projectId: "p1", queryText: "test" });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.diagnostics.rerank.reason).toBe("DISABLED");
      }
    });
  });

  // ── Empty results ──

  describe("empty results", () => {
    it("returns empty items when FTS returns no results for all queries", () => {
      const { svc } = createHarness();

      // Override AFTER createHarness
      mockFtsSearchFulltext.mockReturnValue({
        ok: true,
        data: { items: [] },
      });

      const res = svc.retrieve({ projectId: "p1", queryText: "nothing" });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.items).toHaveLength(0);
        expect(res.data.diagnostics.planner.selectedCount).toBe(0);
      }
    });
  });

  // ── Deduplication ──

  describe("deduplication", () => {
    it("deduplicates results with same sourceRef", () => {
      mockFtsSearchFulltext.mockReturnValue({
        ok: true,
        data: {
          items: [
            {
              documentId: "d1",
              projectId: "p1",
              snippet: "same doc snippet 1",
              score: 0.9,
              title: "Doc 1",
              updatedAt: 1000,
            },
            {
              documentId: "d1",
              projectId: "p1",
              snippet: "same doc snippet 2",
              score: 0.8,
              title: "Doc 1",
              updatedAt: 1000,
            },
          ],
        },
      });
      const { svc } = createHarness();
      const res = svc.retrieve({ projectId: "p1", queryText: "test" });
      expect(res.ok).toBe(true);
      if (res.ok) {
        const refs = res.data.items.map((i) => i.sourceRef);
        expect(new Set(refs).size).toBe(refs.length);
      }
    });
  });
});
