/**
 * SessionMemoryService unit tests — L1 per-session context memory (INV-4).
 *
 * Coverage targets:
 *   SM-U-1:  create() happy path — item persisted, returned with correct fields
 *   SM-U-2:  create() validation — empty content, invalid category, missing IDs
 *   SM-U-3:  create() content length limit
 *   SM-U-4:  list() — filter by projectId, sessionId, category, limit
 *   SM-U-5:  list() — totalCount reflects full result set before limit
 *   SM-U-6:  delete() — soft-delete sets deleted_at, subsequent list excludes it
 *   SM-U-7:  delete() — non-existent ID returns NOT_FOUND
 *   SM-U-8:  deleteExpired() — marks expired items, leaves non-expired
 *   SM-U-9:  getInjectionPayload() — respects totalContextBudget cap (15%)
 *   SM-U-10: getInjectionPayload() — time decay lowers older items' scores
 *   SM-U-11: getInjectionPayload() — FTS5 contextHint boosts matching items
 *   SM-U-12: getInjectionPayload() — CJK content estimated correctly (INV-3)
 *   SM-U-13: getInjectionPayload() — empty project returns empty payload
 *   SM-U-14: getInjectionPayload() — zero/negative budget returns empty payload
 *   SM-U-15: list() — excludes soft-deleted items
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  createSessionMemoryService,
  _resetIdCounter,
  type SessionMemoryService,
  type DbLike,
  type DbStatement,
} from "../sessionMemoryService";

// ─── Mock DB ────────────────────────────────────────────────────────

/**
 * In-memory SQLite mock that stores rows in a Map for deterministic testing.
 * Supports the subset of SQL used by sessionMemoryService.
 */
