/**
 * storyStatusService unit tests — 故事状态摘要服务
 *
 * Coverage targets:
 *   1. Chapter progress (0, 1, N chapters)
 *   2. Interruption point extraction (with L0 memory context)
 *   3. Active foreshadowing query (attributes_json resolution)
 *   4. Suggested action heuristics (all 3 branches + boundary)
 *   5. Cache (30s TTL + invalidation + boundary)
 *   6. Empty project
 *   7. Edge cases: no foreshadowing, all resolved, disposed service
 *   8. L0 memory integration
 */

import { describe, it, expect, vi, afterEach, type Mock } from "vitest";

import {
  createStoryStatusService,
  type StoryStatusService,
  type DbLike,
} from "../storyStatusService";

// ─── mock infrastructure ────────────────────────────────────────────

interface MockStatement {
  get: Mock;
  all: Mock;
}

interface MockDb {
  prepare: Mock;
}

/** Maps SQL snippet → MockStatement so each prepared query gets its own mock. */
function createMockDb(stmtMap: Record<string, MockStatement>): MockDb {
  return {
    prepare: vi.fn((sql: string) => {
      for (const [key, stmt] of Object.entries(stmtMap)) {
        if (sql.includes(key)) {
          return stmt;
        }
      }
      // Fallback: return a no-op statement
      return { get: vi.fn(), all: vi.fn().mockReturnValue([]) };
    }),
  };
}

function makeChapterStmt(
  row?: Record<string, unknown> | undefined,
): MockStatement {
  return {
    get: vi.fn().mockReturnValue(row),
    all: vi.fn().mockReturnValue(row ? [row] : []),
  };
}

function makeForeshadowingStmt(
  rows: Array<{ id: string; name: string; description: string }> = [],
): MockStatement {
  return {
    get: vi.fn(),
    all: vi.fn().mockReturnValue(rows),
  };
}

function makeL0MemoryStmt(
  row?: { content: string; type: string } | undefined,
): MockStatement {
  return {
    get: vi.fn().mockReturnValue(row),
    all: vi.fn().mockReturnValue(row ? [row] : []),
  };
}

/**
 * F4: chapter_number is the 1-based dense rank from ROW_NUMBER() OVER (ORDER BY sort_order ASC).
 * F3: current_edited_at comes from COALESCE(document_versions.MAX(created_at), documents.updated_at).
 * F5: current_content_tail is the last N chars of content_text.
 */
function makeChapterRow(overrides: Partial<{
  total: number;
  chapter_number: number;
  current_title: string;
  current_doc_id: string;
  current_edited_at: number;
  current_content_tail: string;
}> = {}): Record<string, unknown> {
  return {
    total: 5,
    chapter_number: 3,
    current_title: "第三章：暗流涌动",
    current_doc_id: "doc-003",
    current_edited_at: Date.now() - 1000,
    current_content_tail: "她紧了紧衣领，向前走去。",
    ...overrides,
  };
}

// ─── test constants ─────────────────────────────────────────────────

const PROJECT_ID = "proj-novel-001";
const NOW = 1_700_000_000_000; // fixed clock for determinism
const ONE_HOUR = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 86400000
const TWENTY_FIVE_HOURS = 25 * 60 * 60 * 1000;

// ─── tests ──────────────────────────────────────────────────────────

