import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  containsCjk,
  expandCjkQuery,
  normalizeFtsQuery,
  normalizeFtsProjectId,
  normalizeFtsLimit,
  normalizeFtsOffset,
  isFtsSyntaxError,
  isFtsCorruptionError,
  isReindexIoError,
  ensureProjectScopedRows,
  FTS_DEFAULT_LIMIT,
  FTS_MAX_LIMIT,
  FTS_MAX_QUERY_LENGTH,
  createFtsService,
} from "../ftsService";

describe("FTS utility functions", () => {
  // ── containsCjk ──

  describe("containsCjk", () => {
    it("returns true for Chinese characters", () => {
      expect(containsCjk("你好世界")).toBe(true);
    });

    it("returns true for mixed content", () => {
      expect(containsCjk("hello 世界")).toBe(true);
    });

    it("returns false for pure ASCII", () => {
      expect(containsCjk("hello world")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(containsCjk("")).toBe(false);
    });

    it("returns true for Japanese Kanji", () => {
      expect(containsCjk("日本語")).toBe(true);
    });
  });

  // ── expandCjkQuery ──

  describe("expandCjkQuery", () => {
    it("splits CJK characters into OR tokens", () => {
      const result = expandCjkQuery("你好");
      expect(result).toContain('"你"');
      expect(result).toContain('"好"');
      expect(result).toContain("OR");
    });

    it("preserves non-CJK tokens", () => {
      const result = expandCjkQuery("react 组件");
      expect(result).toContain("react");
      expect(result).toContain('"组"');
      expect(result).toContain('"件"');
    });

    it("returns original for pure ASCII", () => {
      expect(expandCjkQuery("hello world")).toBe("hello world");
    });
  });

  // ── normalizeFtsQuery ──

  describe("normalizeFtsQuery", () => {
    it("returns error for empty query", () => {
      const result = normalizeFtsQuery("");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("returns error for whitespace-only query", () => {
      const result = normalizeFtsQuery("   ");
      expect(result.ok).toBe(false);
    });

    it("returns error for overly long query", () => {
      const result = normalizeFtsQuery("a".repeat(FTS_MAX_QUERY_LENGTH + 1));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("too long");
      }
    });

    it("normalizes CJK query", () => {
      const result = normalizeFtsQuery("你好");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toContain("OR");
      }
    });

    it("passes through ASCII query", () => {
      const result = normalizeFtsQuery("hello");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe("hello");
      }
    });
  });

  // ── normalizeFtsProjectId ──

  describe("normalizeFtsProjectId", () => {
    it("returns error for empty projectId", () => {
      const result = normalizeFtsProjectId("");
      expect(result.ok).toBe(false);
    });

    it("trims whitespace", () => {
      const result = normalizeFtsProjectId("  p1  ");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe("p1");
      }
    });
  });

  // ── normalizeFtsLimit ──

  describe("normalizeFtsLimit", () => {
    it("uses default when undefined", () => {
      const result = normalizeFtsLimit();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe(FTS_DEFAULT_LIMIT);
      }
    });

    it("rejects non-integer", () => {
      const result = normalizeFtsLimit(3.5);
      expect(result.ok).toBe(false);
    });

    it("rejects zero", () => {
      const result = normalizeFtsLimit(0);
      expect(result.ok).toBe(false);
    });

    it("rejects negative", () => {
      const result = normalizeFtsLimit(-1);
      expect(result.ok).toBe(false);
    });

    it("rejects too large", () => {
      const result = normalizeFtsLimit(FTS_MAX_LIMIT + 1);
      expect(result.ok).toBe(false);
    });

    it("accepts valid limit", () => {
      const result = normalizeFtsLimit(10);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe(10);
      }
    });

    it("rejects Infinity", () => {
      const result = normalizeFtsLimit(Infinity);
      expect(result.ok).toBe(false);
    });

    it("rejects NaN", () => {
      const result = normalizeFtsLimit(NaN);
      expect(result.ok).toBe(false);
    });
  });

  // ── normalizeFtsOffset ──

  describe("normalizeFtsOffset", () => {
    it("uses default when undefined", () => {
      const result = normalizeFtsOffset();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe(0);
      }
    });

    it("rejects non-integer", () => {
      const result = normalizeFtsOffset(1.5);
      expect(result.ok).toBe(false);
    });

    it("rejects negative", () => {
      const result = normalizeFtsOffset(-1);
      expect(result.ok).toBe(false);
    });

    it("accepts zero", () => {
      const result = normalizeFtsOffset(0);
      expect(result.ok).toBe(true);
    });

    it("accepts positive integer", () => {
      const result = normalizeFtsOffset(10);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe(10);
      }
    });
  });

  // ── Error classification ──

  describe("isFtsSyntaxError", () => {
    it("detects FTS5 syntax errors", () => {
      expect(isFtsSyntaxError("fts5: syntax error near ...")).toBe(true);
    });

    it("detects parse errors", () => {
      expect(isFtsSyntaxError("parse error at line 1")).toBe(true);
    });

    it("detects unterminated strings", () => {
      expect(isFtsSyntaxError("unterminated string literal")).toBe(true);
    });

    it("returns false for unrelated errors", () => {
      expect(isFtsSyntaxError("connection refused")).toBe(false);
    });
  });

  describe("isFtsCorruptionError", () => {
    it("detects malformed database", () => {
      expect(isFtsCorruptionError("database disk image is malformed")).toBe(true);
    });

    it("detects missing FTS table", () => {
      expect(isFtsCorruptionError("no such table: documents_fts")).toBe(true);
    });

    it("detects corrupt keyword", () => {
      expect(isFtsCorruptionError("index corrupt")).toBe(true);
    });

    it("returns false for unrelated errors", () => {
      expect(isFtsCorruptionError("timeout")).toBe(false);
    });
  });

  describe("isReindexIoError", () => {
    it("detects I/O error", () => {
      expect(isReindexIoError("disk i/o error")).toBe(true);
    });

    it("detects IO error variant", () => {
      expect(isReindexIoError("io error during reindex")).toBe(true);
    });

    it("returns false for unrelated errors", () => {
      expect(isReindexIoError("syntax error")).toBe(false);
    });
  });

  // ── ensureProjectScopedRows ──

  describe("ensureProjectScopedRows", () => {
    it("passes through rows with matching projectId", () => {
      const rows = [
        { projectId: "p1", documentId: "d1" },
        { projectId: "p1", documentId: "d2" },
      ];
      const result = ensureProjectScopedRows({
        rows,
        requestedProjectId: "p1",
        operation: "test",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(2);
      }
    });

    it("rejects rows from different project", () => {
      const logger = { error: vi.fn() };
      const rows = [
        { projectId: "p1", documentId: "d1" },
        { projectId: "p2", documentId: "d2" },
      ];
      const result = ensureProjectScopedRows({
        rows,
        requestedProjectId: "p1",
        operation: "test",
        logger,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("SEARCH_PROJECT_FORBIDDEN");
      }
      expect(logger.error).toHaveBeenCalledWith(
        "search_project_forbidden_audit",
        expect.objectContaining({ rowProjectId: "p2" }),
      );
    });

    it("passes empty rows", () => {
      const result = ensureProjectScopedRows({
        rows: [],
        requestedProjectId: "p1",
        operation: "test",
      });
      expect(result.ok).toBe(true);
    });
  });
});

