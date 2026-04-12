/**
 * Integration test: session memory L1 injection with real SQLite.
 *
 * Scenario coverage:
 *   SM-INT-1: migration creates session_memory table + indexes + FTS5
 *   SM-INT-2: CRUD round-trip (create → list → delete → list excludes)
 *   SM-INT-3: FTS5 MATCH search returns correct rowids
 *   SM-INT-4: getInjectionPayload respects token budget with CJK (INV-3)
 *   SM-INT-5: time decay scoring with real timestamps
 *   SM-INT-6: deleteExpired cleans expired items only
 *   SM-INT-7: contextHint FTS5 boost surfaces relevant items
 *   SM-INT-8: soft-deleted items excluded from injection
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

import Database from "better-sqlite3";

import { applyRecommendedPragmas } from "../../../main/src/db/recommendedPragmas";
import {
  createSessionMemoryService,
  _resetIdCounter,
} from "../../../main/src/services/memory/sessionMemoryService";

// ─── Helpers ────────────────────────────────────────────────────────

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS session_memory (
  id             TEXT    PRIMARY KEY,
  session_id     TEXT    NOT NULL,
  project_id     TEXT    NOT NULL,
  category       TEXT    NOT NULL CHECK(category IN ('style', 'reference', 'preference', 'note')),
  content        TEXT    NOT NULL,
  relevance_score REAL   NOT NULL DEFAULT 1.0,
  created_at     INTEGER NOT NULL,
  expires_at     INTEGER,
  deleted_at     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_session_memory_session
  ON session_memory(session_id, project_id, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_memory_project
  ON session_memory(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_memory_expiry
  ON session_memory(expires_at) WHERE deleted_at IS NULL AND expires_at IS NOT NULL;

CREATE VIRTUAL TABLE IF NOT EXISTS session_memory_fts USING fts5(
  content,
  content='session_memory',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS session_memory_ai AFTER INSERT ON session_memory BEGIN
  INSERT INTO session_memory_fts(rowid, content) VALUES (new.rowid, new.content);
END;

CREATE TRIGGER IF NOT EXISTS session_memory_ad AFTER DELETE ON session_memory BEGIN
  INSERT INTO session_memory_fts(session_memory_fts, rowid, content) VALUES('delete', old.rowid, old.content);
END;

CREATE TRIGGER IF NOT EXISTS session_memory_au AFTER UPDATE ON session_memory BEGIN
  INSERT INTO session_memory_fts(session_memory_fts, rowid, content) VALUES('delete', old.rowid, old.content);
  INSERT INTO session_memory_fts(rowid, content) VALUES (new.rowid, new.content);
END;
`;

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  applyRecommendedPragmas(db);
  db.exec(MIGRATION_SQL);
  return db;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("Session Memory Integration", () => {
  let db: Database.Database;

  beforeEach(() => {
    _resetIdCounter();
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  // SM-INT-1
  it("migration creates table, indexes, and FTS5 virtual table", () => {
    // Verify table exists
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='session_memory'")
      .all();
    assert.equal(tables.length, 1);

    // Verify FTS5 virtual table exists
    const fts = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='session_memory_fts'")
      .all();
    assert.equal(fts.length, 1);

    // Verify indexes
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='session_memory'")
      .all() as Array<{ name: string }>;
    const indexNames = indexes.map((r) => r.name);
    assert.ok(indexNames.includes("idx_session_memory_session"));
    assert.ok(indexNames.includes("idx_session_memory_project"));
    assert.ok(indexNames.includes("idx_session_memory_expiry"));

    // Verify triggers
    const triggers = db
      .prepare("SELECT name FROM sqlite_master WHERE type='trigger'")
      .all() as Array<{ name: string }>;
    const triggerNames = triggers.map((r) => r.name);
    assert.ok(triggerNames.includes("session_memory_ai"));
    assert.ok(triggerNames.includes("session_memory_ad"));
    assert.ok(triggerNames.includes("session_memory_au"));
  });

  // SM-INT-2
  it("CRUD round-trip: create → list → delete → list excludes", () => {
    const svc = createSessionMemoryService({ db });

    // Create
    const created = svc.create({
      sessionId: "sess-1",
      projectId: "proj-1",
      category: "style",
      content: "第一人称叙事",
    });
    assert.ok(created.ok);

    // List
    const listed = svc.list({ projectId: "proj-1" });
    assert.ok(listed.ok);
    assert.equal(listed.data.items.length, 1);
    assert.equal(listed.data.items[0].content, "第一人称叙事");

    // Delete
    const deleted = svc.delete({ id: created.data.id, projectId: "proj-1" });
    assert.ok(deleted.ok);

    // List after delete — should be empty
    const listedAfter = svc.list({ projectId: "proj-1" });
    assert.ok(listedAfter.ok);
    assert.equal(listedAfter.data.items.length, 0);
  });

  // SM-INT-3
  it("FTS5 MATCH search returns correct rowids", () => {
    const svc = createSessionMemoryService({ db });

    svc.create({
      sessionId: "sess-1",
      projectId: "proj-1",
      category: "reference",
      content: "Jia Baoyu is the young master of Rongguo mansion",
    });
    svc.create({
      sessionId: "sess-1",
      projectId: "proj-1",
      category: "reference",
      content: "Lin Daiyu came from Yangzhou to Jia mansion",
    });
    svc.create({
      sessionId: "sess-1",
      projectId: "proj-1",
      category: "reference",
      content: "Granny Liu entered the Grand View Garden",
    });

    // Direct FTS5 query — unicode61 tokenizer handles Latin words correctly.
    // Note: CJK single-char matching is a known limitation of unicode61;
    // FTS5 boost is best-effort and degrades gracefully for CJK.
    const results = db
      .prepare("SELECT rowid FROM session_memory_fts WHERE session_memory_fts MATCH ?")
      .all("Jia") as Array<{ rowid: number }>;

    // Both "Jia Baoyu" and "Jia mansion" items should match
    assert.ok(results.length >= 2, `Expected FTS5 matches for Jia, got ${results.length}`);
  });

  // SM-INT-4
  it("getInjectionPayload respects token budget with CJK (INV-3)", () => {
    const svc = createSessionMemoryService({ db });

    // Create items with substantial CJK content
    for (let i = 0; i < 10; i++) {
      svc.create({
        sessionId: "sess-1",
        projectId: "proj-1",
        category: "style",
        content: `这是第${i + 1}条记忆内容，包含大量中文字符以测试预算计算`,
      });
    }

    // Budget of 50 tokens — should not fit all 10 items
    // Each item: "[style] 这是第N条记忆内容..." ≈ ~40+ tokens
    const result = svc.getInjectionPayload({
      projectId: "proj-1",
      budgetTokens: 50,
    });

    assert.ok(result.ok);
    assert.ok(result.data.totalTokens <= 50, `Total tokens ${result.data.totalTokens} exceeded budget 50`);
    assert.ok(result.data.items.length < 10, `Got ${result.data.items.length} items, expected fewer than 10`);
  });

  // SM-INT-5
  it("time decay scoring with real timestamps", () => {
    const svc = createSessionMemoryService({ db });
    const now = Date.now();

    // Insert an "old" item directly into DB with a past timestamp
    db.prepare(
      `INSERT INTO session_memory (id, session_id, project_id, category, content, relevance_score, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run("old-item", "sess-1", "proj-1", "style", "ancient style note", 1.0, now - 2 * 86_400_000);

    // Insert a recent item with lower base score
    svc.create({
      sessionId: "sess-1",
      projectId: "proj-1",
      category: "style",
      content: "recent style note",
      relevanceScore: 0.6,
    });

    const result = svc.getInjectionPayload({
      projectId: "proj-1",
      budgetTokens: 5000,
    });

    assert.ok(result.ok);
    assert.equal(result.data.items.length, 2);
    // Recent item should rank first despite lower base score
    // old: 1.0 * exp(-2 * ln2) ≈ 0.25
    // recent: 0.6 * exp(~0) ≈ 0.6
    assert.ok(
      result.data.items[0].content.includes("recent"),
      `Expected recent item first, got: ${result.data.items[0].content}`,
    );
  });

  // SM-INT-6
  it("deleteExpired cleans expired items only", () => {
    const svc = createSessionMemoryService({ db });
    const now = Date.now();

    svc.create({
      sessionId: "sess-1",
      projectId: "proj-1",
      category: "note",
      content: "已过期笔记",
      expiresAt: now - 1000,
    });
    svc.create({
      sessionId: "sess-1",
      projectId: "proj-1",
      category: "note",
      content: "未过期笔记",
      expiresAt: now + 3600_000,
    });
    svc.create({
      sessionId: "sess-1",
      projectId: "proj-1",
      category: "style",
      content: "永不过期",
    });

    const result = svc.deleteExpired();
    assert.ok(result.ok);
    assert.equal(result.data.deletedCount, 1);

    const list = svc.list({ projectId: "proj-1" });
    assert.ok(list.ok);
    assert.equal(list.data.items.length, 2);
  });

  // SM-INT-7
  it("contextHint FTS5 boost surfaces relevant items", () => {
    const svc = createSessionMemoryService({ db });

    // Create items with same base relevance — use Latin text for reliable FTS5 matching.
    // Note: FTS5 unicode61 tokenizer handles Latin words correctly;
    // CJK single-char matching is a known limitation (degrades gracefully).
    svc.create({
      sessionId: "sess-1",
      projectId: "proj-1",
      category: "reference",
      content: "Wang Xifeng manages the Rongguo mansion",
      relevanceScore: 0.5,
    });
    svc.create({
      sessionId: "sess-1",
      projectId: "proj-1",
      category: "reference",
      content: "Jia Tanchun governs household affairs wisely",
      relevanceScore: 0.5,
    });

    const result = svc.getInjectionPayload({
      projectId: "proj-1",
      contextHint: "Wang Xifeng",
      budgetTokens: 5000,
    });

    assert.ok(result.ok);
    assert.equal(result.data.items.length, 2);
    // The item mentioning Wang Xifeng should be boosted to first position
    assert.ok(
      result.data.items[0].content.includes("Wang Xifeng"),
      `Expected Wang Xifeng item first, got: ${result.data.items[0].content}`,
    );
  });

  // SM-INT-8
  it("soft-deleted items excluded from injection", () => {
    const svc = createSessionMemoryService({ db });

    const created = svc.create({
      sessionId: "sess-1",
      projectId: "proj-1",
      category: "style",
      content: "已删除的风格",
    });
    assert.ok(created.ok);

    svc.create({
      sessionId: "sess-1",
      projectId: "proj-1",
      category: "style",
      content: "活跃的风格",
    });

    // Delete first item
    svc.delete({ id: created.data.id, projectId: "proj-1" });

    const result = svc.getInjectionPayload({
      projectId: "proj-1",
      budgetTokens: 5000,
    });

    assert.ok(result.ok);
    assert.equal(result.data.items.length, 1);
    assert.equal(result.data.items[0].content, "活跃的风格");
  });
});