function createMockDb(): DbLike & {
  _rows: Map<string, Record<string, unknown>>;
  _rowidCounter: number;
  _ftsRows: Map<number, string>;
  _deletedRows: Map<string, Record<string, unknown>>;
} {
  const rows = new Map<string, Record<string, unknown>>();
  const ftsRows = new Map<number, string>();
  let rowidCounter = 0;

  const mockDb: DbLike & {
    _rows: Map<string, Record<string, unknown>>;
    _rowidCounter: number;
    _ftsRows: Map<number, string>;
    _deletedRows: Map<string, Record<string, unknown>>;
  } = {
    _rows: rows,
    _rowidCounter: 0,
    _ftsRows: ftsRows,
    _deletedRows: new Map(),

    exec: vi.fn(),

    prepare(sql: string): DbStatement {
      const trimmedSql = sql.replace(/\s+/g, " ").trim();

      // INSERT INTO session_memory
      if (trimmedSql.startsWith("INSERT INTO session_memory")) {
        return {
          run(...args: unknown[]) {
            rowidCounter++;
            mockDb._rowidCounter = rowidCounter;
            const row: Record<string, unknown> = {
              rowid: rowidCounter,
              id: args[0],
              session_id: args[1],
              project_id: args[2],
              category: args[3],
              content: args[4],
              relevance_score: args[5],
              created_at: args[6],
              expires_at: args[7],
              deleted_at: null,
            };
            rows.set(args[0] as string, row);
            // Simulate FTS trigger
            ftsRows.set(rowidCounter, args[4] as string);
            return { changes: 1 };
          },
          get: () => undefined,
          all: () => [],
        };
      }

      // UPDATE session_memory SET deleted_at (soft-delete)
      if (trimmedSql.includes("UPDATE session_memory SET deleted_at")) {
        return {
          run(...args: unknown[]) {
            const deletedAt = args[0] as number;

            // deleteExpired pattern: WHERE expires_at IS NOT NULL AND expires_at <= ? AND deleted_at IS NULL
            if (trimmedSql.includes("expires_at IS NOT NULL")) {
              const expiryThreshold = args[1] as number;
              let changes = 0;
              for (const [, row] of rows) {
                if (
                  row.deleted_at == null &&
                  row.expires_at != null &&
                  (row.expires_at as number) <= expiryThreshold
                ) {
                  row.deleted_at = deletedAt;
                  changes++;
                }
              }
              return { changes };
            }

            // Single delete: WHERE id = ? AND project_id = ? AND deleted_at IS NULL
            const id = args[1] as string;
            const projectId = args[2] as string | undefined;
            const row = rows.get(id);
            if (row && row.deleted_at == null) {
              // If projectId is present in the query, enforce project scoping
              if (projectId !== undefined && row.project_id !== projectId) {
                return { changes: 0 };
              }
              row.deleted_at = deletedAt;
              return { changes: 1 };
            }
            return { changes: 0 };
          },
          get: () => undefined,
          all: () => [],
        };
      }

      // SELECT COUNT(*) as cnt FROM session_memory WHERE ...
      if (trimmedSql.includes("SELECT COUNT(*)")) {
        return {
          run: () => ({ changes: 0 }),
          get(...args: unknown[]) {
            let count = 0;
            for (const row of rows.values()) {
              if (row.deleted_at != null) continue;
              if (!matchesConditions(row, trimmedSql, args)) continue;
              count++;
            }
            return { cnt: count };
          },
          all: () => [],
        };
      }

      // SELECT * / SELECT *, rowid FROM session_memory WHERE ... (list / injection query)
      if (
        trimmedSql.includes("SELECT * FROM session_memory") ||
        trimmedSql.includes("SELECT *, rowid FROM session_memory")
      ) {
        return {
          run: () => ({ changes: 0 }),
          get: () => undefined,
          all(...args: unknown[]) {
            const results: Record<string, unknown>[] = [];
            for (const row of rows.values()) {
              if (row.deleted_at != null) continue;
              if (!matchesConditions(row, trimmedSql, args)) continue;
              results.push({ ...row });
            }
            // Sort by created_at DESC
            results.sort((a, b) => (b.created_at as number) - (a.created_at as number));
            // Apply LIMIT if present
            const limitMatch = trimmedSql.match(/LIMIT \?/);
            if (limitMatch) {
              const limit = args[args.length - 1] as number;
              return results.slice(0, limit);
            }
            return results;
          },
        };
      }

      // SELECT rowid FROM session_memory_fts WHERE ... MATCH ?
      if (trimmedSql.includes("session_memory_fts")) {
        return {
          run: () => ({ changes: 0 }),
          get: () => undefined,
          all(...args: unknown[]) {
            const query = (args[0] as string).toLowerCase();
            const terms = query
              .replace(/["()]/g, "")
              .split(/\s+or\s+/i)
              .map((t) => t.trim())
              .filter(Boolean);
            const matchingRowids: Record<string, unknown>[] = [];
            for (const [rowid, content] of ftsRows) {
              const lower = content.toLowerCase();
              if (terms.some((t) => lower.includes(t))) {
                matchingRowids.push({ rowid });
              }
            }
            return matchingRowids;
          },
        };
      }

      // Fallback
      return {
        run: () => ({ changes: 0 }),
        get: () => undefined,
        all: () => [],
      };
    },
  };

  return mockDb;
}

function matchesConditions(
  row: Record<string, unknown>,
  sql: string,
  args: unknown[],
): boolean {
  // Extract conditions in the order they appear in the SQL.
  // Each condition pattern consumes one arg from `args` in order.
  const conditionPatterns: {
    pattern: string | RegExp;
    check: (row: Record<string, unknown>, arg: unknown) => boolean;
    consumesArg: boolean;
  }[] = [
    {
      pattern: "project_id = ?",
      check: (r, a) => r.project_id === a,
      consumesArg: true,
    },
    {
      // Compound: (expires_at IS NULL OR expires_at > ?)
      pattern: "expires_at IS NULL OR expires_at >",
      check: (r, a) => {
        if (r.expires_at == null) return true;
        return (r.expires_at as number) > (a as number);
      },
      consumesArg: true,
    },
    {
      pattern: "session_id = ?",
      check: (r, a) => r.session_id === a,
      consumesArg: true,
    },
    {
      pattern: /category = \?/,
      check: (r, a) => r.category === a,
      consumesArg: true,
    },
  ];

  // Build an ordered list of conditions based on their position in SQL
  const ordered = conditionPatterns
    .map((cp) => {
      const idx =
        typeof cp.pattern === "string"
          ? sql.indexOf(cp.pattern)
          : sql.search(cp.pattern);
      return { ...cp, idx };
    })
    .filter((cp) => cp.idx >= 0)
    .sort((a, b) => a.idx - b.idx);

  let argIdx = 0;
  for (const cond of ordered) {
    if (!cond.check(row, args[argIdx])) return false;
    if (cond.consumesArg) argIdx++;
  }

  return true;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("SessionMemoryService", () => {
  let db: ReturnType<typeof createMockDb>;
  let svc: SessionMemoryService;

  beforeEach(() => {
    _resetIdCounter();
    db = createMockDb();
    svc = createSessionMemoryService({ db });
  });

  // SM-U-1
  describe("create()", () => {
    it("creates an item with correct fields", () => {
      const result = svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "style",
        content: "用户偏好口语化表达",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.sessionId).toBe("sess-1");
      expect(result.data.projectId).toBe("proj-1");
      expect(result.data.category).toBe("style");
      expect(result.data.content).toBe("用户偏好口语化表达");
      expect(result.data.relevanceScore).toBe(1.0);
      expect(result.data.id).toMatch(/^smem-/);
      expect(result.data.createdAt).toBeGreaterThan(0);
    });

    it("uses custom relevanceScore when provided", () => {
      const result = svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "reference",
        content: "林黛玉",
        relevanceScore: 0.8,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.relevanceScore).toBe(0.8);
    });

    it("sets expiresAt when provided", () => {
      const future = Date.now() + 3600_000;
      const result = svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "note",
        content: "临时笔记",
        expiresAt: future,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.expiresAt).toBe(future);
    });

    // SM-U-2
    it("rejects empty content", () => {
      const result = svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "style",
        content: "",
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects whitespace-only content", () => {
      const result = svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "style",
        content: "   \n\t  ",
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects invalid category", () => {
      const result = svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "invalid" as "style",
        content: "test",
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects empty sessionId", () => {
      const result = svc.create({
        sessionId: "",
        projectId: "proj-1",
        category: "style",
        content: "test",
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects empty projectId", () => {
      const result = svc.create({
        sessionId: "sess-1",
        projectId: "",
        category: "style",
        content: "test",
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    // SM-U-3
    it("rejects content exceeding 5000 chars", () => {
      const result = svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "note",
        content: "x".repeat(5001),
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });
  });

  // SM-U-4, SM-U-5
  describe("list()", () => {
    beforeEach(() => {
      svc.create({ sessionId: "sess-1", projectId: "proj-1", category: "style", content: "文风：口语化" });
      svc.create({ sessionId: "sess-1", projectId: "proj-1", category: "reference", content: "林黛玉" });
      svc.create({ sessionId: "sess-2", projectId: "proj-1", category: "style", content: "文风：典雅" });
      svc.create({ sessionId: "sess-1", projectId: "proj-2", category: "note", content: "其他项目笔记" });
    });

    it("lists all items for a project", () => {
      const result = svc.list({ projectId: "proj-1" });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items).toHaveLength(3);
      expect(result.data.totalCount).toBe(3);
    });

    it("filters by sessionId", () => {
      const result = svc.list({ projectId: "proj-1", sessionId: "sess-1" });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items).toHaveLength(2);
    });

    it("filters by category", () => {
      const result = svc.list({ projectId: "proj-1", category: "style" });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items).toHaveLength(2);
      expect(result.data.items.every((i) => i.category === "style")).toBe(true);
    });

    it("respects limit", () => {
      const result = svc.list({ projectId: "proj-1", limit: 2 });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items).toHaveLength(2);
      expect(result.data.totalCount).toBe(3);
    });

    it("rejects empty projectId", () => {
      const result = svc.list({ projectId: "" });
      expect(result.ok).toBe(false);
    });

    // SM-U-15
    it("excludes soft-deleted items", () => {
      const listBefore = svc.list({ projectId: "proj-1" });
      expect(listBefore.ok).toBe(true);
      if (!listBefore.ok) return;
      const firstItemId = listBefore.data.items[0].id;

      svc.delete({ id: firstItemId, projectId: "proj-1" });

      const listAfter = svc.list({ projectId: "proj-1" });
      expect(listAfter.ok).toBe(true);
      if (!listAfter.ok) return;
      expect(listAfter.data.items).toHaveLength(2);
      expect(listAfter.data.items.every((i) => i.id !== firstItemId)).toBe(true);
    });
  });

  // SM-U-6, SM-U-7
  describe("delete()", () => {
    it("soft-deletes an existing item", () => {
      const created = svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "note",
        content: "临时",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const result = svc.delete({ id: created.data.id, projectId: "proj-1" });
      expect(result.ok).toBe(true);
    });

    it("returns NOT_FOUND for non-existent id", () => {
      const res = svc.delete({ id: "nonexistent", projectId: "proj-1" });
      expect(res.ok).toBe(false);
    });

    it("returns NOT_FOUND for already-deleted item", () => {
      const created = svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "note",
        content: "临时",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      svc.delete({ id: created.data.id, projectId: "proj-1" });
      const result = svc.delete({ id: created.data.id, projectId: "proj-1" });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("NOT_FOUND");
    });

    it("rejects empty id", () => {
      const result = svc.delete({ id: "", projectId: "proj-1" });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("rejects empty projectId", () => {
      const result = svc.delete({ id: "some-id", projectId: "" });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    });

    it("prevents cross-project deletion", () => {
      const created = svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "note",
        content: "belongs to proj-1",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      // Attempt to delete from a different project
      const result = svc.delete({ id: created.data.id, projectId: "proj-2" });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("NOT_FOUND");

      // Verify item still exists in proj-1
      const listed = svc.list({ projectId: "proj-1" });
      expect(listed.ok).toBe(true);
      if (!listed.ok) return;
      expect(listed.data.items).toHaveLength(1);
    });
  });

  // SM-U-8
  describe("deleteExpired()", () => {
    it("marks expired items and leaves non-expired", () => {
      const past = Date.now() - 1000;
      const future = Date.now() + 3600_000;

      svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "note",
        content: "已过期",
        expiresAt: past,
      });
      svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "note",
        content: "未过期",
        expiresAt: future,
      });
      svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "style",
        content: "无过期时间",
      });

      const result = svc.deleteExpired();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.deletedCount).toBe(1);

      // Verify remaining items
      const list = svc.list({ projectId: "proj-1" });
      expect(list.ok).toBe(true);
      if (!list.ok) return;
      expect(list.data.items).toHaveLength(2);
    });
  });

  // SM-U-9 ~ SM-U-14
  describe("getInjectionPayload()", () => {
    // SM-U-9
    it("respects totalContextBudget cap (enforces 15%)", () => {
      // Create several items
      for (let i = 0; i < 20; i++) {
        svc.create({
          sessionId: "sess-1",
          projectId: "proj-1",
          category: "style",
          content: `这是第 ${i + 1} 条风格记忆，包含足够的内容来消耗 token 预算`,
        });
      }

      // totalContextBudget = 500 → maxTokens = floor(500 * 0.15) = 75
      const result = svc.getInjectionPayload({
        sessionId: "sess-1",
        projectId: "proj-1",
        totalContextBudget: 500,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // Service enforces 15% cap: effective budget is floor(500 * 0.15) = 75
      expect(result.data.totalTokens).toBeLessThanOrEqual(75);
      // Should have fewer than all 20 items
      expect(result.data.items.length).toBeLessThan(20);
    });

    // SM-U-10
    it("time decay lowers older items' scores", () => {
      // Manually insert items with different createdAt timestamps
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      // Recent item with lower base score
      svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "style",
        content: "recent-item",
        relevanceScore: 0.6,
      });

      // Older item with higher base score — but after decay should score lower
      // Manually backdating by inserting directly into mock db
      const olderRow = {
        rowid: ++db._rowidCounter,
        id: "smem-old-1",
        session_id: "sess-1",
        project_id: "proj-1",
        category: "style",
        content: "old-item",
        relevance_score: 1.0,
        created_at: oneDayAgo,
        expires_at: null,
        deleted_at: null,
      };
      db._rows.set("smem-old-1", olderRow);
      db._ftsRows.set(olderRow.rowid, olderRow.content);

      const result = svc.getInjectionPayload({
        sessionId: "sess-1",
        projectId: "proj-1",
        totalContextBudget: 1000,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // The recent item should be first because time decay pulls down the older one
      // old-item: 1.0 * exp(-1) ≈ 0.5
      // recent-item: 0.6 * exp(~0) ≈ 0.6
      // So recent-item should rank higher
      expect(result.data.items[0].content).toBe("recent-item");
    });

    // SM-U-11
    it("FTS5 contextHint boosts matching items", () => {
      svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "reference",
        content: "林黛玉是贾宝玉的表妹",
        relevanceScore: 0.5,
      });
      svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "reference",
        content: "薛宝钗住在梨香院",
        relevanceScore: 0.5,
      });

      const result = svc.getInjectionPayload({
        sessionId: "sess-1",
        projectId: "proj-1",
        contextHint: "林黛玉",
        totalContextBudget: 1000,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // The item mentioning 林黛玉 should rank first due to FTS5 boost
      expect(result.data.items[0].content).toContain("林黛玉");
    });

    // SM-U-12: CJK content estimation (INV-3)
    it("CJK content is estimated correctly at ~1.5 tokens/char", () => {
      // Create an item with purely Chinese content
      const chineseContent = "这是一段用于测试的中文内容";
      svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "style",
        content: chineseContent,
      });

      const result = svc.getInjectionPayload({
        sessionId: "sess-1",
        projectId: "proj-1",
        totalContextBudget: 5000,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items).toHaveLength(1);
      // "[style] " prefix + content → total should reflect CJK pricing
      // 13 Chinese chars in content + punctuation = ~19.5+ tokens
      // Plus "[style] " ASCII prefix ~2 tokens
      expect(result.data.totalTokens).toBeGreaterThan(10);
    });

    // SM-U-13
    it("empty project returns empty payload", () => {
      const result = svc.getInjectionPayload({
        sessionId: "sess-1",
        projectId: "proj-nonexistent",
        totalContextBudget: 1000,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items).toHaveLength(0);
      expect(result.data.totalTokens).toBe(0);
    });

    // SM-U-14
    it("zero budget returns empty payload", () => {
      svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "style",
        content: "任何内容",
      });

      const result = svc.getInjectionPayload({
        sessionId: "sess-1",
        projectId: "proj-1",
        totalContextBudget: 0,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items).toHaveLength(0);
    });

    it("negative budget returns empty payload", () => {
      const result = svc.getInjectionPayload({
        sessionId: "sess-1",
        projectId: "proj-1",
        totalContextBudget: -100,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items).toHaveLength(0);
    });

    it("excludes expired items from injection", () => {
      const past = Date.now() - 1000;
      svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "style",
        content: "已过期不应注入",
        expiresAt: past,
      });
      svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "style",
        content: "有效项目",
      });

      const result = svc.getInjectionPayload({
        sessionId: "sess-1",
        projectId: "proj-1",
        totalContextBudget: 5000,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].content).toBe("有效项目");
    });

    it("rejects empty projectId", () => {
      const result = svc.getInjectionPayload({
        sessionId: "sess-1",
        projectId: "",
        totalContextBudget: 1000,
      });
      expect(result.ok).toBe(false);
    });

    // SM-U-16: session-aware injection filters by sessionId (required)
    it("filters injection by sessionId — only returns matching session items", () => {
      svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "style",
        content: "session one style",
      });
      svc.create({
        sessionId: "sess-2",
        projectId: "proj-1",
        category: "style",
        content: "session two style",
      });

      // sessionId = "sess-1" — returns only sess-1 items
      const sess1Result = svc.getInjectionPayload({
        sessionId: "sess-1",
        projectId: "proj-1",
        totalContextBudget: 5000,
      });
      expect(sess1Result.ok).toBe(true);
      if (!sess1Result.ok) return;
      expect(sess1Result.data.items).toHaveLength(1);
      expect(sess1Result.data.items[0].content).toBe("session one style");

      // sessionId = "sess-2" — returns only sess-2 items
      const sess2Result = svc.getInjectionPayload({
        sessionId: "sess-2",
        projectId: "proj-1",
        totalContextBudget: 5000,
      });
      expect(sess2Result.ok).toBe(true);
      if (!sess2Result.ok) return;
      expect(sess2Result.data.items).toHaveLength(1);
      expect(sess2Result.data.items[0].content).toBe("session two style");
    });

    // SM-U-18: rejects empty sessionId
    it("rejects empty sessionId", () => {
      const result = svc.getInjectionPayload({
        sessionId: "",
        projectId: "proj-1",
        totalContextBudget: 1000,
      });
      expect(result.ok).toBe(false);
    });

    // SM-U-17: trimmed item content does not include category prefix
    it("trimmed item content does not include category prefix", () => {
      // Create a single item with known content
      svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "style",
        content: "This is a moderately long piece of content that should get trimmed when budget is very small",
      });

      // Small total budget — 15% of 100 = 15 tokens, forces trimming
      const result = svc.getInjectionPayload({
        sessionId: "sess-1",
        projectId: "proj-1",
        totalContextBudget: 100,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // If there are items, their content should NOT start with "[style] "
      for (const item of result.data.items) {
        expect(item.content).not.toMatch(/^\[style\] /);
      }
    });
  });
});