// ── FtsService integration (with mocked DB) ──

describe("FtsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockDb(opts?: {
    searchRows?: unknown[];
    countRow?: { total: number };
    shouldThrow?: Error;
  }) {
    const allFn = vi.fn().mockReturnValue(opts?.searchRows ?? []);
    const getFn = vi.fn().mockReturnValue(opts?.countRow ?? { total: 0 });
    const runFn = vi.fn().mockReturnValue({ changes: 0 });

    if (opts?.shouldThrow) {
      allFn.mockImplementation(() => {
        throw opts.shouldThrow;
      });
    }

    return {
      prepare: vi.fn().mockReturnValue({
        all: allFn,
        get: getFn,
        run: runFn,
      }),
      _allFn: allFn,
      _getFn: getFn,
      _runFn: runFn,
    };
  }

  function createLogger() {
    return {
      logPath: "/dev/null",
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };
  }

  describe("search", () => {
    it("returns results for valid query", () => {
      const db = createMockDb({
        searchRows: [
          {
            projectId: "p1",
            documentId: "d1",
            documentTitle: "Title",
            documentType: "chapter",
            snippet: "found here",
            documentOffset: 0,
            score: 0.9,
            updatedAt: 1000,
          },
        ],
        countRow: { total: 1 },
      });
      const logger = createLogger();
      const svc = createFtsService({ db: db as never, logger: logger as never });

      const result = svc.search({ projectId: "p1", query: "found" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.results).toHaveLength(1);
        expect(result.data.total).toBe(1);
        expect(result.data.indexState).toBe("ready");
      }
    });

    it("returns INVALID_ARGUMENT for empty query", () => {
      const db = createMockDb();
      const logger = createLogger();
      const svc = createFtsService({ db: db as never, logger: logger as never });

      const result = svc.search({ projectId: "p1", query: "" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("returns INVALID_ARGUMENT for empty projectId", () => {
      const db = createMockDb();
      const logger = createLogger();
      const svc = createFtsService({ db: db as never, logger: logger as never });

      const result = svc.search({ projectId: "", query: "test" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("handles FTS syntax error", () => {
      const db = createMockDb({
        shouldThrow: new Error("fts5: syntax error"),
      });
      const logger = createLogger();
      const svc = createFtsService({ db: db as never, logger: logger as never });

      const result = svc.search({ projectId: "p1", query: "bad OR OR" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("handles DB corruption by returning rebuilding state", () => {
      const db = createMockDb();
      let searchCall = 0;
      db.prepare.mockImplementation(() => ({
        all: () => {
          searchCall++;
          if (searchCall <= 1) {
            throw new Error("database disk image is malformed");
          }
          return [];
        },
        get: () => ({ total: 0 }),
        run: () => ({ changes: 0 }),
      }));
      const logger = createLogger();
      const svc = createFtsService({ db: db as never, logger: logger as never });

      const result = svc.search({ projectId: "p1", query: "test" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.indexState).toBe("rebuilding");
      }
    });

    it("computes highlight ranges", () => {
      const db = createMockDb({
        searchRows: [
          {
            projectId: "p1",
            documentId: "d1",
            documentTitle: "Title",
            documentType: "chapter",
            snippet: "hello world hello",
            documentOffset: 0,
            score: 0.9,
            updatedAt: 1000,
          },
        ],
        countRow: { total: 1 },
      });
      const logger = createLogger();
      const svc = createFtsService({ db: db as never, logger: logger as never });

      const result = svc.search({ projectId: "p1", query: "hello" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.results[0].highlights.length).toBeGreaterThan(0);
      }
    });
  });

  describe("reindex", () => {
    it("reindexes successfully", () => {
      const db = createMockDb();
      db._runFn.mockReturnValue({ changes: 5 });
      const logger = createLogger();
      const svc = createFtsService({ db: db as never, logger: logger as never });

      const result = svc.reindex({ projectId: "p1" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.indexState).toBe("ready");
      }
    });

    it("returns INVALID_ARGUMENT for empty projectId", () => {
      const db = createMockDb();
      const logger = createLogger();
      const svc = createFtsService({ db: db as never, logger: logger as never });

      const result = svc.reindex({ projectId: "" });
      expect(result.ok).toBe(false);
    });

    it("handles IO error during reindex", () => {
      const db = createMockDb();
      db.prepare.mockImplementation(() => ({
        all: vi.fn(),
        get: vi.fn(),
        run: () => {
          throw new Error("disk i/o error");
        },
      }));
      const logger = createLogger();
      const svc = createFtsService({ db: db as never, logger: logger as never });

      const result = svc.reindex({ projectId: "p1" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("SEARCH_REINDEX_IO_ERROR");
      }
    });
  });

  describe("searchFulltext", () => {
    it("returns FulltextSearchItem format", () => {
      const db = createMockDb({
        searchRows: [
          {
            projectId: "p1",
            documentId: "d1",
            documentTitle: "Title",
            documentType: "chapter",
            snippet: "result text",
            documentOffset: 0,
            score: 0.9,
            updatedAt: 1000,
          },
        ],
        countRow: { total: 1 },
      });
      const logger = createLogger();
      const svc = createFtsService({ db: db as never, logger: logger as never });

      const result = svc.searchFulltext({
        projectId: "p1",
        query: "result",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toHaveLength(1);
        const item = result.data.items[0];
        expect(item).toHaveProperty("title");
        expect(item).toHaveProperty("snippet");
        expect(item).toHaveProperty("score");
      }
    });
  });
});
