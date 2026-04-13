/**
 * quickCaptureService unit tests — 灵感闪念捕捉服务
 *
 * Uses an in-memory SQLite database (better-sqlite3) with the kg_entities
 * schema to test real SQL queries against real data. The CHECK constraint
 * on entity type matches production (migration 002 extended the allowlist
 * to include 'inspiration' and 'foreshadowing').
 *
 * Coverage targets (51 tests):
 *   1-2.   Empty state: listUnused, getDecayStats
 *   3.     capture() creates entity with correct fields
 *   4.     capture() returns InspirationItem
 *   5.     Multiple captures, listUnused sorted by age
 *   6.     markUsed() updates correctly
 *   7.     markUsed() removes item from unused list
 *   8.     markUsed() idempotency — already used returns false
 *   9.     markUsed() wrong project returns false
 *  10.     markUsed() non-existent entity returns false
 *  11.     archiveStale() archives only > 14d items
 *  12.     archiveStale() does not touch used items
 *  13.     archiveStale() does not re-archive already archived
 *  14.     archiveStale() returns count
 *  15.     getDecayStats() fresh tier
 *  16.     getDecayStats() reminder tier
 *  17.     getDecayStats() fading tier
 *  18.     getDecayStats() archived tier
 *  19.     getDecayStats() mixed states
 *  20.     Decay tier boundary: exactly 3 days
 *  21.     Decay tier boundary: exactly 7 days
 *  22.     Decay tier boundary: exactly 14 days
 *  23.     Large time gaps (100+ days)
 *  24.     Cache: listUnused returns cached on second call
 *  25.     Cache: capture invalidates cache
 *  26.     Cache: markUsed invalidates cache
 *  27.     Cache: archiveStale invalidates cache
 *  28.     Cache: TTL expiry triggers fresh query
 *  29.     Cache: getDecayStats caches separately
 *  30.     Disposed: listUnused throws
 *  31.     Disposed: capture throws
 *  32.     Disposed: markUsed throws
 *  33.     Disposed: archiveStale throws
 *  34.     Disposed: getDecayStats throws
 *  35.     Param validation: empty projectId
 *  36.     Param validation: empty content
 *  37.     Param validation: empty entityId
 *  38.     Param validation: empty chapterId
 *  39.     relatedEntities parsed from attributes_json
 *  40.     Mixed states: some used, some archived, some fresh in listUnused
 *  41-49.  Additional edge cases
 *  50.     archiveStale: boundary — exactly 14d NOT archived
 *  51.     archiveStale: boundary — 14d + 1ms archived
 */

import Database from "better-sqlite3";
import { describe, it, expect, afterEach, beforeEach } from "vitest";

import {
  createQuickCaptureService,
  type QuickCaptureService,
} from "../quickCaptureService";
import type { DbLikeWithRun } from "../dbTypes";

// ─── test constants ─────────────────────────────────────────────────

const PROJECT_ID = "proj-novel-001";
const OTHER_PROJECT = "proj-novel-999";
const NOW = 1_700_000_000_000; // fixed clock for determinism
const DAY_MS = 86_400_000;

// ─── in-memory SQLite setup ─────────────────────────────────────────

/**
 * Creates the kg_entities table with the CHECK constraint matching production
 * (migration 002 extended the allowlist to include 'inspiration' and 'foreshadowing').
 */
function createTestDb(): Database.Database {
  const db = new Database(":memory:");

  db.exec(`
    CREATE TABLE kg_entities (
      id             TEXT    NOT NULL,
      project_id     TEXT    NOT NULL,
      type           TEXT    NOT NULL CHECK (type IN ('character','location','event','item','faction','inspiration','foreshadowing')),
      name           TEXT    NOT NULL DEFAULT '',
      attributes_json TEXT   NOT NULL DEFAULT '{}',
      created_at     TEXT    NOT NULL,
      updated_at     TEXT    NOT NULL,
      PRIMARY KEY (id)
    )
  `);

  return db;
}

