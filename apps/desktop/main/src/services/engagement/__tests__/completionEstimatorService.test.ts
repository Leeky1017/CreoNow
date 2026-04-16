import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createCompletionEstimatorService,
  type CompletionEstimatorService,
} from "../completionEstimatorService";
import type { DbLike } from "../dbTypes";

const PROJECT_ID = "proj-complete-001";
const NOW = Date.parse("2026-04-15T00:00:00.000Z");

function createDb(withStatusColumn = true): Database.Database {
  const db = new Database(":memory:");
  if (withStatusColumn) {
    db.exec(`
      CREATE TABLE documents (
        document_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'chapter',
        status TEXT NOT NULL DEFAULT 'draft',
        word_count INTEGER NOT NULL DEFAULT 0
      );
    `);
  } else {
    db.exec(`
      CREATE TABLE documents (
        document_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'chapter',
        word_count INTEGER NOT NULL DEFAULT 0
      );
    `);
  }
  db.exec(`
    CREATE TABLE document_versions (
      version_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
  return db;
}

function isoTs(offsetDays: number): number {
  return NOW + offsetDays * 86_400_000;
}

describe("CompletionEstimatorService", () => {
  let db: Database.Database;
  let service: CompletionEstimatorService;

  afterEach(() => {
    db?.close();
  });

  beforeEach(() => {
    db = createDb(true);
    service = createCompletionEstimatorService({
      db: db as unknown as DbLike,
      nowMs: () => NOW,
    });
  });

  it("estimates total words and completion date from project-scoped 30-day velocity", () => {
    const insertDoc = db.prepare(
      "INSERT INTO documents (document_id, project_id, type, status, word_count) VALUES (?, ?, 'chapter', ?, ?)",
    );
    insertDoc.run("doc-1", PROJECT_ID, "completed", 2000);
    insertDoc.run("doc-2", PROJECT_ID, "completed", 3000);
    insertDoc.run("doc-3", PROJECT_ID, "draft", 500);
    insertDoc.run("doc-4", PROJECT_ID, "draft", 0);
    insertDoc.run("doc-5", PROJECT_ID, "draft", 0);

    const insertVersion = db.prepare(
      "INSERT INTO document_versions (version_id, project_id, document_id, word_count, created_at) VALUES (?, ?, ?, ?, ?)",
    );
    insertVersion.run("v-1", PROJECT_ID, "doc-1", 1200, isoTs(-2));
    insertVersion.run("v-2", PROJECT_ID, "doc-2", 1000, isoTs(-1));
    insertVersion.run("v-3", PROJECT_ID, "doc-3", 800, isoTs(0));

    const estimate = service.estimate(PROJECT_ID);
    expect(estimate.currentWordCount).toBe(5500);
    // completed words=5000; remaining=3 * avg(2500) => outline target 12500
    expect(estimate.estimatedTotalWords).toBe(12_500);
    // near-30d average includes zero-output days
    expect(estimate.dailyAverage).toBe(100);
    expect(estimate.confidenceLevel).toBe("low");
    expect(estimate.estimatedCompletionDate).not.toBeNull();
  });

  it("returns medium/high confidence by sample size", () => {
    const insertDoc = db.prepare(
      "INSERT INTO documents (document_id, project_id, type, status, word_count) VALUES (?, ?, 'chapter', ?, ?)",
    );
    insertDoc.run("doc-1", PROJECT_ID, "completed", 3000);
    insertDoc.run("doc-2", PROJECT_ID, "draft", 0);

    const insertVersion = db.prepare(
      "INSERT INTO document_versions (version_id, project_id, document_id, word_count, created_at) VALUES (?, ?, ?, ?, ?)",
    );
    let versionSeq = 0;
    for (let i = -20; i <= 0; i++) {
      versionSeq += 1;
      insertVersion.run(`vh-${versionSeq}`, PROJECT_ID, "doc-1", versionSeq * 1500, isoTs(i));
    }

    expect(service.estimate(PROJECT_ID).confidenceLevel).toBe("high");

    db.prepare("DELETE FROM document_versions").run();
    versionSeq = 0;
    for (let i = -6; i <= 0; i++) {
      versionSeq += 1;
      insertVersion.run(`vm-${versionSeq}`, PROJECT_ID, "doc-1", versionSeq * 1200, isoTs(i));
    }
    expect(service.estimate(PROJECT_ID).confidenceLevel).toBe("medium");
  });

  it("falls back when documents table has no status column", () => {
    db.close();
    db = createDb(false);
    service = createCompletionEstimatorService({
      db: db as unknown as DbLike,
      nowMs: () => NOW,
    });

    const insertDoc = db.prepare(
      "INSERT INTO documents (document_id, project_id, type, word_count) VALUES (?, ?, 'chapter', ?)",
    );
    insertDoc.run("doc-1", PROJECT_ID, 1000);
    insertDoc.run("doc-2", PROJECT_ID, 0);
    insertDoc.run("doc-3", PROJECT_ID, 0);

    const estimate = service.estimate(PROJECT_ID);
    expect(estimate.currentWordCount).toBe(1000);
    expect(estimate.estimatedTotalWords).toBe(3000);
  });

  it("handles missing velocity data and empty project", () => {
    const empty = service.estimate(PROJECT_ID);
    expect(empty.currentWordCount).toBe(0);
    expect(empty.dailyAverage).toBe(0);
    expect(empty.estimatedCompletionDate).toBeNull();
  });

  it("ignores velocity rows from other projects", () => {
    const insertDoc = db.prepare(
      "INSERT INTO documents (document_id, project_id, type, status, word_count) VALUES (?, ?, 'chapter', ?, ?)",
    );
    insertDoc.run("doc-1", PROJECT_ID, "completed", 2000);
    insertDoc.run("doc-2", PROJECT_ID, "draft", 0);

    const insertVersion = db.prepare(
      "INSERT INTO document_versions (version_id, project_id, document_id, word_count, created_at) VALUES (?, ?, ?, ?, ?)",
    );
    insertVersion.run("own-1", PROJECT_ID, "doc-1", 100, isoTs(-1));
    insertVersion.run("other-1", "proj-other", "doc-x", 50_000, isoTs(-1));

    const estimate = service.estimate(PROJECT_ID);
    expect(estimate.dailyAverage).toBe(3);
  });

  it("does not double-count unfinished chapter words when estimating total", () => {
    const insertDoc = db.prepare(
      "INSERT INTO documents (document_id, project_id, type, status, word_count) VALUES (?, ?, 'chapter', ?, ?)",
    );
    insertDoc.run("doc-1", PROJECT_ID, "completed", 3000);
    insertDoc.run("doc-2", PROJECT_ID, "draft", 1500);

    const estimate = service.estimate(PROJECT_ID);
    expect(estimate.currentWordCount).toBe(4500);
    expect(estimate.estimatedTotalWords).toBe(6000);
  });

  it("validates projectId", () => {
    expect(() => service.estimate("")).toThrow("projectId is required");
  });
});
