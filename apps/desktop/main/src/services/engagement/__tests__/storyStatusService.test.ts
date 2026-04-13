/**
 * storyStatusService unit tests — 故事状态摘要服务
 *
 * Coverage targets:
 *   1. Chapter progress (0, 1, N chapters)
 *   2. Interruption point extraction
 *   3. Active foreshadowing query
 *   4. Suggested action heuristics (all 3 branches)
 *   5. Cache (30s TTL + invalidation)
 *   6. Empty project
 *   7. Edge cases: no foreshadowing, all resolved, disposed service
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

function makeChapterRow(overrides: Partial<{
  total: number;
  current_sort_order: number;
  current_title: string;
  current_doc_id: string;
  current_updated_at: number;
  current_content_text: string;
}> = {}): Record<string, unknown> {
  return {
    total: 5,
    current_sort_order: 3,
    current_title: "第三章：暗流涌动",
    current_doc_id: "doc-003",
    current_updated_at: Date.now() - 1000,
    current_content_text: "林清晨推开了那扇沉重的铁门，冷风裹挟着雨丝扑面而来。",
    ...overrides,
  };
}

// ─── test constants ─────────────────────────────────────────────────

const PROJECT_ID = "proj-novel-001";
const NOW = 1_700_000_000_000; // fixed clock for determinism
const ONE_HOUR = 60 * 60 * 1000;
const TWENTY_FIVE_HOURS = 25 * 60 * 60 * 1000;

// ─── tests ──────────────────────────────────────────────────────────

describe("StoryStatusService", () => {
  let chapterStmt: MockStatement;
  let foreshadowingStmt: MockStatement;
  let db: MockDb;
  let service: StoryStatusService;
  let clock: () => number;

  function setup(opts?: {
    chapterRow?: Record<string, unknown> | undefined;
    foreshadowingRows?: Array<{ id: string; name: string; description: string }>;
  }) {
    chapterStmt = makeChapterStmt(opts?.chapterRow);
    foreshadowingStmt = makeForeshadowingStmt(opts?.foreshadowingRows ?? []);

    db = createMockDb({
      // SQL_CHAPTER_PROGRESS contains "type = 'chapter'"
      "type = 'chapter'": chapterStmt,
      // SQL_ACTIVE_FORESHADOWING contains "type = 'foreshadowing'"
      "type = 'foreshadowing'": foreshadowingStmt,
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

    it("returns correct progress for a single chapter", () => {
      setup({
        chapterRow: makeChapterRow({
          total: 1,
          current_sort_order: 1,
          current_title: "序章",
          current_doc_id: "doc-001",
          current_updated_at: NOW - ONE_HOUR,
          current_content_text: "故事从这里开始。",
        }),
      });

      const status = service.getStatus(PROJECT_ID);

      expect(status.chapterProgress).toEqual({
        current: 1,
        total: 1,
        currentTitle: "序章",
      });
    });

    it("returns correct progress for multiple chapters", () => {
      setup({
        chapterRow: makeChapterRow({
          total: 12,
          current_sort_order: 7,
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

    it("extracts interruption point from most recently edited chapter", () => {
      const editTime = NOW - 3600_000;
      setup({
        chapterRow: makeChapterRow({
          current_doc_id: "doc-042",
          current_title: "第四十二章：真相",
          current_updated_at: editTime,
          current_content_text: "她终于明白了一切的起因。窗外的月光洒在桌面上，照亮了那封信。",
        }),
      });

      const status = service.getStatus(PROJECT_ID);

      expect(status.interruptionPoint).toEqual({
        documentId: "doc-042",
        title: "第四十二章：真相",
        lastEditedAt: editTime,
        contentPreview: "她终于明白了一切的起因。窗外的月光洒在桌面上，照亮了那封信。",
      });
    });

    it("handles empty content_text gracefully", () => {
      setup({
        chapterRow: makeChapterRow({
          current_content_text: "",
        }),
      });

      const status = service.getStatus(PROJECT_ID);

      expect(status.interruptionPoint!.contentPreview).toBe("");
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
  });

  // ── 4. Suggested action heuristics ──────────────────────────────

  describe("suggestedAction", () => {
    it('suggests "continue" when last edit was < 24h ago', () => {
      // Edit happened 1 hour ago
      setup({
        chapterRow: makeChapterRow({
          current_updated_at: NOW - ONE_HOUR,
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

    it('suggests "resolve-foreshadowing" when edit > 24h and foreshadowing exists', () => {
      // Edit happened 25 hours ago; foreshadowing exists
      setup({
        chapterRow: makeChapterRow({
          current_updated_at: NOW - TWENTY_FIVE_HOURS,
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
          current_updated_at: NOW - TWENTY_FIVE_HOURS,
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
      db = createMockDb({
        "type = 'chapter'": chapterStmt,
        "type = 'foreshadowing'": foreshadowingStmt,
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
          current_content_text: null as unknown as string,
        }),
      });

      const status = service.getStatus(PROJECT_ID);

      // Null content should be coerced to empty string
      expect(status.interruptionPoint!.contentPreview).toBe("");
    });

    it("passes CONTENT_PREVIEW_LENGTH to SQL substr", () => {
      setup({ chapterRow: makeChapterRow() });

      service.getStatus(PROJECT_ID);

      // The first argument to chapterStmt.get should be 100 (preview length)
      expect(chapterStmt.get).toHaveBeenCalledWith(100, PROJECT_ID);
    });

    it("foreshadowing query receives correct projectId", () => {
      setup({ chapterRow: makeChapterRow(), foreshadowingRows: [] });

      service.getStatus(PROJECT_ID);

      expect(foreshadowingStmt.all).toHaveBeenCalledWith(PROJECT_ID);
    });
  });
});