function insertInspiration(
  db: Database.Database,
  overrides: Partial<{
    id: string;
    project_id: string;
    name: string;
    attributes_json: string;
    created_at: number;
    updated_at: number;
  }> = {},
): void {
  const defaults = {
    id: "insp-001",
    project_id: PROJECT_ID,
    name: "故事转折灵感",
    attributes_json: JSON.stringify({ relatedEntities: [] }),
    created_at: NOW - 2 * DAY_MS,
    updated_at: NOW - 2 * DAY_MS,
    ...overrides,
  };

  db.prepare(
    `INSERT INTO kg_entities (id, project_id, type, name, attributes_json, created_at, updated_at)
     VALUES (?, ?, 'inspiration', ?, ?, ?, ?)`,
  ).run(
    defaults.id,
    defaults.project_id,
    defaults.name,
    defaults.attributes_json,
    new Date(defaults.created_at).toISOString(),
    new Date(defaults.updated_at).toISOString(),
  );
}

// ─── tests ──────────────────────────────────────────────────────────

describe("QuickCaptureService", () => {
  let sqliteDb: Database.Database;
  let svc: QuickCaptureService;
  let clock: number;
  let idCounter: number;

  beforeEach(() => {
    sqliteDb = createTestDb();
    clock = NOW;
    idCounter = 0;
  });

  afterEach(() => {
    svc?.dispose();
    sqliteDb?.close();
  });

  function createService(): QuickCaptureService {
    svc = createQuickCaptureService({
      db: sqliteDb as unknown as DbLikeWithRun,
      nowMs: () => clock,
      generateId: () => `insp-gen-${++idCounter}`,
    });
    return svc;
  }

  // ── 1-2. Empty state ──────────────────────────────────────────────

  describe("empty project", () => {
    it("listUnused returns empty array when no entities exist", () => {
      createService();
      expect(svc.listUnused(PROJECT_ID)).toEqual([]);
    });

    it("getDecayStats returns all zeros when no entities exist", () => {
      createService();
      const stats = svc.getDecayStats(PROJECT_ID);
      expect(stats).toEqual({
        fresh: 0,
        reminder: 0,
        fading: 0,
        archived: 0,
        total: 0,
      });
    });
  });

  // ── 3-4. Capture ──────────────────────────────────────────────────

  describe("capture", () => {
    it("creates entity and returns InspirationItem with correct fields", () => {
      createService();

      const item = svc.capture(PROJECT_ID, "主角可以有双重人格");

      expect(item).toEqual({
        id: "insp-gen-1",
        content: "主角可以有双重人格",
        relatedEntities: [],
        capturedAt: NOW,
        usedInChapter: null,
        decayDays: 0,
        decayTier: "fresh",
        archived: false,
      });
    });

    it("persists entity to database", () => {
      createService();
      svc.capture(PROJECT_ID, "密室逃脱情节");

      // Verify via direct DB read
      const row = sqliteDb
        .prepare("SELECT * FROM kg_entities WHERE id = ?")
        .get("insp-gen-1") as Record<string, unknown>;
      expect(row).toBeDefined();
      expect(row.name).toBe("密室逃脱情节");
      expect(row.type).toBe("inspiration");
      expect(row.project_id).toBe(PROJECT_ID);
    });
  });

  // ── 5. Multiple captures, sorted by age ───────────────────────────

  describe("listUnused ordering", () => {
    it("returns items sorted by age (oldest first = most urgent)", () => {
      // Insert oldest first, then newer
      insertInspiration(sqliteDb, {
        id: "insp-old",
        name: "老灵感",
        created_at: NOW - 10 * DAY_MS,
      });
      insertInspiration(sqliteDb, {
        id: "insp-new",
        name: "新灵感",
        created_at: NOW - 1 * DAY_MS,
      });
      insertInspiration(sqliteDb, {
        id: "insp-mid",
        name: "中间灵感",
        created_at: NOW - 5 * DAY_MS,
      });

      createService();
      const items = svc.listUnused(PROJECT_ID);

      expect(items).toHaveLength(3);
      expect(items[0].id).toBe("insp-old");
      expect(items[0].decayDays).toBe(10);
      expect(items[1].id).toBe("insp-mid");
      expect(items[1].decayDays).toBe(5);
      expect(items[2].id).toBe("insp-new");
      expect(items[2].decayDays).toBe(1);
    });
  });

  // ── 6-10. markUsed ────────────────────────────────────────────────

  describe("markUsed", () => {
    it("updates entity and returns true", () => {
      insertInspiration(sqliteDb, { id: "insp-use" });
      createService();

      const result = svc.markUsed(PROJECT_ID, "insp-use", "chapter-03");
      expect(result).toBe(true);

      // Verify in DB
      const row = sqliteDb
        .prepare("SELECT attributes_json FROM kg_entities WHERE id = ?")
        .get("insp-use") as { attributes_json: string };
      const attrs = JSON.parse(row.attributes_json);
      expect(attrs.usedInChapter).toBe("chapter-03");
    });

    it("removes item from unused list after marking", () => {
      insertInspiration(sqliteDb, { id: "insp-target" });
      insertInspiration(sqliteDb, { id: "insp-other", name: "另一个灵感" });
      createService();

      expect(svc.listUnused(PROJECT_ID)).toHaveLength(2);

      svc.markUsed(PROJECT_ID, "insp-target", "ch-01");

      const remaining = svc.listUnused(PROJECT_ID);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe("insp-other");
    });

    it("returns false for already used entity (idempotency)", () => {
      insertInspiration(sqliteDb, {
        id: "insp-already",
        attributes_json: JSON.stringify({
          relatedEntities: [],
          usedInChapter: "ch-existing",
        }),
      });
      createService();

      const result = svc.markUsed(PROJECT_ID, "insp-already", "ch-new");
      expect(result).toBe(false);
    });

    it("returns false for wrong project", () => {
      insertInspiration(sqliteDb, { id: "insp-wp", project_id: OTHER_PROJECT });
      createService();

      const result = svc.markUsed(PROJECT_ID, "insp-wp", "ch-01");
      expect(result).toBe(false);
    });

    it("returns false for non-existent entity", () => {
      createService();

      const result = svc.markUsed(PROJECT_ID, "insp-ghost", "ch-01");
      expect(result).toBe(false);
    });
  });

  // ── 11-14. archiveStale ───────────────────────────────────────────

  describe("archiveStale", () => {
    it("archives only items older than 14 days", () => {
      // 20 days old — should be archived
      insertInspiration(sqliteDb, {
        id: "insp-stale",
        created_at: NOW - 20 * DAY_MS,
      });
      // 5 days old — should NOT be archived
      insertInspiration(sqliteDb, {
        id: "insp-fresh",
        created_at: NOW - 5 * DAY_MS,
      });

      createService();
      const count = svc.archiveStale(PROJECT_ID);

      expect(count).toBe(1);

      // Verify stale one is archived
      const staleRow = sqliteDb
        .prepare("SELECT attributes_json FROM kg_entities WHERE id = ?")
        .get("insp-stale") as { attributes_json: string };
      expect(JSON.parse(staleRow.attributes_json).archived).toBe(1);

      // Fresh one is untouched
      const freshRow = sqliteDb
        .prepare("SELECT attributes_json FROM kg_entities WHERE id = ?")
        .get("insp-fresh") as { attributes_json: string };
      expect(JSON.parse(freshRow.attributes_json).archived).toBeUndefined();
    });

    it("does not archive used items even if stale", () => {
      insertInspiration(sqliteDb, {
        id: "insp-used-old",
        created_at: NOW - 30 * DAY_MS,
        attributes_json: JSON.stringify({
          relatedEntities: [],
          usedInChapter: "ch-02",
        }),
      });

      createService();
      const count = svc.archiveStale(PROJECT_ID);
      expect(count).toBe(0);
    });

    it("does not re-archive already archived items", () => {
      insertInspiration(sqliteDb, {
        id: "insp-already-archived",
        created_at: NOW - 30 * DAY_MS,
        attributes_json: JSON.stringify({
          relatedEntities: [],
          archived: 1,
        }),
      });

      createService();
      const count = svc.archiveStale(PROJECT_ID);
      expect(count).toBe(0);
    });

    it("returns correct count when multiple items are archived", () => {
      insertInspiration(sqliteDb, {
        id: "insp-s1",
        created_at: NOW - 15 * DAY_MS,
      });
      insertInspiration(sqliteDb, {
        id: "insp-s2",
        created_at: NOW - 20 * DAY_MS,
      });
      insertInspiration(sqliteDb, {
        id: "insp-s3",
        created_at: NOW - 25 * DAY_MS,
      });

      createService();
      const count = svc.archiveStale(PROJECT_ID);
      expect(count).toBe(3);
    });

    it("does NOT archive item created exactly 14 days ago (boundary)", () => {
      insertInspiration(sqliteDb, {
        id: "insp-exact-14d",
        created_at: NOW - 14 * DAY_MS, // exactly at cutoff
      });

      createService();
      const count = svc.archiveStale(PROJECT_ID);
      expect(count).toBe(0);

      const row = sqliteDb
        .prepare("SELECT attributes_json FROM kg_entities WHERE id = ?")
        .get("insp-exact-14d") as { attributes_json: string };
      expect(JSON.parse(row.attributes_json).archived).toBeUndefined();
    });

    it("archives item created 14 days + 1ms ago (just past boundary)", () => {
      insertInspiration(sqliteDb, {
        id: "insp-14d-plus-1ms",
        created_at: NOW - 14 * DAY_MS - 1, // 1ms past cutoff
      });

      createService();
      const count = svc.archiveStale(PROJECT_ID);
      expect(count).toBe(1);

      const row = sqliteDb
        .prepare("SELECT attributes_json FROM kg_entities WHERE id = ?")
        .get("insp-14d-plus-1ms") as { attributes_json: string };
      expect(JSON.parse(row.attributes_json).archived).toBe(1);
    });
  });

  // ── 15-19. getDecayStats ──────────────────────────────────────────

  describe("getDecayStats", () => {
    it("counts fresh items (< 3 days)", () => {
      insertInspiration(sqliteDb, {
        id: "insp-f1",
        created_at: NOW - 1 * DAY_MS,
      });
      insertInspiration(sqliteDb, {
        id: "insp-f2",
        created_at: NOW - 2 * DAY_MS,
      });

      createService();
      const stats = svc.getDecayStats(PROJECT_ID);

      expect(stats.fresh).toBe(2);
      expect(stats.total).toBe(2);
    });

    it("counts reminder items (3-7 days)", () => {
      insertInspiration(sqliteDb, {
        id: "insp-r1",
        created_at: NOW - 4 * DAY_MS,
      });
      insertInspiration(sqliteDb, {
        id: "insp-r2",
        created_at: NOW - 6 * DAY_MS,
      });

      createService();
      const stats = svc.getDecayStats(PROJECT_ID);

      expect(stats.reminder).toBe(2);
      expect(stats.total).toBe(2);
    });

    it("counts fading items (7-14 days)", () => {
      insertInspiration(sqliteDb, {
        id: "insp-fad",
        created_at: NOW - 10 * DAY_MS,
      });

      createService();
      const stats = svc.getDecayStats(PROJECT_ID);

      expect(stats.fading).toBe(1);
      expect(stats.total).toBe(1);
    });

    it("counts archived items", () => {
      insertInspiration(sqliteDb, {
        id: "insp-arch",
        created_at: NOW - 30 * DAY_MS,
        attributes_json: JSON.stringify({
          relatedEntities: [],
          archived: 1,
        }),
      });

      createService();
      const stats = svc.getDecayStats(PROJECT_ID);

      expect(stats.archived).toBe(1);
      expect(stats.total).toBe(1);
    });

    it("classifies mixed states correctly", () => {
      // fresh (1d)
      insertInspiration(sqliteDb, {
        id: "mix-fresh",
        created_at: NOW - 1 * DAY_MS,
      });
      // reminder (5d)
      insertInspiration(sqliteDb, {
        id: "mix-remind",
        created_at: NOW - 5 * DAY_MS,
      });
      // fading (10d)
      insertInspiration(sqliteDb, {
        id: "mix-fading",
        created_at: NOW - 10 * DAY_MS,
      });
      // archived
      insertInspiration(sqliteDb, {
        id: "mix-archived",
        created_at: NOW - 30 * DAY_MS,
        attributes_json: JSON.stringify({ relatedEntities: [], archived: 1 }),
      });
      // used (doesn't count in decay tiers)
      insertInspiration(sqliteDb, {
        id: "mix-used",
        created_at: NOW - 3 * DAY_MS,
        attributes_json: JSON.stringify({
          relatedEntities: [],
          usedInChapter: "ch-01",
        }),
      });

      createService();
      const stats = svc.getDecayStats(PROJECT_ID);

      expect(stats.fresh).toBe(1);
      expect(stats.reminder).toBe(1);
      expect(stats.fading).toBe(1);
      expect(stats.archived).toBe(1);
      // total = fresh + reminder + fading + archived (used excluded from total)
      expect(stats.total).toBe(4);
    });
  });

  // ── 20-22. Decay tier boundaries ──────────────────────────────────

  describe("decay tier boundaries", () => {
    it("exactly 3 days = reminder (not fresh)", () => {
      insertInspiration(sqliteDb, {
        id: "insp-3d",
        created_at: NOW - 3 * DAY_MS,
      });

      createService();
      const items = svc.listUnused(PROJECT_ID);

      expect(items[0].decayDays).toBe(3);
      expect(items[0].decayTier).toBe("reminder");
    });

    it("exactly 7 days = fading (not reminder)", () => {
      insertInspiration(sqliteDb, {
        id: "insp-7d",
        created_at: NOW - 7 * DAY_MS,
      });

      createService();
      const items = svc.listUnused(PROJECT_ID);

      expect(items[0].decayDays).toBe(7);
      expect(items[0].decayTier).toBe("fading");
    });

    it("exactly 14 days = fading (not yet archived by DB, just tier)", () => {
      insertInspiration(sqliteDb, {
        id: "insp-14d",
        created_at: NOW - 14 * DAY_MS,
      });

      createService();
      const items = svc.listUnused(PROJECT_ID);

      // 14d item is still in listUnused (not archived in DB yet)
      expect(items[0].decayDays).toBe(14);
      // classifyDecayTier returns "fading" for >= 14d non-archived items
      expect(items[0].decayTier).toBe("fading");
    });
  });

  // ── 23. Large time gaps ───────────────────────────────────────────

  describe("large time gaps", () => {
    it("handles 100+ day old items correctly", () => {
      insertInspiration(sqliteDb, {
        id: "insp-ancient",
        created_at: NOW - 120 * DAY_MS,
      });

      createService();
      const items = svc.listUnused(PROJECT_ID);

      expect(items[0].decayDays).toBe(120);
      expect(items[0].decayTier).toBe("fading");
    });

    it("archiveStale sweeps 100+ day old items", () => {
      insertInspiration(sqliteDb, {
        id: "insp-ancient",
        created_at: NOW - 120 * DAY_MS,
      });

      createService();
      const count = svc.archiveStale(PROJECT_ID);
      expect(count).toBe(1);

      const items = svc.listUnused(PROJECT_ID);
      expect(items).toHaveLength(0);
    });
  });

  // ── 24-29. Cache behavior ─────────────────────────────────────────

  describe("caching", () => {
    it("listUnused returns cached result on second call", () => {
      insertInspiration(sqliteDb, { id: "insp-cached" });
      createService();

      const first = svc.listUnused(PROJECT_ID);
      // Insert another item directly into DB (bypassing service)
      insertInspiration(sqliteDb, { id: "insp-sneaky", name: "偷偷插入" });
      const second = svc.listUnused(PROJECT_ID);

      // Second call should return cached (still 1 item, not 2)
      expect(first).toHaveLength(1);
      expect(second).toHaveLength(1);
    });

    it("capture() invalidates listUnused cache", () => {
      insertInspiration(sqliteDb, { id: "insp-before" });
      createService();

      svc.listUnused(PROJECT_ID); // populate cache
      svc.capture(PROJECT_ID, "新灵感"); // should invalidate

      const items = svc.listUnused(PROJECT_ID);
      expect(items).toHaveLength(2);
    });

    it("markUsed() invalidates listUnused cache", () => {
      insertInspiration(sqliteDb, { id: "insp-mu" });
      createService();

      svc.listUnused(PROJECT_ID); // populate cache
      svc.markUsed(PROJECT_ID, "insp-mu", "ch-01");

      const items = svc.listUnused(PROJECT_ID);
      expect(items).toHaveLength(0);
    });

    it("archiveStale() invalidates cache", () => {
      insertInspiration(sqliteDb, {
        id: "insp-stale-c",
        created_at: NOW - 20 * DAY_MS,
      });
      createService();

      svc.listUnused(PROJECT_ID); // populate cache
      svc.archiveStale(PROJECT_ID);

      const items = svc.listUnused(PROJECT_ID);
      expect(items).toHaveLength(0);
    });

    it("cache expires after TTL (30s)", () => {
      insertInspiration(sqliteDb, { id: "insp-ttl" });
      createService();

      svc.listUnused(PROJECT_ID); // populate cache

      // Insert directly, advance clock past TTL
      insertInspiration(sqliteDb, { id: "insp-ttl-new", name: "过期后" });
      clock = NOW + 31_000; // 31 seconds later

      const items = svc.listUnused(PROJECT_ID);
      expect(items).toHaveLength(2); // cache expired, fresh query picks up new item
    });

    it("getDecayStats caches independently from listUnused", () => {
      insertInspiration(sqliteDb, {
        id: "insp-dual",
        created_at: NOW - 1 * DAY_MS,
      });
      createService();

      // Populate both caches
      svc.listUnused(PROJECT_ID);
      const stats1 = svc.getDecayStats(PROJECT_ID);

      // Insert directly
      insertInspiration(sqliteDb, { id: "insp-dual-2", created_at: NOW });

      // Both should still return cached
      const items2 = svc.listUnused(PROJECT_ID);
      const stats2 = svc.getDecayStats(PROJECT_ID);

      expect(items2).toHaveLength(1); // cached
      expect(stats2.total).toBe(stats1.total); // cached
    });
  });

  // ── 30-34. Disposed state ─────────────────────────────────────────

  describe("disposed service", () => {
    it("listUnused throws after dispose", () => {
      createService();
      svc.dispose();
      expect(() => svc.listUnused(PROJECT_ID)).toThrow(
        "QuickCaptureService has been disposed",
      );
    });

    it("capture throws after dispose", () => {
      createService();
      svc.dispose();
      expect(() => svc.capture(PROJECT_ID, "test")).toThrow(
        "QuickCaptureService has been disposed",
      );
    });

    it("markUsed throws after dispose", () => {
      createService();
      svc.dispose();
      expect(() => svc.markUsed(PROJECT_ID, "id", "ch")).toThrow(
        "QuickCaptureService has been disposed",
      );
    });

    it("archiveStale throws after dispose", () => {
      createService();
      svc.dispose();
      expect(() => svc.archiveStale(PROJECT_ID)).toThrow(
        "QuickCaptureService has been disposed",
      );
    });

    it("getDecayStats throws after dispose", () => {
      createService();
      svc.dispose();
      expect(() => svc.getDecayStats(PROJECT_ID)).toThrow(
        "QuickCaptureService has been disposed",
      );
    });
  });

  // ── 35-38. Parameter validation ───────────────────────────────────

  describe("parameter validation", () => {
    it("listUnused throws for empty projectId", () => {
      createService();
      expect(() => svc.listUnused("")).toThrow("projectId is required");
    });

    it("capture throws for empty content", () => {
      createService();
      expect(() => svc.capture(PROJECT_ID, "")).toThrow("content is required");
    });

    it("markUsed throws for empty entityId", () => {
      createService();
      expect(() => svc.markUsed(PROJECT_ID, "", "ch-01")).toThrow(
        "entityId is required",
      );
    });

    it("markUsed throws for empty chapterId", () => {
      createService();
      expect(() => svc.markUsed(PROJECT_ID, "id", "")).toThrow(
        "chapterId is required",
      );
    });

    it("capture throws for empty projectId", () => {
      createService();
      expect(() => svc.capture("", "content")).toThrow(
        "projectId is required",
      );
    });

    it("archiveStale throws for empty projectId", () => {
      createService();
      expect(() => svc.archiveStale("")).toThrow("projectId is required");
    });

    it("getDecayStats throws for empty projectId", () => {
      createService();
      expect(() => svc.getDecayStats("")).toThrow("projectId is required");
    });
  });

  // ── 39. relatedEntities from attributes_json ──────────────────────

  describe("relatedEntities parsing", () => {
    it("parses relatedEntities from attributes_json", () => {
      insertInspiration(sqliteDb, {
        id: "insp-rel",
        attributes_json: JSON.stringify({
          relatedEntities: ["char-001", "loc-002"],
        }),
      });

      createService();
      const items = svc.listUnused(PROJECT_ID);

      expect(items[0].relatedEntities).toEqual(["char-001", "loc-002"]);
    });

    it("defaults to empty array when relatedEntities missing", () => {
      insertInspiration(sqliteDb, {
        id: "insp-no-rel",
        attributes_json: "{}",
      });

      createService();
      const items = svc.listUnused(PROJECT_ID);

      expect(items[0].relatedEntities).toEqual([]);
    });
  });

  // ── 40. Mixed states in listUnused ────────────────────────────────

  describe("mixed states", () => {
    it("listUnused excludes archived and used items", () => {
      // Active unused — should appear
      insertInspiration(sqliteDb, {
        id: "insp-active",
        name: "活跃灵感",
        created_at: NOW - 2 * DAY_MS,
      });

      // Archived — should NOT appear
      insertInspiration(sqliteDb, {
        id: "insp-archived",
        name: "已归档",
        created_at: NOW - 20 * DAY_MS,
        attributes_json: JSON.stringify({
          relatedEntities: [],
          archived: 1,
        }),
      });

      // Used — should NOT appear
      insertInspiration(sqliteDb, {
        id: "insp-used",
        name: "已使用",
        created_at: NOW - 5 * DAY_MS,
        attributes_json: JSON.stringify({
          relatedEntities: [],
          usedInChapter: "ch-03",
        }),
      });

      // Different project — should NOT appear
      insertInspiration(sqliteDb, {
        id: "insp-other-proj",
        name: "其他项目",
        project_id: OTHER_PROJECT,
      });

      createService();
      const items = svc.listUnused(PROJECT_ID);

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("insp-active");
      expect(items[0].content).toBe("活跃灵感");
    });
  });

  // ── Additional edge cases ─────────────────────────────────────────

  describe("edge cases", () => {
    it("capture followed by immediate listUnused includes new item", () => {
      createService();

      const captured = svc.capture(PROJECT_ID, "即时灵感");
      const items = svc.listUnused(PROJECT_ID);

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(captured.id);
      expect(items[0].content).toBe("即时灵感");
    });

    it("getDecayStats after archiveStale reflects archived count", () => {
      insertInspiration(sqliteDb, {
        id: "insp-to-archive",
        created_at: NOW - 20 * DAY_MS,
      });
      insertInspiration(sqliteDb, {
        id: "insp-keep-fresh",
        created_at: NOW - 1 * DAY_MS,
      });

      createService();
      svc.archiveStale(PROJECT_ID);

      const stats = svc.getDecayStats(PROJECT_ID);
      expect(stats.archived).toBe(1);
      expect(stats.fresh).toBe(1);
      expect(stats.total).toBe(2);
    });

    it("non-inspiration entities are ignored by all methods", () => {
      // Insert a character entity — should be invisible to this service
      sqliteDb
        .prepare(
          `INSERT INTO kg_entities (id, project_id, type, name, attributes_json, created_at, updated_at)
           VALUES (?, ?, 'character', ?, '{}', ?, ?)`,
        )
        .run(
          "char-001",
          PROJECT_ID,
          "主角",
          new Date(NOW).toISOString(),
          new Date(NOW).toISOString(),
        );

      createService();

      expect(svc.listUnused(PROJECT_ID)).toEqual([]);
      expect(svc.getDecayStats(PROJECT_ID).total).toBe(0);
    });

    it("structurally unexpected but valid JSON degrades gracefully", () => {
      // Insert valid JSON but with unexpected shape (number instead of array).
      // SQLite json_extract handles this fine; JS parsing degrades gracefully.
      insertInspiration(sqliteDb, {
        id: "insp-weird-json",
        attributes_json: JSON.stringify({ relatedEntities: 42, extra: true }),
      });

      createService();
      const items = svc.listUnused(PROJECT_ID);

      // Should still return the item — relatedEntities falls back to []
      expect(items).toHaveLength(1);
      expect(items[0].relatedEntities).toEqual([]);
    });
  });
});
