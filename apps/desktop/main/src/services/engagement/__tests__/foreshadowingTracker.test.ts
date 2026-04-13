/**
 * foreshadowingTracker unit tests — 伏笔追踪服务
 *
 * Uses an in-memory SQLite database (better-sqlite3) with the kg_entities
 * schema to test real SQL queries against real data. The CHECK constraint
 * on entity type is intentionally omitted to allow inserting 'foreshadowing'
 * type entities for testing.
 *
 * Coverage targets:
 *   1. Empty project → returns []
 *   2. Single unresolved foreshadowing → correct fields
 *   3. Multiple items → sorted by urgency (oldest first)
 *   4. Resolved items excluded from list
 *   5. resolve() marks item as resolved
 *   6. resolve() returns false for non-existent entity
 *   7. resolve() returns false for wrong project
 *   8. resolve() returns false for already-resolved entity
 *   9. After resolve(), item no longer appears in listActive()
 *  10. openDays calculation correctness
 *  11. firstChapterHint extraction from attributes_json
 *  12. firstChapterHint empty when not in attributes_json
 *  13. Cache: second call returns cached result
 *  14. Cache: invalidateCache() forces fresh query
 *  15. Cache TTL: expired cache triggers fresh query
 *  16. dispose(): calls after dispose throw
 *  17. Disposed service: listActive throws
 *  18. Disposed service: resolve throws
 */

import Database from "better-sqlite3";
import { describe, it, expect, afterEach, beforeEach } from "vitest";

import {
  createForeshadowingTracker,
  type ForeshadowingTracker,
  type DbLikeWithRun,
} from "../foreshadowingTracker";

// ─── test constants ─────────────────────────────────────────────────

const PROJECT_ID = "proj-novel-001";
const OTHER_PROJECT = "proj-novel-999";
const NOW = 1_700_000_000_000; // fixed clock for determinism
const ONE_DAY_MS = 86_400_000;

// ─── in-memory SQLite setup ─────────────────────────────────────────

/**
 * Creates the kg_entities table WITHOUT the CHECK constraint on type,
 * so we can insert 'foreshadowing' type entities for testing.
 * Schema matches migration 0013 minus the type constraint.
 */
function createTestDb(): Database.Database {
  const db = new Database(":memory:");

  db.exec(`
    CREATE TABLE kg_entities (
      id             TEXT    NOT NULL,
      project_id     TEXT    NOT NULL,
      type           TEXT    NOT NULL,
      name           TEXT    NOT NULL DEFAULT '',
      description    TEXT    NOT NULL DEFAULT '',
      attributes_json TEXT   NOT NULL DEFAULT '{}',
      created_at     TEXT    NOT NULL,
      updated_at     TEXT    NOT NULL,
      PRIMARY KEY (id)
    )
  `);

  return db;
}

