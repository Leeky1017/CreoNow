/**
 * hybridRankingService — scoring weights, normalization, edge cases
 *
 * Covers: BM25/semantic/recency weight balance, score threshold filtering,
 * deterministic tie-breaking, explain target filtering, noop semantic retriever,
 * semantic timeout in semantic-only strategy.
 */
import { describe, it, expect, vi } from "vitest";

import type { Logger } from "../../../logging/logger";
import type { FtsSearchResult, FtsService } from "../ftsService";
import {
  createHybridRankingService,
  createNoopSemanticRetriever,
  type SemanticRetriever,
  type SemanticRetrieveItem,
} from "../hybridRankingService";

// ── helpers ──────────────────────────────────────────────────────────

function createLogger(): Logger {
  return { logPath: "<test>", info: vi.fn(), error: vi.fn() };
}

function makeFtsResult(overrides?: Partial<FtsSearchResult>): FtsSearchResult {
  return {
    projectId: "proj-1",
    documentId: "doc-1",
    documentTitle: "Doc",
    documentType: "chapter",
    snippet: "hello world",
    highlights: [{ start: 0, end: 5 }],
    anchor: { start: 0, end: 100 },
    documentOffset: 0,
    score: 5.0,
    updatedAt: 1_700_000_000,
    ...overrides,
  };
}

function makeSemanticItem(
  overrides?: Partial<SemanticRetrieveItem>,
): SemanticRetrieveItem {
  return {
    projectId: "proj-1",
    documentId: "doc-1",
    chunkId: "chunk-1",
    snippet: "hello world",
    score: 0.9,
    updatedAt: 1_700_000_000,
    ...overrides,
  };
}

function createFtsStub(
  results: FtsSearchResult[],
  hasMore = false,
): FtsService {
  return {
    search: () => ({
      ok: true as const,
      data: {
        results,
        total: results.length,
        hasMore,
        indexState: "ready" as const,
      },
    }),
    reindex: () => ({
      ok: true as const,
      data: { indexState: "ready" as const, reindexed: 0 },
    }),
    searchFulltext: () => ({
      ok: true as const,
      data: { items: [] },
    }),
  };
}

function createSemanticStub(items: SemanticRetrieveItem[]): SemanticRetriever {
  return { search: () => ({ ok: true as const, data: { items } }) };
}

// ── scoring weight verification ──────────────────────────────────────

