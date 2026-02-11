import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import Database from "better-sqlite3";
import type { IpcMain } from "electron";

import { registerVersionIpcHandlers } from "../../main/src/ipc/version";
import type { Logger } from "../../main/src/logging/logger";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

function createNoopLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function hashJson(contentJson: string): string {
  return createHash("sha256").update(contentJson, "utf8").digest("hex");
}

function toContentJson(text: string): string {
  return JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  });
}

function createVersionDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE projects (
      project_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      root_path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE documents (
      document_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'chapter',
      title TEXT NOT NULL,
      content_json TEXT NOT NULL,
      content_text TEXT NOT NULL,
      content_md TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      sort_order INTEGER NOT NULL DEFAULT 0,
      parent_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
    );

    CREATE TABLE document_versions (
      version_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      actor TEXT NOT NULL,
      reason TEXT NOT NULL,
      content_json TEXT NOT NULL,
      content_text TEXT NOT NULL,
      content_md TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      diff_format TEXT NOT NULL DEFAULT '',
      diff_text TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
      FOREIGN KEY(document_id) REFERENCES documents(document_id) ON DELETE CASCADE
    );

    CREATE INDEX idx_document_versions_document_created
      ON document_versions (document_id, created_at DESC, version_id ASC);
  `);
  return db;
}

function seedProjectDocumentAndVersions(db: Database.Database): void {
  const projectId = "project-1";
  const documentId = "doc-1";
  const now = Date.now();

  const historicalText = "line one\nline two (old)";
  const currentText = "line one\nline two (current)";

  const historicalJson = toContentJson(historicalText);
  const currentJson = toContentJson(currentText);

  db.prepare(
    "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
  ).run(projectId, "Project 1", "/tmp/project-1", now - 10_000, now - 9_000);

  db.prepare(
    "INSERT INTO documents (document_id, project_id, type, title, content_json, content_text, content_md, content_hash, status, sort_order, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    documentId,
    projectId,
    "chapter",
    "Chapter 1",
    currentJson,
    currentText,
    currentText,
    hashJson(currentJson),
    "draft",
    0,
    null,
    now - 8_000,
    now - 7_000,
  );

  db.prepare(
    "INSERT INTO document_versions (version_id, project_id, document_id, actor, reason, content_json, content_text, content_md, content_hash, word_count, diff_format, diff_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    "v-old",
    projectId,
    documentId,
    "user",
    "manual-save",
    historicalJson,
    historicalText,
    historicalText,
    hashJson(historicalJson),
    4,
    "",
    "",
    now - 6_000,
  );

  db.prepare(
    "INSERT INTO document_versions (version_id, project_id, document_id, actor, reason, content_json, content_text, content_md, content_hash, word_count, diff_format, diff_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    "v-current",
    projectId,
    documentId,
    "user",
    "manual-save",
    currentJson,
    currentText,
    currentText,
    hashJson(currentJson),
    4,
    "",
    "",
    now - 5_000,
  );
}

function createIpcHarness(): {
  ipcMain: IpcMain;
  handlers: Map<string, Handler>;
} {
  const handlers = new Map<string, Handler>();
  const ipcMain = {
    handle(channel: string, handler: Handler) {
      handlers.set(channel, handler);
    },
  } as unknown as IpcMain;

  return { ipcMain, handlers };
}

async function testVersionDiffScenarioCoverage(): Promise<void> {
  const db = createVersionDb();
  seedProjectDocumentAndVersions(db);
  const { ipcMain, handlers } = createIpcHarness();
  registerVersionIpcHandlers({ ipcMain, db, logger: createNoopLogger() });

  const diffHandler = handlers.get("version:snapshot:diff");
  assert.ok(diffHandler, "version:snapshot:diff handler should be registered");

  const compareCurrent = (await diffHandler(
    {},
    {
      documentId: "doc-1",
      baseVersionId: "v-old",
    },
  )) as {
    ok: boolean;
    data?: {
      diffText: string;
      hasDifferences: boolean;
      stats: { addedLines: number; removedLines: number; changedHunks: number };
    };
    error?: { code: string; message: string };
  };

  assert.equal(compareCurrent.ok, true);
  if (!compareCurrent.ok) {
    throw new Error(
      `expected diff success, got ${compareCurrent.error?.code ?? "unknown"}`,
    );
  }
  if (!compareCurrent.data) {
    throw new Error("expected diff data for compareCurrent");
  }
  assert.equal(compareCurrent.data.hasDifferences, true);
  assert.ok(compareCurrent.data.diffText.includes("@@"));
  assert.ok(compareCurrent.data.stats.addedLines > 0);
  assert.ok(compareCurrent.data.stats.removedLines > 0);

  const compareSame = (await diffHandler(
    {},
    {
      documentId: "doc-1",
      baseVersionId: "v-old",
      targetVersionId: "v-old",
    },
  )) as {
    ok: boolean;
    data?: {
      diffText: string;
      hasDifferences: boolean;
      stats: { addedLines: number; removedLines: number; changedHunks: number };
    };
    error?: { code: string; message: string };
  };

  assert.equal(compareSame.ok, true);
  if (!compareSame.ok) {
    throw new Error(
      `expected same-version diff success, got ${compareSame.error?.code ?? "unknown"}`,
    );
  }
  if (!compareSame.data) {
    throw new Error("expected diff data for compareSame");
  }
  assert.equal(compareSame.data.hasDifferences, false);
  assert.equal(compareSame.data.diffText, "");
  assert.deepEqual(compareSame.data.stats, {
    addedLines: 0,
    removedLines: 0,
    changedHunks: 0,
  });

  db.close();
}

async function testVersionRollbackThreeStepAndUndoable(): Promise<void> {
  const db = createVersionDb();
  seedProjectDocumentAndVersions(db);
  const { ipcMain, handlers } = createIpcHarness();
  registerVersionIpcHandlers({ ipcMain, db, logger: createNoopLogger() });

  const rollbackHandler = handlers.get("version:snapshot:rollback");
  assert.ok(
    rollbackHandler,
    "version:snapshot:rollback handler should be registered",
  );

  const rollbackRes = (await rollbackHandler(
    {},
    {
      documentId: "doc-1",
      versionId: "v-old",
    },
  )) as {
    ok: boolean;
    data?: { restored: true };
    error?: { code: string; message: string };
  };
  assert.equal(rollbackRes.ok, true);
  if (!rollbackRes.ok) {
    throw new Error(
      `expected rollback success, got ${rollbackRes.error?.code ?? "unknown"}`,
    );
  }

  const rolledDoc = db
    .prepare<
      [string],
      { contentText: string }
    >("SELECT content_text as contentText FROM documents WHERE document_id = ?")
    .get("doc-1");
  assert.equal(rolledDoc?.contentText, "line one\nline two (old)");

  const reasonsAfterRollback = db
    .prepare<[string], { reason: string }>(
      "SELECT reason FROM document_versions WHERE document_id = ?",
    )
    .all("doc-1")
    .map((row) => row.reason);
  assert.ok(reasonsAfterRollback.includes("pre-rollback"));
  assert.ok(reasonsAfterRollback.includes("rollback"));

  const preRollbackVersion = db
    .prepare<
      [string, string],
      { versionId: string }
    >("SELECT version_id as versionId FROM document_versions WHERE document_id = ? AND reason = ? ORDER BY created_at DESC, version_id ASC LIMIT 1")
    .get("doc-1", "pre-rollback");
  assert.ok(preRollbackVersion, "pre-rollback version should exist");

  const undoRes = (await rollbackHandler(
    {},
    {
      documentId: "doc-1",
      versionId: preRollbackVersion.versionId,
    },
  )) as {
    ok: boolean;
    data?: { restored: true };
    error?: { code: string; message: string };
  };
  assert.equal(undoRes.ok, true);
  if (!undoRes.ok) {
    throw new Error(
      `expected undo rollback success, got ${undoRes.error?.code ?? "unknown"}`,
    );
  }

  const undoDoc = db
    .prepare<
      [string],
      { contentText: string }
    >("SELECT content_text as contentText FROM documents WHERE document_id = ?")
    .get("doc-1");
  assert.equal(undoDoc?.contentText, "line one\nline two (current)");

  db.close();
}

async function main(): Promise<void> {
  await testVersionDiffScenarioCoverage();
  await testVersionRollbackThreeStepAndUndoable();
  console.log("version-diff-rollback.ipc.test.ts: all assertions passed");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
