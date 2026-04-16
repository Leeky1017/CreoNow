import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createWorldScaleService,
  type WorldScaleService,
} from "../worldScaleService";
import type { DbLike } from "../dbTypes";

const PROJECT_ID = "proj-world-001";
const OTHER_PROJECT = "proj-world-999";
const NOW = 1_700_000_000_000;

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE documents (
      document_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'chapter',
      word_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE kg_entities (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      attributes_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE kg_relations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL
    );
  `);
  return db;
}

function insertDocument(args: {
  db: Database.Database;
  id: string;
  projectId?: string;
  type?: string;
  wordCount?: number;
}): void {
  args.db
    .prepare(
      "INSERT INTO documents (document_id, project_id, type, word_count) VALUES (?, ?, ?, ?)",
    )
    .run(
      args.id,
      args.projectId ?? PROJECT_ID,
      args.type ?? "chapter",
      args.wordCount ?? 0,
    );
}

function insertEntity(args: {
  db: Database.Database;
  id: string;
  projectId?: string;
  type: string;
  resolved?: boolean;
}): void {
  const attrs =
    args.type === "foreshadowing"
      ? JSON.stringify({ resolved: args.resolved === true ? 1 : 0 })
      : "{}";
  args.db
    .prepare(
      "INSERT INTO kg_entities (id, project_id, type, attributes_json) VALUES (?, ?, ?, ?)",
    )
    .run(args.id, args.projectId ?? PROJECT_ID, args.type, attrs);
}

function insertRelation(args: {
  db: Database.Database;
  id: string;
  projectId?: string;
}): void {
  args.db
    .prepare("INSERT INTO kg_relations (id, project_id) VALUES (?, ?)")
    .run(args.id, args.projectId ?? PROJECT_ID);
}

describe("WorldScaleService", () => {
  let sqliteDb: Database.Database;
  let now = NOW;
  let service: WorldScaleService;

  beforeEach(() => {
    sqliteDb = createTestDb();
    now = NOW;
    service = createWorldScaleService({
      db: sqliteDb as unknown as DbLike,
      nowMs: () => now,
    });
  });

  afterEach(() => {
    service.dispose();
    sqliteDb.close();
  });

  it("returns zero scale for empty project", () => {
    expect(service.getWorldScale(PROJECT_ID)).toEqual({
      totalWords: 0,
      characters: 0,
      relations: 0,
      locations: 0,
      foreshadowings: {
        total: 0,
        resolved: 0,
      },
      chapters: 0,
    });
  });

  it("aggregates document, entity, and relation metrics", () => {
    insertDocument({ db: sqliteDb, id: "doc-1", type: "chapter", wordCount: 1200 });
    insertDocument({ db: sqliteDb, id: "doc-2", type: "chapter", wordCount: 800 });
    insertDocument({ db: sqliteDb, id: "doc-3", type: "outline", wordCount: 150 });

    insertEntity({ db: sqliteDb, id: "char-1", type: "character" });
    insertEntity({ db: sqliteDb, id: "char-2", type: "character" });
    insertEntity({ db: sqliteDb, id: "loc-1", type: "location" });
    insertEntity({ db: sqliteDb, id: "fs-1", type: "foreshadowing", resolved: false });
    insertEntity({ db: sqliteDb, id: "fs-2", type: "foreshadowing", resolved: true });

    insertRelation({ db: sqliteDb, id: "rel-1" });
    insertRelation({ db: sqliteDb, id: "rel-2" });
    insertRelation({ db: sqliteDb, id: "rel-3" });

    expect(service.getWorldScale(PROJECT_ID)).toEqual({
      totalWords: 2150,
      characters: 2,
      relations: 3,
      locations: 1,
      foreshadowings: {
        total: 2,
        resolved: 1,
      },
      chapters: 2,
    });
  });

  it("isolates project scope", () => {
    insertDocument({ db: sqliteDb, id: "doc-main", projectId: PROJECT_ID, wordCount: 600 });
    insertDocument({ db: sqliteDb, id: "doc-other", projectId: OTHER_PROJECT, wordCount: 9999 });
    insertEntity({ db: sqliteDb, id: "char-main", projectId: PROJECT_ID, type: "character" });
    insertEntity({ db: sqliteDb, id: "char-other", projectId: OTHER_PROJECT, type: "character" });
    insertRelation({ db: sqliteDb, id: "rel-main", projectId: PROJECT_ID });
    insertRelation({ db: sqliteDb, id: "rel-other", projectId: OTHER_PROJECT });

    expect(service.getWorldScale(PROJECT_ID)).toMatchObject({
      totalWords: 600,
      characters: 1,
      relations: 1,
    });
  });

  it("caches for 30s and invalidates explicitly", () => {
    insertDocument({ db: sqliteDb, id: "doc-1", wordCount: 100 });
    const first = service.getWorldScale(PROJECT_ID);
    expect(first.totalWords).toBe(100);

    insertDocument({ db: sqliteDb, id: "doc-2", wordCount: 300 });
    const cached = service.getWorldScale(PROJECT_ID);
    expect(cached.totalWords).toBe(100);

    service.invalidateCache(PROJECT_ID);
    const refreshed = service.getWorldScale(PROJECT_ID);
    expect(refreshed.totalWords).toBe(400);
  });

  it("refreshes after ttl expiry", () => {
    insertDocument({ db: sqliteDb, id: "doc-1", wordCount: 100 });
    expect(service.getWorldScale(PROJECT_ID).totalWords).toBe(100);

    insertDocument({ db: sqliteDb, id: "doc-2", wordCount: 200 });
    now += 30_001;

    expect(service.getWorldScale(PROJECT_ID).totalWords).toBe(300);
  });

  it("throws for invalid projectId and disposed service", () => {
    expect(() => service.getWorldScale("")).toThrow("projectId is required");
    service.dispose();
    expect(() => service.getWorldScale(PROJECT_ID)).toThrow(
      "WorldScaleService has been disposed",
    );
  });
});
