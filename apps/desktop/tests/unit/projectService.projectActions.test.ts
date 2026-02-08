import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import { createProjectService } from "../../main/src/services/projects/projectService";
import type { Logger } from "../../main/src/logging/logger";

/**
 * Create a minimal SQLite schema for project service action tests.
 */
function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE projects (
      project_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      root_path TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'novel',
      description TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL DEFAULT 'outline',
      target_word_count INTEGER,
      target_chapter_count INTEGER,
      narrative_person TEXT NOT NULL DEFAULT 'first',
      language_style TEXT NOT NULL DEFAULT '',
      target_audience TEXT NOT NULL DEFAULT '',
      default_skill_set_id TEXT,
      knowledge_graph_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived_at INTEGER
    );

    CREATE TABLE documents (
      document_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content_json TEXT NOT NULL,
      content_text TEXT NOT NULL,
      content_md TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
    );

    CREATE TABLE settings (
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (scope, key)
    );
  `);
  return db;
}

/**
 * Create a no-op logger suitable for unit tests.
 */
function createNoopLogger(): Logger {
  return {
    logPath: "",
    info: () => {},
    error: () => {},
  };
}

async function testRenameValidationAndPersistence(): Promise<void> {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "creonow-ren-"));
  const db = createTestDb();
  const svc = createProjectService({
    db,
    userDataDir,
    logger: createNoopLogger(),
  });

  const created = svc.create({ name: "Source Project" });
  if (!created.ok) {
    throw new Error(`create failed: ${created.error.code}`);
  }

  const emptyName = svc.rename({
    projectId: created.data.projectId,
    name: "   ",
  });
  assert.equal(emptyName.ok, false, "rename should reject blank names");
  if (emptyName.ok) {
    throw new Error("expected rename INVALID_ARGUMENT for blank input");
  }
  assert.equal(emptyName.error.code, "INVALID_ARGUMENT");

  const tooLong = svc.rename({
    projectId: created.data.projectId,
    name: "x".repeat(121),
  });
  assert.equal(tooLong.ok, false, "rename should reject overly long names");
  if (tooLong.ok) {
    throw new Error("expected rename INVALID_ARGUMENT for long input");
  }
  assert.equal(tooLong.error.code, "INVALID_ARGUMENT");

  const renamed = svc.rename({
    projectId: created.data.projectId,
    name: "Renamed Project",
  });
  if (!renamed.ok) {
    throw new Error(`rename failed: ${renamed.error.code}`);
  }

  const row = db
    .prepare<
      [string],
      { name: string }
    >("SELECT name FROM projects WHERE project_id = ?")
    .get(created.data.projectId);
  assert.equal(row?.name, "Renamed Project");

  db.close();
  await fs.rm(userDataDir, { recursive: true, force: true });
}

async function testArchiveAndUnarchiveSemantics(): Promise<void> {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "creonow-arc-"));
  const db = createTestDb();
  const svc = createProjectService({
    db,
    userDataDir,
    logger: createNoopLogger(),
  });

  const created = svc.create({ name: "Archive Candidate" });
  if (!created.ok) {
    throw new Error(`create failed: ${created.error.code}`);
  }

  const archived = svc.archive({
    projectId: created.data.projectId,
    archived: true,
  });
  if (!archived.ok) {
    throw new Error(`archive failed: ${archived.error.code}`);
  }
  assert.equal(archived.ok, true, "archive should succeed");
  assert.equal(archived.data.archived, true);
  assert.equal(typeof archived.data.archivedAt, "number");

  const archivedNoop = svc.archive({
    projectId: created.data.projectId,
    archived: true,
  });
  if (!archivedNoop.ok) {
    throw new Error(`archive noop failed: ${archivedNoop.error.code}`);
  }
  assert.equal(archivedNoop.ok, true, "archive idempotent call should succeed");
  assert.equal(archivedNoop.data.archived, true);

  const unarchived = svc.archive({
    projectId: created.data.projectId,
    archived: false,
  });
  if (!unarchived.ok) {
    throw new Error(`unarchive failed: ${unarchived.error.code}`);
  }
  assert.equal(unarchived.ok, true, "unarchive should succeed");
  assert.equal(unarchived.data.archived, false);
  assert.equal(unarchived.data.archivedAt, undefined);

  const archivedAtRow = db
    .prepare<
      [string],
      { archivedAt: number | null }
    >("SELECT archived_at as archivedAt FROM projects WHERE project_id = ?")
    .get(created.data.projectId);
  assert.equal(archivedAtRow?.archivedAt, null);

  db.close();
  await fs.rm(userDataDir, { recursive: true, force: true });
}

async function testDuplicateCopiesDocumentsOnly(): Promise<void> {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "creonow-dup-"));
  const db = createTestDb();
  const svc = createProjectService({
    db,
    userDataDir,
    logger: createNoopLogger(),
  });

  const created = svc.create({ name: "Original Novel" });
  if (!created.ok) {
    throw new Error(`create failed: ${created.error.code}`);
  }
  const sourceProjectId = created.data.projectId;
  const sourceRootPath = created.data.rootPath;

  db.prepare(
    "INSERT INTO documents (document_id, project_id, title, content_json, content_text, content_md, content_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    "doc-1",
    sourceProjectId,
    "Chapter 1",
    '{"type":"doc"}',
    "Once upon a time",
    "Once upon a time",
    "hash-doc-1",
    Date.now(),
    Date.now(),
  );

  const duplicate = svc.duplicate({ projectId: sourceProjectId });
  if (!duplicate.ok) {
    throw new Error(`duplicate failed: ${duplicate.error.code}`);
  }
  assert.equal(duplicate.ok, true, "duplicate should succeed");

  assert.notEqual(duplicate.data.projectId, sourceProjectId);
  assert.notEqual(duplicate.data.rootPath, sourceRootPath);
  assert.equal(duplicate.data.name, "Original Novel (Copy)");

  const duplicatedDocCount = db
    .prepare<
      [string],
      { count: number }
    >("SELECT COUNT(*) as count FROM documents WHERE project_id = ?")
    .get(duplicate.data.projectId);
  assert.equal(
    duplicatedDocCount?.count,
    2,
    "duplicate should include source default chapter plus inserted chapter",
  );

  const duplicatedDoc = db
    .prepare<
      [string, string],
      { contentHash: string; title: string }
    >(
      "SELECT content_hash as contentHash, title FROM documents WHERE project_id = ? AND title = ?",
    )
    .get(duplicate.data.projectId, "Chapter 1");
  assert.equal(duplicatedDoc?.contentHash, "hash-doc-1");
  assert.equal(duplicatedDoc?.title, "Chapter 1");

  db.close();
  await fs.rm(userDataDir, { recursive: true, force: true });
}

async function main(): Promise<void> {
  await testRenameValidationAndPersistence();
  await testArchiveAndUnarchiveSemantics();
  await testDuplicateCopiesDocumentsOnly();
  console.log("projectService.projectActions.test.ts: all assertions passed");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
