import type { IpcMain } from "electron";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { registerEngagementIpcHandlers } from "../engagement";

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

function createHarness(db: Database.Database | null): {
  invoke<T>(channel: string, payload?: unknown): Promise<T>;
} {
  const handlers = new Map<string, Handler>();
  const ipcMain = {
    handle(channel: string, listener: Handler) {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  registerEngagementIpcHandlers({
    ipcMain,
    db,
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    } as never,
  });

  return {
    async invoke<T>(channel: string, payload: unknown = {}): Promise<T> {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`missing handler: ${channel}`);
      }
      return (await handler({}, payload)) as T;
    },
  };
}

function createDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE documents (
      document_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      content_text TEXT NOT NULL DEFAULT '',
      word_count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE kg_entities (
      entity_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      attributes_json TEXT,
      created_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE kg_relations (
      relation_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      source_entity_id TEXT NOT NULL,
      target_entity_id TEXT NOT NULL,
      relation_type TEXT NOT NULL
    );

    CREATE TABLE generation_traces (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE document_versions (
      version_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE project_milestones (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL,
      metric      TEXT NOT NULL,
      threshold   INTEGER NOT NULL,
      value       INTEGER NOT NULL,
      reached_at  INTEGER NOT NULL,
      created_at  INTEGER NOT NULL,
      UNIQUE(project_id, metric, threshold)
    );
  `);
  return db;
}

describe("registerEngagementIpcHandlers", () => {
  let db: Database.Database;
  const PROJECT_ID = "proj-engagement-001";

  beforeEach(() => {
    db = createDb();
  });

  afterEach(() => {
    db.close();
  });

  it("returns DB_ERROR when database is unavailable", async () => {
    const harness = createHarness(null);
    const result = await harness.invoke<{
      ok: boolean;
      error?: { code: string; details?: unknown };
    }>("engagement:worldscale:get", { projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("DB_ERROR");
    expect(result.error?.details).toBeNull();
  });

  it("validates projectId", async () => {
    const harness = createHarness(db);
    const result = await harness.invoke<{
      ok: boolean;
      error?: { code: string };
    }>("engagement:completion:estimate", { projectId: "" });
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("returns world scale and completion estimate", async () => {
    const harness = createHarness(db);

    db.prepare(
      "INSERT INTO documents (document_id, project_id, type, status, content_text, word_count, updated_at) VALUES (?, ?, 'chapter', ?, ?, ?, ?)",
    ).run("doc-1", PROJECT_ID, "completed", "alpha", 2000, 1);
    db.prepare(
      "INSERT INTO documents (document_id, project_id, type, status, content_text, word_count, updated_at) VALUES (?, ?, 'chapter', ?, ?, ?, ?)",
    ).run("doc-2", PROJECT_ID, "draft", "beta", 500, 2);
    db.prepare(
      "INSERT INTO kg_entities (entity_id, project_id, type, name, attributes_json, created_at) VALUES (?, ?, 'character', ?, '{}', 1)",
    ).run("e-1", PROJECT_ID, "Hero");
    db.prepare(
      "INSERT INTO kg_entities (entity_id, project_id, type, name, attributes_json, created_at) VALUES (?, ?, 'location', ?, '{}', 1)",
    ).run("e-2", PROJECT_ID, "City");
    db.prepare(
      "INSERT INTO kg_entities (entity_id, project_id, type, name, attributes_json, created_at) VALUES (?, ?, 'foreshadowing', ?, ?, 1)",
    ).run("e-3", PROJECT_ID, "Clue", '{"resolved":1}');
    db.prepare(
      "INSERT INTO kg_relations (relation_id, project_id, source_entity_id, target_entity_id, relation_type) VALUES (?, ?, ?, ?, ?)",
    ).run("r-1", PROJECT_ID, "e-1", "e-2", "ally");

    db.prepare(
      "INSERT INTO document_versions (version_id, project_id, document_id, word_count, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(
      "v-1",
      PROJECT_ID,
      "doc-1",
      800,
      Date.parse("2026-04-14T00:00:00.000Z"),
    );

    const worldScale = await harness.invoke<{
      ok: true;
      data: {
        totalWords: number;
        characters: number;
        locations: number;
        relations: number;
        chapters: number;
        foreshadowings: { total: number; resolved: number };
      };
    }>("engagement:worldscale:get", { projectId: PROJECT_ID });
    expect(worldScale.ok).toBe(true);
    expect(worldScale.data.totalWords).toBe(2500);
    expect(worldScale.data.characters).toBe(1);
    expect(worldScale.data.locations).toBe(1);
    expect(worldScale.data.relations).toBe(1);
    expect(worldScale.data.chapters).toBe(2);
    expect(worldScale.data.foreshadowings).toEqual({ total: 1, resolved: 1 });

    const completion = await harness.invoke<{
      ok: true;
      data: {
        currentWordCount: number;
        estimatedTotalWords: number;
      };
    }>("engagement:completion:estimate", { projectId: PROJECT_ID });
    expect(completion.ok).toBe(true);
    expect(completion.data.currentWordCount).toBe(2500);
    expect(completion.data.estimatedTotalWords).toBeGreaterThanOrEqual(2500);
  });

  it("analyzes writing style with valid scope", async () => {
    const harness = createHarness(db);
    db.prepare(
      "INSERT INTO documents (document_id, project_id, type, status, content_text, word_count, updated_at) VALUES (?, ?, 'chapter', 'completed', ?, ?, ?)",
    ).run("doc-1", PROJECT_ID, '他说："继续前进。"', 1200, 2);
    db.prepare(
      "INSERT INTO kg_entities (entity_id, project_id, type, name, description, attributes_json, created_at) VALUES (?, ?, 'character', ?, ?, ?, 1)",
    ).run("char-1", PROJECT_ID, "Mentor", "experienced mentor", '{"archetype":"mentor"}');
    db.prepare(
      "INSERT INTO kg_relations (relation_id, project_id, source_entity_id, target_entity_id, relation_type) VALUES (?, ?, ?, ?, ?)",
    ).run("rel-1", PROJECT_ID, "char-1", "char-1", "guides");
    db.prepare(
      "INSERT INTO generation_traces (id, project_id, started_at, completed_at, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(
      "trace-1",
      PROJECT_ID,
      Date.parse("2026-04-15T09:00:00.000Z"),
      Date.parse("2026-04-15T09:20:00.000Z"),
      Date.parse("2026-04-15T09:20:00.000Z"),
    );

    const result = await harness.invoke<{
      ok: true;
      data: {
        narrativePatterns: Array<{ pattern: string }>;
        characterArchetypes: Array<{ archetype: string }>;
      };
    }>("engagement:style:analyze", { projectId: PROJECT_ID, scope: "recent" });

    expect(result.ok).toBe(true);
    expect(result.data.narrativePatterns[0]?.pattern).toBe("guides");
    expect(result.data.characterArchetypes[0]?.archetype).toBe("mentor");
  });

  it("worldscale read path does not persist milestones", async () => {
    const harness = createHarness(db);
    db.prepare(
      "INSERT INTO documents (document_id, project_id, type, status, content_text, word_count, updated_at) VALUES (?, ?, 'chapter', 'draft', ?, ?, ?)",
    ).run(
      "doc-m-1",
      PROJECT_ID,
      "chapter text",
      12_000,
      Date.parse("2026-04-15T10:00:00.000Z"),
    );

    await harness.invoke("engagement:worldscale:get", { projectId: PROJECT_ID });

    const result = await harness.invoke<{
      ok: true;
      data: {
        items: Array<{ id: string; metric: string; threshold: number }>;
      };
    }>("engagement:milestone:list", { projectId: PROJECT_ID });

    expect(result.ok).toBe(true);
    expect(result.data.items).toHaveLength(0);
  });
});