describe("hybridRanking — score weights (0.55 BM25 / 0.35 semantic / 0.1 recency)", () => {
  it("FTS-only item has finalScore based on BM25 + recency only", () => {
    const svc = createHybridRankingService({
      ftsService: createFtsStub([
        makeFtsResult({ documentId: "d1", score: 10, updatedAt: 1_700_000_000 }),
      ]),
      semanticRetriever: createNoopSemanticRetriever(),
      logger: createLogger(),
    });

    const res = svc.queryByStrategy({
      projectId: "proj-1",
      query: "hello",
      strategy: "fts",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.results.length).toBe(1);
    const item = res.data.results[0];
    // Single FTS item: BM25 normalizes to 1.0, recency normalizes to 1.0
    // finalScore = 0.55 * 1.0 + 0.35 * 0.0 + 0.1 * 1.0 = 0.65
    expect(item.finalScore).toBeCloseTo(0.65, 2);
    expect(item.scoreBreakdown.bm25).toBe(1);
    expect(item.scoreBreakdown.semantic).toBe(0);
    expect(item.scoreBreakdown.recency).toBe(1);
  });

  it("semantic-only item scoring uses semantic + recency", () => {
    const svc = createHybridRankingService({
      ftsService: createFtsStub([]),
      semanticRetriever: createSemanticStub([
        makeSemanticItem({
          documentId: "s1",
          chunkId: "c1",
          score: 0.9,
          updatedAt: 1_700_000_000,
        }),
      ]),
      logger: createLogger(),
    });

    const res = svc.queryByStrategy({
      projectId: "proj-1",
      query: "hello",
      strategy: "semantic",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.results.length).toBe(1);
    const item = res.data.results[0];
    // Single semantic item: BM25=0, semantic=0.9 (raw), recency=1
    // finalScore = 0.55*0 + 0.35*0.9 + 0.1*1 = 0.415
    expect(item.finalScore).toBeCloseTo(0.415, 2);
    expect(item.scoreBreakdown.bm25).toBe(0);
    expect(item.scoreBreakdown.semantic).toBeCloseTo(0.9, 2);
  });
});

describe("hybridRanking — deterministic sort order", () => {
  it("breaks ties by updatedAt then documentId then chunkId", () => {
    const svc = createHybridRankingService({
      ftsService: createFtsStub([
        makeFtsResult({ documentId: "b-doc", score: 10, updatedAt: 1_700_000_000 }),
        makeFtsResult({ documentId: "a-doc", score: 10, updatedAt: 1_700_000_000 }),
      ]),
      semanticRetriever: createNoopSemanticRetriever(),
      logger: createLogger(),
    });

    const res = svc.queryByStrategy({
      projectId: "proj-1",
      query: "hello",
      strategy: "fts",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.results.length).toBe(2);
    // Same finalScore, same updatedAt → sort by documentId ascending
    expect(res.data.results[0].documentId).toBe("a-doc");
    expect(res.data.results[1].documentId).toBe("b-doc");
  });
});

describe("hybridRanking — rankExplain", () => {
  it("filters by specific documentId + chunkId", () => {
    const svc = createHybridRankingService({
      ftsService: createFtsStub([
        makeFtsResult({ documentId: "d1", score: 10, updatedAt: 1_700_000_001 }),
        makeFtsResult({ documentId: "d2", score: 8, updatedAt: 1_700_000_000 }),
      ]),
      semanticRetriever: createNoopSemanticRetriever(),
      logger: createLogger(),
    });

    const res = svc.rankExplain({
      projectId: "proj-1",
      query: "hello",
      strategy: "fts",
      documentId: "d1",
      chunkId: "fts:d1:0",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.explanations.length).toBe(1);
    expect(res.data.explanations[0].documentId).toBe("d1");
    // total is the count of all ranked items that pass the score threshold
    expect(res.data.total).toBeGreaterThanOrEqual(1);
  });

  it("returns paginated results when no target specified", () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      makeFtsResult({
        documentId: `d${i}`,
        score: 10,
        updatedAt: 1_700_000_000 + i,
      }),
    );
    const svc = createHybridRankingService({
      ftsService: createFtsStub(items),
      semanticRetriever: createNoopSemanticRetriever(),
      logger: createLogger(),
    });

    const res = svc.rankExplain({
      projectId: "proj-1",
      query: "hello",
      strategy: "fts",
      limit: 2,
      offset: 1,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.explanations.length).toBe(2);
    expect(res.data.total).toBe(5);
  });

  it("rejects when only documentId provided without chunkId", () => {
    const svc = createHybridRankingService({
      ftsService: createFtsStub([]),
      semanticRetriever: createNoopSemanticRetriever(),
      logger: createLogger(),
    });

    const res = svc.rankExplain({
      projectId: "proj-1",
      query: "hello",
      strategy: "fts",
      documentId: "d1",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
      expect(res.error.message).toContain("together");
    }
  });
});

describe("hybridRanking — noopSemanticRetriever", () => {
  it("always returns empty results", () => {
    const retriever = createNoopSemanticRetriever();
    const res = retriever.search({
      projectId: "proj-1",
      query: "hello",
      limit: 10,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.items).toEqual([]);
    }
  });
});

describe("hybridRanking — semantic timeout in semantic-only returns error", () => {
  it("returns SEARCH_TIMEOUT for semantic-only strategy on timeout", () => {
    const semantic: SemanticRetriever = {
      search: () => ({
        ok: false as const,
        error: { code: "TIMEOUT" as const, message: "timed out" },
      }),
    };

    const svc = createHybridRankingService({
      ftsService: createFtsStub([]),
      semanticRetriever: semantic,
      logger: createLogger(),
    });

    const res = svc.queryByStrategy({
      projectId: "proj-1",
      query: "hello",
      strategy: "semantic",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("SEARCH_TIMEOUT");
    }
  });
});

describe("hybridRanking — semantic non-timeout error in hybrid → degrades", () => {
  it("falls back to FTS on non-timeout semantic failure in hybrid", () => {
    const fts = createFtsStub([
      makeFtsResult({ documentId: "d1", score: 8 }),
    ]);
    const semantic: SemanticRetriever = {
      search: () => ({
        ok: false as const,
        error: { code: "INTERNAL" as const, message: "boom" },
      }),
    };

    const svc = createHybridRankingService({
      ftsService: fts,
      semanticRetriever: semantic,
      logger: createLogger(),
    });

    const res = svc.queryByStrategy({
      projectId: "proj-1",
      query: "hello",
      strategy: "hybrid",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.fallback).toBe("fts");
      expect(res.data.notice).toBeDefined();
      expect(res.data.results.length).toBeGreaterThan(0);
    }
  });
});

describe("hybridRanking — cross-project semantic → forbidden", () => {
  it("returns SEARCH_PROJECT_FORBIDDEN for mismatched projectId", () => {
    const semantic = createSemanticStub([
      makeSemanticItem({ projectId: "other-project", documentId: "d1" }),
    ]);

    const svc = createHybridRankingService({
      ftsService: createFtsStub([]),
      semanticRetriever: semantic,
      logger: createLogger(),
    });

    const res = svc.queryByStrategy({
      projectId: "proj-1",
      query: "hello",
      strategy: "semantic",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("SEARCH_PROJECT_FORBIDDEN");
    }
  });
});

describe("hybridRanking — FTS error propagation", () => {
  it("propagates FTS search errors", () => {
    const fts: FtsService = {
      search: () => ({
        ok: false as const,
        error: { code: "DB_ERROR" as const, message: "database locked" },
      }),
      reindex: () => ({
        ok: true as const,
        data: { indexState: "ready" as const, reindexed: 0 },
      }),
      searchFulltext: () => ({
        ok: true as const,
        data: { items: [] },
      }),
    };

    const svc = createHybridRankingService({
      ftsService: fts,
      semanticRetriever: createNoopSemanticRetriever(),
      logger: createLogger(),
    });

    const res = svc.queryByStrategy({
      projectId: "proj-1",
      query: "hello",
      strategy: "fts",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("DB_ERROR");
    }
  });
});

describe("hybridRanking — input validation edge cases", () => {
  it("rejects zero limit", () => {
    const svc = createHybridRankingService({
      ftsService: createFtsStub([]),
      semanticRetriever: createNoopSemanticRetriever(),
      logger: createLogger(),
    });

    const res = svc.queryByStrategy({
      projectId: "proj-1",
      query: "hello",
      strategy: "fts",
      limit: 0,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("rejects non-integer limit", () => {
    const svc = createHybridRankingService({
      ftsService: createFtsStub([]),
      semanticRetriever: createNoopSemanticRetriever(),
      logger: createLogger(),
    });

    const res = svc.queryByStrategy({
      projectId: "proj-1",
      query: "hello",
      strategy: "fts",
      limit: 1.5,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("rejects NaN offset", () => {
    const svc = createHybridRankingService({
      ftsService: createFtsStub([]),
      semanticRetriever: createNoopSemanticRetriever(),
      logger: createLogger(),
    });

    const res = svc.queryByStrategy({
      projectId: "proj-1",
      query: "hello",
      strategy: "fts",
      offset: NaN,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });
});

describe("hybridRanking — empty results", () => {
  it("returns empty results and hasMore=false for no candidates", () => {
    const svc = createHybridRankingService({
      ftsService: createFtsStub([]),
      semanticRetriever: createNoopSemanticRetriever(),
      logger: createLogger(),
    });

    const res = svc.queryByStrategy({
      projectId: "proj-1",
      query: "hello",
      strategy: "hybrid",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.results).toEqual([]);
      expect(res.data.total).toBe(0);
      expect(res.data.hasMore).toBe(false);
    }
  });
});

describe("hybridRanking — SEARCH_TIMEOUT adds traceId to details", () => {
  it("includes traceId and costMs in timeout error details", () => {
    const semantic: SemanticRetriever = {
      search: () => ({
        ok: false as const,
        error: { code: "SEARCH_TIMEOUT" as const, message: "timed out" },
      }),
    };

    const svc = createHybridRankingService({
      ftsService: createFtsStub([]),
      semanticRetriever: semantic,
      logger: createLogger(),
    });

    const res = svc.queryByStrategy({
      projectId: "proj-1",
      query: "hello",
      strategy: "semantic",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("SEARCH_TIMEOUT");
      const details = res.error.details as Record<string, unknown>;
      expect(details.traceId).toBeDefined();
      expect(typeof details.costMs).toBe("number");
    }
  });
});