function insertEntity(
  db: Database.Database,
  overrides: Partial<{
    id: string;
    project_id: string;
    type: string;
    name: string;
    description: string;
    attributes_json: string;
    created_at: number;
    updated_at: number;
  }> = {},
): void {
  const defaults = {
    id: "fs-001",
    project_id: PROJECT_ID,
    type: "foreshadowing",
    name: "断剑之谜",
    description: "第二章出现的断剑，暗示主角的身世",
    attributes_json: "{}",
    created_at: NOW - 10 * ONE_DAY_MS,
    updated_at: NOW - 10 * ONE_DAY_MS,
    ...overrides,
  };

  db.prepare(
    `INSERT INTO kg_entities (id, project_id, type, name, description, attributes_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    defaults.id,
    defaults.project_id,
    defaults.type,
    defaults.name,
    defaults.description,
    defaults.attributes_json,
    new Date(defaults.created_at).toISOString(),
    new Date(defaults.updated_at).toISOString(),
  );
}

// ─── tests ──────────────────────────────────────────────────────────

describe("ForeshadowingTracker", () => {
  let sqliteDb: Database.Database;
  let tracker: ForeshadowingTracker;
  let clock: number;

  beforeEach(() => {
    sqliteDb = createTestDb();
    clock = NOW;
  });

  afterEach(() => {
    tracker?.dispose();
    sqliteDb?.close();
  });

  function createTracker(): ForeshadowingTracker {
    tracker = createForeshadowingTracker({
      db: sqliteDb as unknown as DbLikeWithRun,
      nowMs: () => clock,
    });
    return tracker;
  }

  // ── 1. Empty project ─────────────────────────────────────────────

  describe("empty project", () => {
    it("returns empty array when no entities exist", () => {
      createTracker();

      const items = tracker.listActive(PROJECT_ID);

      expect(items).toEqual([]);
    });

    it("returns empty array when only non-foreshadowing entities exist", () => {
      insertEntity(sqliteDb, { id: "char-001", type: "character", name: "主角" });
      createTracker();

      const items = tracker.listActive(PROJECT_ID);

      expect(items).toEqual([]);
    });
  });

  // ── 2. Single unresolved foreshadowing ───────────────────────────

  describe("single unresolved item", () => {
    it("returns item with correct fields", () => {
      const createdAt = NOW - 5 * ONE_DAY_MS;
      insertEntity(sqliteDb, {
        id: "fs-single",
        name: "消失的信件",
        description: "第五章提到的密信下落不明",
        attributes_json: JSON.stringify({ firstChapter: "第五章" }),
        created_at: createdAt,
      });
      createTracker();

      const items = tracker.listActive(PROJECT_ID);

      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({
        entityId: "fs-single",
        name: "消失的信件",
        description: "第五章提到的密信下落不明",
        createdAt,
        openDays: 5,
        urgency: Math.min(1.0, 5 / 30),
        firstChapterHint: "第五章",
      });
    });
  });

  // ── 3. Multiple items — urgency sort ────────────────────────────

  describe("urgency sorting", () => {
    it("sorts by urgency descending (oldest first = most urgent)", () => {
      // oldest: 30 days ago
      insertEntity(sqliteDb, {
        id: "fs-old",
        name: "远古伏笔",
        created_at: NOW - 30 * ONE_DAY_MS,
      });
      // middle: 10 days ago
      insertEntity(sqliteDb, {
        id: "fs-mid",
        name: "中期伏笔",
        created_at: NOW - 10 * ONE_DAY_MS,
      });
      // newest: 1 day ago
      insertEntity(sqliteDb, {
        id: "fs-new",
        name: "近期伏笔",
        created_at: NOW - 1 * ONE_DAY_MS,
      });
      createTracker();

      const items = tracker.listActive(PROJECT_ID);

      expect(items).toHaveLength(3);
      expect(items[0].entityId).toBe("fs-old");
      expect(items[0].urgency).toBe(Math.min(1.0, 30 / 30));
      expect(items[1].entityId).toBe("fs-mid");
      expect(items[1].urgency).toBe(Math.min(1.0, 10 / 30));
      expect(items[2].entityId).toBe("fs-new");
      expect(items[2].urgency).toBe(Math.min(1.0, 1 / 30));
    });
  });

  // ── 4. Resolved items excluded ──────────────────────────────────

  describe("resolved items", () => {
    it("excludes resolved items from listActive", () => {
      insertEntity(sqliteDb, {
        id: "fs-active",
        name: "活跃伏笔",
        created_at: NOW - 5 * ONE_DAY_MS,
      });
      insertEntity(sqliteDb, {
        id: "fs-resolved",
        name: "已解决伏笔",
        attributes_json: JSON.stringify({ resolved: 1 }),
        created_at: NOW - 10 * ONE_DAY_MS,
      });
      createTracker();

      const items = tracker.listActive(PROJECT_ID);

      expect(items).toHaveLength(1);
      expect(items[0].entityId).toBe("fs-active");
    });

    it("excludes items with resolved = true (boolean)", () => {
      insertEntity(sqliteDb, {
        id: "fs-bool-resolved",
        name: "布尔解决",
        attributes_json: JSON.stringify({ resolved: true }),
        created_at: NOW - 3 * ONE_DAY_MS,
      });
      createTracker();

      // json_extract returns 1 for true in SQLite, so IS NOT 1 excludes it
      const items = tracker.listActive(PROJECT_ID);

      expect(items).toHaveLength(0);
    });
  });

  // ── 5. resolve() marks item ─────────────────────────────────────

  describe("resolve()", () => {
    it("marks item as resolved and returns true", () => {
      insertEntity(sqliteDb, { id: "fs-to-resolve", name: "待解决" });
      createTracker();

      const result = tracker.resolve(PROJECT_ID, "fs-to-resolve");

      expect(result).toBe(true);

      // Verify DB state
      const row = sqliteDb
        .prepare("SELECT attributes_json FROM kg_entities WHERE id = ?")
        .get("fs-to-resolve") as { attributes_json: string };
      const attrs = JSON.parse(row.attributes_json) as Record<string, unknown>;
      expect(attrs.resolved).toBe(1);
    });

    it("preserves existing attributes when resolving", () => {
      insertEntity(sqliteDb, {
        id: "fs-with-attrs",
        name: "有属性的伏笔",
        attributes_json: JSON.stringify({
          firstChapter: "第三章",
          importance: "high",
        }),
      });
      createTracker();

      tracker.resolve(PROJECT_ID, "fs-with-attrs");

      const row = sqliteDb
        .prepare("SELECT attributes_json FROM kg_entities WHERE id = ?")
        .get("fs-with-attrs") as { attributes_json: string };
      const attrs = JSON.parse(row.attributes_json) as Record<string, unknown>;
      expect(attrs.resolved).toBe(1);
      expect(attrs.firstChapter).toBe("第三章");
      expect(attrs.importance).toBe("high");
    });

    it("sets updated_at to current time", () => {
      insertEntity(sqliteDb, {
        id: "fs-time",
        name: "时间测试",
        created_at: NOW - 5 * ONE_DAY_MS,
        updated_at: NOW - 5 * ONE_DAY_MS,
      });
      createTracker();

      tracker.resolve(PROJECT_ID, "fs-time");

      const row = sqliteDb
        .prepare("SELECT updated_at FROM kg_entities WHERE id = ?")
        .get("fs-time") as { updated_at: string };
      expect(row.updated_at).toBe(new Date(NOW).toISOString());
    });
  });

  // ── 6. resolve() returns false for non-existent ─────────────────

  describe("resolve() — non-existent entity", () => {
    it("returns false for non-existent entity id", () => {
      createTracker();

      const result = tracker.resolve(PROJECT_ID, "fs-does-not-exist");

      expect(result).toBe(false);
    });
  });

  // ── 7. resolve() returns false for wrong project ────────────────

  describe("resolve() — wrong project", () => {
    it("returns false when entity exists but in different project", () => {
      insertEntity(sqliteDb, {
        id: "fs-wrong-project",
        name: "错误项目",
        project_id: OTHER_PROJECT,
      });
      createTracker();

      const result = tracker.resolve(PROJECT_ID, "fs-wrong-project");

      expect(result).toBe(false);
    });
  });

  // ── 8. resolve() returns false for already-resolved ─────────────

  describe("resolve() — already resolved", () => {
    it("returns false for already-resolved entity", () => {
      insertEntity(sqliteDb, {
        id: "fs-already",
        name: "已解决",
        attributes_json: JSON.stringify({ resolved: 1 }),
      });
      createTracker();

      const result = tracker.resolve(PROJECT_ID, "fs-already");

      expect(result).toBe(false);
    });
  });

  // ── 9. After resolve(), item disappears from listActive() ──────

  describe("resolve() + listActive() integration", () => {
    it("resolved item no longer appears in listActive()", () => {
      insertEntity(sqliteDb, {
        id: "fs-vanish",
        name: "即将消失",
        created_at: NOW - 3 * ONE_DAY_MS,
      });
      insertEntity(sqliteDb, {
        id: "fs-stays",
        name: "仍然存在",
        created_at: NOW - 7 * ONE_DAY_MS,
      });
      createTracker();

      // Both visible initially
      expect(tracker.listActive(PROJECT_ID)).toHaveLength(2);

      // Resolve one
      tracker.resolve(PROJECT_ID, "fs-vanish");

      // Only one remains
      const items = tracker.listActive(PROJECT_ID);
      expect(items).toHaveLength(1);
      expect(items[0].entityId).toBe("fs-stays");
    });
  });

  // ── 10. openDays calculation ───────────────────────────────────

  describe("openDays calculation", () => {
    it("calculates openDays correctly for exact day boundaries", () => {
      insertEntity(sqliteDb, {
        id: "fs-7d",
        name: "七天前",
        created_at: NOW - 7 * ONE_DAY_MS,
      });
      createTracker();

      const items = tracker.listActive(PROJECT_ID);

      expect(items[0].openDays).toBe(7);
      expect(items[0].urgency).toBe(Math.min(1.0, 7 / 30));
    });

    it("uses Math.floor for partial days", () => {
      // 2.5 days ago
      insertEntity(sqliteDb, {
        id: "fs-partial",
        name: "部分天数",
        created_at: NOW - 2.5 * ONE_DAY_MS,
      });
      createTracker();

      const items = tracker.listActive(PROJECT_ID);

      expect(items[0].openDays).toBe(2);
    });

    it("returns 0 for items created today", () => {
      insertEntity(sqliteDb, {
        id: "fs-today",
        name: "今天创建",
        created_at: NOW - 1000, // 1 second ago
      });
      createTracker();

      const items = tracker.listActive(PROJECT_ID);

      expect(items[0].openDays).toBe(0);
      expect(items[0].urgency).toBe(0);
    });
  });

  // ── 11. firstChapterHint extraction ────────────────────────────

  describe("firstChapterHint", () => {
    it("extracts firstChapter from attributes_json", () => {
      insertEntity(sqliteDb, {
        id: "fs-hint",
        name: "有提示的伏笔",
        attributes_json: JSON.stringify({ firstChapter: "第三章：暗流涌动" }),
      });
      createTracker();

      const items = tracker.listActive(PROJECT_ID);

      expect(items[0].firstChapterHint).toBe("第三章：暗流涌动");
    });

    it("returns empty string when firstChapter is not in attributes_json", () => {
      insertEntity(sqliteDb, {
        id: "fs-no-hint",
        name: "无提示的伏笔",
        attributes_json: JSON.stringify({ importance: "low" }),
      });
      createTracker();

      const items = tracker.listActive(PROJECT_ID);

      expect(items[0].firstChapterHint).toBe("");
    });

    it("returns empty string when attributes_json is empty object", () => {
      insertEntity(sqliteDb, {
        id: "fs-empty-attrs",
        name: "空属性",
        attributes_json: "{}",
      });
      createTracker();

      const items = tracker.listActive(PROJECT_ID);

      expect(items[0].firstChapterHint).toBe("");
    });

    it("handles non-string firstChapter gracefully", () => {
      insertEntity(sqliteDb, {
        id: "fs-number-hint",
        name: "数字提示",
        attributes_json: JSON.stringify({ firstChapter: 3 }),
      });
      createTracker();

      const items = tracker.listActive(PROJECT_ID);

      // Non-string → empty
      expect(items[0].firstChapterHint).toBe("");
    });
  });

  // ── 13. Cache: second call returns cached result ────────────────

  describe("cache behavior", () => {
    it("returns cached result on second call within TTL", () => {
      insertEntity(sqliteDb, {
        id: "fs-cached",
        name: "缓存测试",
        created_at: NOW - 5 * ONE_DAY_MS,
      });
      createTracker();

      const first = tracker.listActive(PROJECT_ID);
      const second = tracker.listActive(PROJECT_ID);

      // Same reference — returned from cache
      expect(second).toBe(first);
    });

    it("cache is per-project — different projects have separate caches", () => {
      insertEntity(sqliteDb, {
        id: "fs-proj1",
        name: "项目1",
        project_id: PROJECT_ID,
        created_at: NOW - 3 * ONE_DAY_MS,
      });
      insertEntity(sqliteDb, {
        id: "fs-proj2",
        name: "项目2",
        project_id: OTHER_PROJECT,
        created_at: NOW - 6 * ONE_DAY_MS,
      });
      createTracker();

      const proj1Items = tracker.listActive(PROJECT_ID);
      const proj2Items = tracker.listActive(OTHER_PROJECT);

      expect(proj1Items).toHaveLength(1);
      expect(proj1Items[0].entityId).toBe("fs-proj1");
      expect(proj2Items).toHaveLength(1);
      expect(proj2Items[0].entityId).toBe("fs-proj2");
    });
  });

  // ── 14. Cache: invalidateCache() forces fresh query ────────────

  describe("invalidateCache", () => {
    it("forces fresh query on next call", () => {
      insertEntity(sqliteDb, {
        id: "fs-inv",
        name: "失效测试",
        created_at: NOW - 5 * ONE_DAY_MS,
      });
      createTracker();

      const first = tracker.listActive(PROJECT_ID);
      expect(first).toHaveLength(1);

      // Insert new entity directly (simulating external mutation)
      insertEntity(sqliteDb, {
        id: "fs-inv-new",
        name: "新伏笔",
        created_at: NOW - 1 * ONE_DAY_MS,
      });

      // Without invalidation, returns stale cache
      const stale = tracker.listActive(PROJECT_ID);
      expect(stale).toHaveLength(1); // Still cached

      // Invalidate and re-query
      tracker.invalidateCache(PROJECT_ID);
      const fresh = tracker.listActive(PROJECT_ID);
      expect(fresh).toHaveLength(2);
    });

    it("invalidation of one project does not affect another", () => {
      insertEntity(sqliteDb, {
        id: "fs-a",
        name: "A",
        project_id: PROJECT_ID,
        created_at: NOW - 3 * ONE_DAY_MS,
      });
      insertEntity(sqliteDb, {
        id: "fs-b",
        name: "B",
        project_id: OTHER_PROJECT,
        created_at: NOW - 3 * ONE_DAY_MS,
      });
      createTracker();

      tracker.listActive(PROJECT_ID);
      tracker.listActive(OTHER_PROJECT);

      tracker.invalidateCache(PROJECT_ID);

      // OTHER_PROJECT still returns cached (same reference)
      const otherFirst = tracker.listActive(OTHER_PROJECT);
      const otherSecond = tracker.listActive(OTHER_PROJECT);
      expect(otherSecond).toBe(otherFirst);
    });
  });

  // ── 15. Cache TTL: expired cache triggers fresh query ──────────

  describe("cache TTL expiry", () => {
    it("refreshes cache after 30s TTL expires", () => {
      insertEntity(sqliteDb, {
        id: "fs-ttl",
        name: "TTL测试",
        created_at: NOW - 5 * ONE_DAY_MS,
      });
      createTracker();

      const first = tracker.listActive(PROJECT_ID);
      expect(first).toHaveLength(1);

      // Insert new entity
      insertEntity(sqliteDb, {
        id: "fs-ttl-new",
        name: "新增",
        created_at: NOW - 1 * ONE_DAY_MS,
      });

      // Advance clock past TTL
      clock = NOW + 31_000;

      const refreshed = tracker.listActive(PROJECT_ID);
      expect(refreshed).toHaveLength(2);
    });

    it("cache is expired at exact TTL boundary (30000ms)", () => {
      insertEntity(sqliteDb, {
        id: "fs-boundary",
        name: "边界测试",
        created_at: NOW - 3 * ONE_DAY_MS,
      });
      createTracker();

      tracker.listActive(PROJECT_ID);

      // Insert new entity
      insertEntity(sqliteDb, {
        id: "fs-boundary-new",
        name: "边界新增",
        created_at: NOW - 1 * ONE_DAY_MS,
      });

      // Advance exactly 30000ms — expiresAt = NOW + 30000, check: (NOW+30000) < (NOW+30000) → false
      clock = NOW + 30_000;

      const items = tracker.listActive(PROJECT_ID);
      expect(items).toHaveLength(2); // Cache expired, picked up new entity
    });

    it("cache is NOT expired at 29999ms", () => {
      insertEntity(sqliteDb, {
        id: "fs-not-expired",
        name: "未过期",
        created_at: NOW - 3 * ONE_DAY_MS,
      });
      createTracker();

      tracker.listActive(PROJECT_ID);

      // Insert new entity
      insertEntity(sqliteDb, {
        id: "fs-not-expired-new",
        name: "不该看到",
        created_at: NOW - 1 * ONE_DAY_MS,
      });

      // 29999ms: still within TTL
      clock = NOW + 29_999;

      const items = tracker.listActive(PROJECT_ID);
      expect(items).toHaveLength(1); // Still cached
    });
  });

  // ── 16-18. Disposed service ────────────────────────────────────

  describe("disposed service", () => {
    it("listActive() throws after dispose", () => {
      createTracker();
      tracker.dispose();

      expect(() => tracker.listActive(PROJECT_ID)).toThrow(
        "ForeshadowingTracker has been disposed",
      );
    });

    it("resolve() throws after dispose", () => {
      createTracker();
      tracker.dispose();

      expect(() => tracker.resolve(PROJECT_ID, "fs-001")).toThrow(
        "ForeshadowingTracker has been disposed",
      );
    });

    it("dispose clears cache", () => {
      insertEntity(sqliteDb, {
        id: "fs-dispose-cache",
        name: "缓存清理",
        created_at: NOW - 3 * ONE_DAY_MS,
      });
      createTracker();

      // Populate cache
      tracker.listActive(PROJECT_ID);

      // Dispose
      tracker.dispose();

      // Cannot verify cache is empty directly, but dispose followed by
      // any operation throws — this is the observable behavior.
      expect(() => tracker.listActive(PROJECT_ID)).toThrow("disposed");
    });
  });

  // ── additional edge cases ─────────────────────────────────────

  describe("edge cases", () => {
    it("throws when projectId is empty string", () => {
      createTracker();

      expect(() => tracker.listActive("")).toThrow("projectId is required");
    });

    it("resolve throws when projectId is empty", () => {
      createTracker();

      expect(() => tracker.resolve("", "fs-001")).toThrow(
        "projectId is required",
      );
    });

    it("resolve throws when entityId is empty", () => {
      createTracker();

      expect(() => tracker.resolve(PROJECT_ID, "")).toThrow(
        "entityId is required",
      );
    });

    it("only returns entities from the requested project", () => {
      insertEntity(sqliteDb, {
        id: "fs-mine",
        name: "我的",
        project_id: PROJECT_ID,
        created_at: NOW - 3 * ONE_DAY_MS,
      });
      insertEntity(sqliteDb, {
        id: "fs-other",
        name: "别人的",
        project_id: OTHER_PROJECT,
        created_at: NOW - 5 * ONE_DAY_MS,
      });
      createTracker();

      const items = tracker.listActive(PROJECT_ID);

      expect(items).toHaveLength(1);
      expect(items[0].entityId).toBe("fs-mine");
    });

    it("only returns foreshadowing type (not character, location, etc.)", () => {
      insertEntity(sqliteDb, {
        id: "fs-real",
        type: "foreshadowing",
        name: "真伏笔",
        created_at: NOW - 3 * ONE_DAY_MS,
      });
      insertEntity(sqliteDb, {
        id: "char-001",
        type: "character",
        name: "角色",
        created_at: NOW - 3 * ONE_DAY_MS,
      });
      insertEntity(sqliteDb, {
        id: "loc-001",
        type: "location",
        name: "地点",
        created_at: NOW - 3 * ONE_DAY_MS,
      });
      createTracker();

      const items = tracker.listActive(PROJECT_ID);

      expect(items).toHaveLength(1);
      expect(items[0].entityId).toBe("fs-real");
    });

    it("resolve() invalidates cache so next listActive() is fresh", () => {
      insertEntity(sqliteDb, {
        id: "fs-resolve-cache",
        name: "缓存+解决",
        created_at: NOW - 5 * ONE_DAY_MS,
      });
      insertEntity(sqliteDb, {
        id: "fs-stays-cache",
        name: "保留",
        created_at: NOW - 3 * ONE_DAY_MS,
      });
      createTracker();

      // Populate cache
      const before = tracker.listActive(PROJECT_ID);
      expect(before).toHaveLength(2);

      // Resolve — should auto-invalidate cache
      tracker.resolve(PROJECT_ID, "fs-resolve-cache");

      // Next listActive() should reflect the mutation
      const after = tracker.listActive(PROJECT_ID);
      expect(after).toHaveLength(1);
      expect(after[0].entityId).toBe("fs-stays-cache");
    });

    it("malformed attributes_json in DB causes SQLite json_extract to throw", () => {
      // INV-10: errors must not lose context. Malformed JSON in attributes_json
      // causes SQLite's json_extract() in the WHERE clause to throw — this is
      // the correct behavior. In production, attributes_json is always valid
      // JSON written programmatically. A throw is better than silent corruption.
      sqliteDb
        .prepare(
          `INSERT INTO kg_entities (id, project_id, type, name, description, attributes_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          "fs-bad-json",
          PROJECT_ID,
          "foreshadowing",
          "坏JSON",
          "测试",
          "not-valid-json",
          new Date(NOW - 2 * ONE_DAY_MS).toISOString(),
          new Date(NOW - 2 * ONE_DAY_MS).toISOString(),
        );
      createTracker();

      expect(() => tracker.listActive(PROJECT_ID)).toThrow();
    });
  });
});