describe("StoryStatusService", () => {
  let chapterStmt: MockStatement;
  let foreshadowingStmt: MockStatement;
  let l0MemoryStmt: MockStatement;
  let db: MockDb;
  let service: StoryStatusService;
  let clock: () => number;

  function setup(opts?: {
    chapterRow?: Record<string, unknown> | undefined;
    foreshadowingRows?: Array<{ id: string; name: string; description: string }>;
    l0MemoryRow?: { content: string; type: string } | undefined;
  }) {
    chapterStmt = makeChapterStmt(opts?.chapterRow);
    foreshadowingStmt = makeForeshadowingStmt(opts?.foreshadowingRows ?? []);
    l0MemoryStmt = makeL0MemoryStmt(opts?.l0MemoryRow);

    db = createMockDb({
      // SQL_CHAPTER_PROGRESS contains "document_versions" (F3 LEFT JOIN)
      "document_versions": chapterStmt,
      // SQL_ACTIVE_FORESHADOWING contains "type = 'foreshadowing'"
      "type = 'foreshadowing'": foreshadowingStmt,
      // SQL_L0_MEMORY contains "user_memory"
      "user_memory": l0MemoryStmt,
    });

    clock = vi.fn(() => NOW);

    service = createStoryStatusService({
      db: db as unknown as DbLike,
      nowMs: clock,
    });
  }

  afterEach(() => {
    service?.dispose();
    vi.restoreAllMocks();
  });

  // ── 1. Chapter progress ─────────────────────────────────────────

  describe("chapterProgress", () => {
    it("returns zero progress for empty project (no chapters)", () => {
      setup({ chapterRow: undefined });

      const status = service.getStatus(PROJECT_ID);

      expect(status.chapterProgress).toEqual({
        current: 0,
        total: 0,
        currentTitle: "",
      });
    });

    it("returns correct 1-based chapter number for a single chapter", () => {
      // F4: sort_order is 0-based in production; ROW_NUMBER() produces 1-based rank.
      setup({
        chapterRow: makeChapterRow({
          total: 1,
          chapter_number: 1,
          current_title: "序章",
          current_doc_id: "doc-001",
          current_edited_at: NOW - ONE_HOUR,
          current_content_tail: "故事从这里开始。",
        }),
      });

      const status = service.getStatus(PROJECT_ID);

      expect(status.chapterProgress).toEqual({
        current: 1,
        total: 1,
        currentTitle: "序章",
      });
    });

    it("returns correct 1-based chapter number for multiple chapters", () => {
      // F4: With 12 chapters (sort_order 0..11), the 7th chapter has chapter_number=7.
      setup({
        chapterRow: makeChapterRow({
          total: 12,
          chapter_number: 7,
          current_title: "第七章：转折",
        }),
      });

      const status = service.getStatus(PROJECT_ID);

      expect(status.chapterProgress).toEqual({
        current: 7,
        total: 12,
        currentTitle: "第七章：转折",
      });
    });
  });

  // ── 2. Interruption point ───────────────────────────────────────

  describe("interruptionPoint", () => {
    it("returns null when no chapters exist", () => {
      setup({ chapterRow: undefined });

      const status = service.getStatus(PROJECT_ID);

      expect(status.interruptionPoint).toBeNull();
    });

    it("extracts interruption point with content tail and L0 memory", () => {
      const editTime = NOW - 3600_000;
      // F5: current_content_tail shows the end of content, not the beginning.
      setup({
        chapterRow: makeChapterRow({
          current_doc_id: "doc-042",
          current_title: "第四十二章：真相",
          current_edited_at: editTime,
          current_content_tail: "窗外的月光洒在桌面上，照亮了那封信。",
        }),
        l0MemoryRow: { content: "上次在写揭秘场景", type: "note" },
      });

      const status = service.getStatus(PROJECT_ID);

      expect(status.interruptionPoint).toEqual({
        documentId: "doc-042",
        title: "第四十二章：真相",
        lastEditedAt: editTime,
        contentPreview: "窗外的月光洒在桌面上，照亮了那封信。",
        memoryContext: "上次在写揭秘场景",
      });
    });

    it("handles empty content_text gracefully", () => {
      setup({
        chapterRow: makeChapterRow({
          current_content_tail: "",
        }),
      });

      const status = service.getStatus(PROJECT_ID);

      expect(status.interruptionPoint!.contentPreview).toBe("");
    });

    it("returns empty memoryContext when no L0 memory exists", () => {
      setup({ chapterRow: makeChapterRow(), l0MemoryRow: undefined });

      const status = service.getStatus(PROJECT_ID);

      expect(status.interruptionPoint!.memoryContext).toBe("");
    });
  });

  // ── 3. Active foreshadowing ─────────────────────────────────────

  describe("activeForeshadowing", () => {
    it("returns empty array when no foreshadowing entities exist", () => {
      setup({ chapterRow: makeChapterRow(), foreshadowingRows: [] });

      const status = service.getStatus(PROJECT_ID);

      expect(status.activeForeshadowing).toEqual([]);
    });

    it("returns unresolved foreshadowing entries", () => {
      setup({
        chapterRow: makeChapterRow(),
        foreshadowingRows: [
          { id: "fs-001", name: "断剑之谜", description: "第二章出现的断剑，暗示主角的身世" },
          { id: "fs-002", name: "消失的信件", description: "第五章提到的密信下落不明" },
        ],
      });

      const status = service.getStatus(PROJECT_ID);

      expect(status.activeForeshadowing).toEqual([
        { entityId: "fs-001", name: "断剑之谜", description: "第二章出现的断剑，暗示主角的身世" },
        { entityId: "fs-002", name: "消失的信件", description: "第五章提到的密信下落不明" },
      ]);
    });

    it("maps id column to entityId in return value", () => {
      setup({
        chapterRow: makeChapterRow(),
        foreshadowingRows: [
          { id: "kg-entity-99", name: "悬念", description: "测试映射" },
        ],
      });

      const status = service.getStatus(PROJECT_ID);

      expect(status.activeForeshadowing[0].entityId).toBe("kg-entity-99");
    });

    it("narrative states in last_seen_state do not affect foreshadowing filtering", () => {
      // F2: last_seen_state stores narrative states (e.g., "受伤但清醒"), NOT resolution
      // status. Resolution is tracked via json_extract(attributes_json, '$.resolved').
      // Entities with any narrative last_seen_state remain visible as active foreshadowing.
      // This test verifies the service correctly passes through results regardless
      // of narrative state values — the SQL uses attributes_json, not last_seen_state.
      setup({
        chapterRow: makeChapterRow(),
        foreshadowingRows: [
          { id: "fs-narrative", name: "叙事伏笔", description: "带有叙事状态的伏笔" },
        ],
      });

      const status = service.getStatus(PROJECT_ID);

      expect(status.activeForeshadowing).toHaveLength(1);
      expect(status.activeForeshadowing[0].entityId).toBe("fs-narrative");
    });
  });

  // ── 4. Suggested action heuristics ──────────────────────────────

  describe("suggestedAction", () => {
    it('suggests "continue" when last edit was < 24h ago', () => {
      // Edit happened 1 hour ago
      setup({
        chapterRow: makeChapterRow({
          current_edited_at: NOW - ONE_HOUR,
          current_title: "第三章：暗流涌动",
          current_doc_id: "doc-003",
        }),
      });

      const status = service.getStatus(PROJECT_ID);

      expect(status.suggestedAction).toEqual({
        type: "continue",
        label: "继续写作：第三章：暗流涌动",
        targetId: "doc-003",
      });
    });

    it('does NOT suggest "continue" when elapsed is exactly 24h (boundary)', () => {
      // F7: elapsed === 86400000ms. Since the check is `elapsed < RECENT_EDIT_THRESHOLD_MS`,
      // 86400000 < 86400000 is false → should NOT suggest "continue".
      setup({
        chapterRow: makeChapterRow({
          current_edited_at: NOW - TWENTY_FOUR_HOURS,
          current_doc_id: "doc-boundary",
          current_title: "边界章节",
        }),
        foreshadowingRows: [],
      });

      const status = service.getStatus(PROJECT_ID);

      expect(status.suggestedAction.type).not.toBe("continue");
      expect(status.suggestedAction).toEqual({
        type: "new-chapter",
        label: "开始新章节",
      });
    });

    it('suggests "resolve-foreshadowing" when edit > 24h and foreshadowing exists', () => {
      // Edit happened 25 hours ago; foreshadowing exists
      setup({
        chapterRow: makeChapterRow({
          current_edited_at: NOW - TWENTY_FIVE_HOURS,
        }),
        foreshadowingRows: [
          { id: "fs-oldest", name: "伏笔甲", description: "最早的伏笔" },
          { id: "fs-newer", name: "伏笔乙", description: "较新的伏笔" },
        ],
      });

      const status = service.getStatus(PROJECT_ID);

      expect(status.suggestedAction).toEqual({
        type: "resolve-foreshadowing",
        label: "回收伏笔：伏笔甲",
        targetId: "fs-oldest",
      });
    });

    it('suggests "new-chapter" when no recent edit and no foreshadowing', () => {
      // Edit happened 25 hours ago; no foreshadowing
      setup({
        chapterRow: makeChapterRow({
          current_edited_at: NOW - TWENTY_FIVE_HOURS,
        }),
        foreshadowingRows: [],
      });

      const status = service.getStatus(PROJECT_ID);

      expect(status.suggestedAction).toEqual({
        type: "new-chapter",
        label: "开始新章节",
      });
    });

    it('suggests "new-chapter" when project is completely empty', () => {
      setup({ chapterRow: undefined, foreshadowingRows: [] });

      const status = service.getStatus(PROJECT_ID);

      expect(status.suggestedAction).toEqual({
        type: "new-chapter",
        label: "开始新章节",
      });
    });

    it('suggests "resolve-foreshadowing" when no chapters but foreshadowing exists', () => {
      // Edge case: foreshadowing entities exist but no chapter documents
      setup({
        chapterRow: undefined,
        foreshadowingRows: [
          { id: "fs-orphan", name: "孤伏笔", description: "无章节但有伏笔" },
        ],
      });

      const status = service.getStatus(PROJECT_ID);

      expect(status.suggestedAction).toEqual({
        type: "resolve-foreshadowing",
        label: "回收伏笔：孤伏笔",
        targetId: "fs-orphan",
      });
    });
  });

  // ── 5. Cache behavior ───────────────────────────────────────────

  describe("cache", () => {
    it("returns cached result within TTL window", () => {
      setup({
        chapterRow: makeChapterRow({ total: 5 }),
      });

      // First call — cache miss
      const first = service.getStatus(PROJECT_ID);
      expect(chapterStmt.get).toHaveBeenCalledTimes(1);

      // Second call — cache hit (within 30s)
      const second = service.getStatus(PROJECT_ID);
      expect(chapterStmt.get).toHaveBeenCalledTimes(1); // NOT called again
      expect(second).toBe(first); // Same reference
    });

    it("refreshes cache after TTL expires", () => {
      let time = NOW;
      const advancingClock = vi.fn(() => time);

      chapterStmt = makeChapterStmt(makeChapterRow({ total: 5 }));
      foreshadowingStmt = makeForeshadowingStmt([]);
      l0MemoryStmt = makeL0MemoryStmt();
      db = createMockDb({
        "document_versions": chapterStmt,
        "type = 'foreshadowing'": foreshadowingStmt,
        "user_memory": l0MemoryStmt,
      });

      service = createStoryStatusService({
        db: db as unknown as DbLike,
        nowMs: advancingClock,
      });

      // First call
      service.getStatus(PROJECT_ID);
      expect(chapterStmt.get).toHaveBeenCalledTimes(1);

      // Advance clock past 30s TTL
      time = NOW + 31_000;

      // Second call — cache expired, re-queries
      service.getStatus(PROJECT_ID);
      expect(chapterStmt.get).toHaveBeenCalledTimes(2);
    });

    it("cache is expired when clock advances exactly 30000ms (boundary)", () => {
      // F8: expiresAt = NOW + 30000. Check: (NOW + 30000) < (NOW + 30000) → false.
      // Cache IS expired because the strict less-than check fails at the boundary.
      let time = NOW;
      const advancingClock = vi.fn(() => time);

      chapterStmt = makeChapterStmt(makeChapterRow({ total: 5 }));
      foreshadowingStmt = makeForeshadowingStmt([]);
      l0MemoryStmt = makeL0MemoryStmt();
      db = createMockDb({
        "document_versions": chapterStmt,
        "type = 'foreshadowing'": foreshadowingStmt,
        "user_memory": l0MemoryStmt,
      });

      service = createStoryStatusService({
        db: db as unknown as DbLike,
        nowMs: advancingClock,
      });

      // First call at NOW — sets expiresAt = NOW + 30000
      service.getStatus(PROJECT_ID);
      expect(chapterStmt.get).toHaveBeenCalledTimes(1);

      // Advance exactly 30000ms
      time = NOW + 30_000;

      // Second call — cache expired, re-queries
      service.getStatus(PROJECT_ID);
      expect(chapterStmt.get).toHaveBeenCalledTimes(2);
    });

    it("invalidateCache forces re-query on next call", () => {
      setup({
        chapterRow: makeChapterRow({ total: 5 }),
      });

      service.getStatus(PROJECT_ID);
      expect(chapterStmt.get).toHaveBeenCalledTimes(1);

      service.invalidateCache(PROJECT_ID);

      service.getStatus(PROJECT_ID);
      expect(chapterStmt.get).toHaveBeenCalledTimes(2);
    });

    it("invalidation of one project does not affect another", () => {
      setup({
        chapterRow: makeChapterRow({ total: 3 }),
      });

      service.getStatus("proj-a");
      service.getStatus("proj-b");
      expect(chapterStmt.get).toHaveBeenCalledTimes(2);

      service.invalidateCache("proj-a");

      // proj-b is still cached
      service.getStatus("proj-b");
      expect(chapterStmt.get).toHaveBeenCalledTimes(2);

      // proj-a needs refresh
      service.getStatus("proj-a");
      expect(chapterStmt.get).toHaveBeenCalledTimes(3);
    });
  });

  // ── 6. Empty project ───────────────────────────────────────────

  describe("empty project", () => {
    it("returns safe defaults when project has no documents or entities", () => {
      setup({ chapterRow: undefined, foreshadowingRows: [] });

      const status = service.getStatus(PROJECT_ID);

      expect(status).toEqual({
        chapterProgress: { current: 0, total: 0, currentTitle: "" },
        interruptionPoint: null,
        activeForeshadowing: [],
        suggestedAction: { type: "new-chapter", label: "开始新章节" },
      });
    });
  });

  // ── 7. Edge cases ─────────────────────────────────────────────

  describe("edge cases", () => {
    it("throws when disposed", () => {
      setup({ chapterRow: makeChapterRow() });
      service.dispose();

      expect(() => service.getStatus(PROJECT_ID)).toThrow(
        "StoryStatusService has been disposed",
      );
    });

    it("throws when projectId is empty", () => {
      setup({ chapterRow: makeChapterRow() });

      expect(() => service.getStatus("")).toThrow("projectId is required");
    });

    it("dispose clears cache", () => {
      setup({ chapterRow: makeChapterRow() });

      service.getStatus(PROJECT_ID);
      service.dispose();

      // Re-create service and verify no stale cache carries over
      // (we test disposal behavior, not cross-instance leakage)
      expect(() => service.getStatus(PROJECT_ID)).toThrow("disposed");
    });

    it("handles null content_text from DB", () => {
      setup({
        chapterRow: makeChapterRow({
          current_content_tail: null as unknown as string,
        }),
      });

      const status = service.getStatus(PROJECT_ID);

      // Null content should be coerced to empty string
      expect(status.interruptionPoint!.contentPreview).toBe("");
    });

    it("passes CONTENT_PREVIEW_LENGTH twice to SQL substr (offset + length)", () => {
      // F5: The content-tail substr needs two parameters:
      //   substr(content_text, max(1, length(content_text) - ? + 1), ?)
      //   Both bound to CONTENT_PREVIEW_LENGTH (100).
      setup({ chapterRow: makeChapterRow() });

      service.getStatus(PROJECT_ID);

      expect(chapterStmt.get).toHaveBeenCalledWith(100, 100, PROJECT_ID);
    });

    it("foreshadowing query receives correct projectId", () => {
      setup({ chapterRow: makeChapterRow(), foreshadowingRows: [] });

      service.getStatus(PROJECT_ID);

      expect(foreshadowingStmt.all).toHaveBeenCalledWith(PROJECT_ID);
    });
  });

  // ── 8. L0 memory integration ──────────────────────────────────

  describe("L0 memory integration", () => {
    it("populates memoryContext from user_memory L0 data", () => {
      setup({
        chapterRow: makeChapterRow(),
        l0MemoryRow: { content: "上次在写第三章的高潮场景", type: "note" },
      });

      const status = service.getStatus(PROJECT_ID);

      expect(status.interruptionPoint!.memoryContext).toBe(
        "上次在写第三章的高潮场景",
      );
    });

    it("returns empty memoryContext when no L0 memory exists", () => {
      setup({ chapterRow: makeChapterRow(), l0MemoryRow: undefined });

      const status = service.getStatus(PROJECT_ID);

      expect(status.interruptionPoint!.memoryContext).toBe("");
    });

    it("queries L0 memory with correct projectId", () => {
      setup({ chapterRow: makeChapterRow() });

      service.getStatus(PROJECT_ID);

      expect(l0MemoryStmt.get).toHaveBeenCalledWith(PROJECT_ID);
    });

    it("does not query L0 memory when no chapters exist", () => {
      // When there are no chapters, interruptionPoint is null — no need for L0 context.
      setup({ chapterRow: undefined });

      service.getStatus(PROJECT_ID);

      expect(l0MemoryStmt.get).not.toHaveBeenCalled();
    });
  });

  // ── 9. SQL correctness notes ────────────────────────────────────

  describe("SQL correctness design documentation", () => {
    it("chapter progress query filters document_versions to content-edit reasons", () => {
      // Duck R2 F1 + R3 refinement: use an allowlist of content-changing reasons.
      // rollback and branch-merge are real content mutations (documentCoreService.ts).
      // Only status-change and pre-rollback are metadata-only.
      setup({ chapterRow: makeChapterRow() });

      service.getStatus(PROJECT_ID);

      const prepareCalls = (db.prepare as Mock).mock.calls;
      const chapterSql = prepareCalls.find((c: string[]) =>
        c[0].includes("document_versions"),
      );
      expect(chapterSql).toBeDefined();
      expect(chapterSql![0]).toContain("reason IN");
      expect(chapterSql![0]).toContain("autosave");
      expect(chapterSql![0]).toContain("rollback");
      expect(chapterSql![0]).toContain("branch-merge");
      expect(chapterSql![0]).toContain("manual-save");
    });

    it("L0 memory query prefers project scope over global", () => {
      // Duck R2 F2: narrower scope should win over newer global memory.
      setup({ chapterRow: makeChapterRow() });

      service.getStatus(PROJECT_ID);

      const prepareCalls = (db.prepare as Mock).mock.calls;
      const l0Sql = prepareCalls.find((c: string[]) =>
        c[0].includes("user_memory"),
      );
      expect(l0Sql).toBeDefined();
      // Verify scope-priority ordering exists in the SQL
      expect(l0Sql![0]).toContain("CASE WHEN scope = 'project' THEN 0 ELSE 1 END");
    });
  });
});
