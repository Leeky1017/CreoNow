import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createWritingStyleAnalysisService,
  type WritingStyleAnalysisService,
} from "../writingStyleAnalysisService";
import type { DbLike } from "../dbTypes";

const PROJECT_ID = "proj-style-001";
const OTHER_PROJECT = "proj-style-999";

function createDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE documents (
      document_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'chapter',
      title TEXT NOT NULL DEFAULT '',
      content_text TEXT NOT NULL DEFAULT '',
      word_count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE kg_entities (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      attributes_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE kg_relations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      source_entity_id TEXT NOT NULL,
      target_entity_id TEXT NOT NULL,
      relation_type TEXT NOT NULL
    );

    CREATE TABLE generation_traces (
      trace_id TEXT PRIMARY KEY,
      project_id TEXT,
      started_at INTEGER NOT NULL,
      completed_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  return db;
}

describe("WritingStyleAnalysisService", () => {
  let db: Database.Database;
  let service: WritingStyleAnalysisService;

  beforeEach(() => {
    db = createDb();
    service = createWritingStyleAnalysisService({
      db: db as unknown as DbLike,
    });
  });

  afterEach(() => {
    db.close();
  });

  it("returns empty profile on empty project", () => {
    const profile = service.analyze({ projectId: PROJECT_ID, scope: "full" });
    expect(profile.narrativePatterns).toEqual([]);
    expect(profile.characterArchetypes).toEqual([]);
    expect(profile.rhythmStats).toEqual({
      avgChapterLength: 0,
      dialogueRatio: 0,
      paceVariation: 0,
    });
    expect(profile.writingSchedule).toEqual({
      peakHours: [],
      avgSessionDuration: 0,
      streakDays: 0,
    });
  });

  it("builds profile from docs, KG, and traces", () => {
    db.prepare(
      "INSERT INTO documents (document_id, project_id, type, title, content_text, word_count, updated_at) VALUES (?, ?, 'chapter', ?, ?, ?, ?)",
    ).run(
      "doc-1",
      PROJECT_ID,
      "第一章",
      "“你来了。”他看向窗外。风很冷。",
      1200,
      100,
    );
    db.prepare(
      "INSERT INTO documents (document_id, project_id, type, title, content_text, word_count, updated_at) VALUES (?, ?, 'chapter', ?, ?, ?, ?)",
    ).run(
      "doc-2",
      PROJECT_ID,
      "第二章",
      "她说：“今晚别出门。”然后转身。",
      800,
      200,
    );
    db.prepare(
      "INSERT INTO documents (document_id, project_id, type, title, content_text, word_count, updated_at) VALUES (?, ?, 'chapter', ?, ?, ?, ?)",
    ).run(
      "doc-3",
      OTHER_PROJECT,
      "Other",
      "无关文档",
      9999,
      300,
    );

    db.prepare(
      "INSERT INTO kg_entities (id, project_id, type, name, description, attributes_json, created_at) VALUES (?, ?, 'character', ?, ?, ?, ?)",
    ).run(
      "char-1",
      PROJECT_ID,
      "导师A",
      "冷静的导师",
      JSON.stringify({ archetype: "mentor" }),
      "2026-01-01T00:00:00.000Z",
    );
    db.prepare(
      "INSERT INTO kg_entities (id, project_id, type, name, description, attributes_json, created_at) VALUES (?, ?, 'character', ?, ?, ?, ?)",
    ).run(
      "char-2",
      PROJECT_ID,
      "主角B",
      "叛逆冲动",
      "{}",
      "2026-01-02T00:00:00.000Z",
    );

    db.prepare(
      "INSERT INTO kg_relations (id, project_id, source_entity_id, target_entity_id, relation_type) VALUES (?, ?, ?, ?, ?)",
    ).run("rel-1", PROJECT_ID, "char-1", "char-2", "mentor_of");
    db.prepare(
      "INSERT INTO kg_relations (id, project_id, source_entity_id, target_entity_id, relation_type) VALUES (?, ?, ?, ?, ?)",
    ).run("rel-2", PROJECT_ID, "char-2", "char-1", "depends_on");
    db.prepare(
      "INSERT INTO kg_relations (id, project_id, source_entity_id, target_entity_id, relation_type) VALUES (?, ?, ?, ?, ?)",
    ).run("rel-3", PROJECT_ID, "char-2", "char-1", "depends_on");

    const day = 86_400_000;
    db.prepare(
      "INSERT INTO generation_traces (trace_id, project_id, started_at, completed_at, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run("t1", PROJECT_ID, day, day + 30 * 60_000, day);
    db.prepare(
      "INSERT INTO generation_traces (trace_id, project_id, started_at, completed_at, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run("t2", PROJECT_ID, 2 * day, 2 * day + 60 * 60_000, 2 * day);
    db.prepare(
      "INSERT INTO generation_traces (trace_id, project_id, started_at, completed_at, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run("t3", PROJECT_ID, 3 * day, 3 * day + 15 * 60_000, 3 * day);

    const profile = service.analyze({ projectId: PROJECT_ID, scope: "full" });

    expect(profile.narrativePatterns[0]).toMatchObject({
      pattern: "depends_on",
      frequency: 2,
    });
    expect(profile.characterArchetypes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          archetype: "mentor",
          characters: ["导师A"],
        }),
        expect.objectContaining({
          archetype: "rebel",
          characters: ["主角B"],
        }),
      ]),
    );
    expect(profile.rhythmStats.avgChapterLength).toBe(1000);
    expect(profile.rhythmStats.dialogueRatio).toBeGreaterThan(0);
    expect(profile.rhythmStats.paceVariation).toBeGreaterThan(0);
    expect(profile.writingSchedule.peakHours).toEqual([0]);
    expect(profile.writingSchedule.avgSessionDuration).toBeCloseTo(35, 0);
    expect(profile.writingSchedule.streakDays).toBe(3);
  });

  it("scope=recent limits chapter sample to latest ten rows", () => {
    for (let i = 1; i <= 12; i++) {
      db.prepare(
        "INSERT INTO documents (document_id, project_id, type, title, content_text, word_count, updated_at) VALUES (?, ?, 'chapter', ?, ?, ?, ?)",
      ).run(
        `doc-${i}`,
        PROJECT_ID,
        `第${i}章`,
        `章节 ${i}`,
        i * 100,
        i,
      );
    }

    const full = service.analyze({ projectId: PROJECT_ID, scope: "full" });
    const recent = service.analyze({ projectId: PROJECT_ID, scope: "recent" });

    expect(full.rhythmStats.avgChapterLength).toBe(650);
    expect(recent.rhythmStats.avgChapterLength).toBe(750);
  });

  it("throws when projectId is missing", () => {
    expect(() =>
      service.analyze({ projectId: "", scope: "full" }),
    ).toThrow("projectId is required");
  });
});
