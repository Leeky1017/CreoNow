import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import Database from "better-sqlite3";
import type { IpcMain } from "electron";

import { registerVersionIpcHandlers } from "../../main/src/ipc/version";
import type { Logger } from "../../main/src/logging/logger";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type IpcErr = { code: string; message: string; details?: unknown };
type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcErr };

type BranchListItem = {
  id: string;
  documentId: string;
  name: string;
  baseSnapshotId: string;
  headSnapshotId: string;
  createdBy: string;
  createdAt: number;
  isCurrent: boolean;
};

type ConflictBlock = {
  conflictId: string;
  index: number;
  baseText: string;
  oursText: string;
  theirsText: string;
};

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

function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/u).length;
}

function toContentJson(text: string): string {
  const content = text.split("\n").map((line) => {
    if (line.length === 0) {
      return { type: "paragraph" };
    }
    return {
      type: "paragraph",
      content: [{ type: "text", text: line }],
    };
  });
  return JSON.stringify({ type: "doc", content });
}

function createVersionBranchDb(): Database.Database {
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

    CREATE TABLE settings (
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (scope, key)
    );

    CREATE TABLE document_branches (
      branch_id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      name TEXT NOT NULL,
      base_snapshot_id TEXT NOT NULL,
      head_snapshot_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(document_id, name),
      FOREIGN KEY(document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
      FOREIGN KEY(base_snapshot_id) REFERENCES document_versions(version_id),
      FOREIGN KEY(head_snapshot_id) REFERENCES document_versions(version_id)
    );

    CREATE TABLE document_merge_sessions (
      merge_session_id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      source_branch_name TEXT NOT NULL,
      target_branch_name TEXT NOT NULL,
      merged_template_text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(document_id) REFERENCES documents(document_id) ON DELETE CASCADE
    );

    CREATE TABLE document_merge_conflicts (
      conflict_id TEXT PRIMARY KEY,
      merge_session_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      source_branch_name TEXT NOT NULL,
      target_branch_name TEXT NOT NULL,
      conflict_index INTEGER NOT NULL,
      base_text TEXT NOT NULL,
      ours_text TEXT NOT NULL,
      theirs_text TEXT NOT NULL,
      selected_resolution TEXT,
      manual_text TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(merge_session_id) REFERENCES document_merge_sessions(merge_session_id) ON DELETE CASCADE,
      FOREIGN KEY(document_id) REFERENCES documents(document_id) ON DELETE CASCADE
    );
  `);
  return db;
}

function insertProject(db: Database.Database): void {
  const now = Date.now();
  db.prepare(
    "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
  ).run("project-1", "Project 1", "/tmp/project-1", now - 10_000, now - 9_000);
}

function insertDocument(db: Database.Database, args: {
  documentId: string;
  text: string;
  createdAt: number;
}): void {
  const contentJson = toContentJson(args.text);
  db.prepare(
    "INSERT INTO documents (document_id, project_id, type, title, content_json, content_text, content_md, content_hash, status, sort_order, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    args.documentId,
    "project-1",
    "chapter",
    `Doc ${args.documentId}`,
    contentJson,
    args.text,
    args.text,
    hashJson(contentJson),
    "draft",
    0,
    null,
    args.createdAt,
    args.createdAt,
  );
}

function insertVersion(db: Database.Database, args: {
  versionId: string;
  documentId: string;
  text: string;
  reason?: string;
  createdAt: number;
}): void {
  const contentJson = toContentJson(args.text);
  db.prepare(
    "INSERT INTO document_versions (version_id, project_id, document_id, actor, reason, content_json, content_text, content_md, content_hash, word_count, diff_format, diff_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    args.versionId,
    "project-1",
    args.documentId,
    "user",
    args.reason ?? "manual-save",
    contentJson,
    args.text,
    args.text,
    hashJson(contentJson),
    countWords(args.text),
    "",
    "",
    args.createdAt,
  );
}

function insertBranch(db: Database.Database, args: {
  branchId: string;
  documentId: string;
  name: string;
  baseSnapshotId: string;
  headSnapshotId: string;
  createdAt: number;
}): void {
  db.prepare(
    "INSERT INTO document_branches (branch_id, document_id, name, base_snapshot_id, head_snapshot_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    args.branchId,
    args.documentId,
    args.name,
    args.baseSnapshotId,
    args.headSnapshotId,
    "tester",
    args.createdAt,
  );
}

function setCurrentBranch(
  db: Database.Database,
  documentId: string,
  branchName: string,
  ts: number,
): void {
  db.prepare(
    "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
  ).run(
    `version:branch:${documentId}`,
    "creonow.version.currentBranch",
    JSON.stringify(branchName),
    ts,
  );
}

function seedBranchCrudDocument(db: Database.Database): void {
  const now = Date.now();
  const docId = "doc-crud";
  insertDocument(db, {
    documentId: docId,
    text: "line one\nline two",
    createdAt: now - 5_000,
  });
  insertVersion(db, {
    versionId: "v-crud-base",
    documentId: docId,
    text: "line one\nline two",
    createdAt: now - 4_000,
  });
  insertBranch(db, {
    branchId: "b-crud-main",
    documentId: docId,
    name: "main",
    baseSnapshotId: "v-crud-base",
    headSnapshotId: "v-crud-base",
    createdAt: now - 3_000,
  });
  setCurrentBranch(db, docId, "main", now - 2_000);
}

function seedMergeNoConflictDocument(db: Database.Database): void {
  const now = Date.now();
  const docId = "doc-merge-clean";
  const baseText = "line one\nline two";
  const mainText = "line one\nline two";
  const sourceText = "line one\nline two\nline three from alt";

  insertDocument(db, {
    documentId: docId,
    text: mainText,
    createdAt: now - 5_000,
  });
  insertVersion(db, {
    versionId: "v-clean-base",
    documentId: docId,
    text: baseText,
    createdAt: now - 4_000,
  });
  insertVersion(db, {
    versionId: "v-clean-main",
    documentId: docId,
    text: mainText,
    createdAt: now - 3_000,
  });
  insertVersion(db, {
    versionId: "v-clean-alt",
    documentId: docId,
    text: sourceText,
    createdAt: now - 2_000,
  });

  insertBranch(db, {
    branchId: "b-clean-main",
    documentId: docId,
    name: "main",
    baseSnapshotId: "v-clean-base",
    headSnapshotId: "v-clean-main",
    createdAt: now - 2_500,
  });
  insertBranch(db, {
    branchId: "b-clean-alt",
    documentId: docId,
    name: "alt-ending",
    baseSnapshotId: "v-clean-base",
    headSnapshotId: "v-clean-alt",
    createdAt: now - 2_200,
  });
  setCurrentBranch(db, docId, "main", now - 1_500);
}

function seedMergeConflictDocument(db: Database.Database): void {
  const now = Date.now();
  const docId = "doc-merge-conflict";
  const baseText = "line one\nline two";
  const mainText = "line one\nline two main";
  const sourceText = "line one\nline two alt";

  insertDocument(db, {
    documentId: docId,
    text: mainText,
    createdAt: now - 5_000,
  });
  insertVersion(db, {
    versionId: "v-conflict-base",
    documentId: docId,
    text: baseText,
    createdAt: now - 4_000,
  });
  insertVersion(db, {
    versionId: "v-conflict-main",
    documentId: docId,
    text: mainText,
    createdAt: now - 3_000,
  });
  insertVersion(db, {
    versionId: "v-conflict-alt",
    documentId: docId,
    text: sourceText,
    createdAt: now - 2_000,
  });

  insertBranch(db, {
    branchId: "b-conflict-main",
    documentId: docId,
    name: "main",
    baseSnapshotId: "v-conflict-base",
    headSnapshotId: "v-conflict-main",
    createdAt: now - 2_500,
  });
  insertBranch(db, {
    branchId: "b-conflict-alt",
    documentId: docId,
    name: "alt-ending",
    baseSnapshotId: "v-conflict-base",
    headSnapshotId: "v-conflict-alt",
    createdAt: now - 2_200,
  });
  setCurrentBranch(db, docId, "main", now - 1_500);
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

async function testBranchCrudScenario(): Promise<void> {
  const db = createVersionBranchDb();
  insertProject(db);
  seedBranchCrudDocument(db);

  const { ipcMain, handlers } = createIpcHarness();
  registerVersionIpcHandlers({ ipcMain, db, logger: createNoopLogger() });

  const createHandler = handlers.get("version:branch:create");
  assert.ok(createHandler, "version:branch:create handler should be registered");

  const listHandler = handlers.get("version:branch:list");
  assert.ok(listHandler, "version:branch:list handler should be registered");

  const switchHandler = handlers.get("version:branch:switch");
  assert.ok(switchHandler, "version:branch:switch handler should be registered");

  const createRes = (await createHandler({}, {
    documentId: "doc-crud",
    name: "alt-ending",
    createdBy: "tester",
  })) as IpcResult<{ branch: BranchListItem }>;
  assert.equal(createRes.ok, true);

  const listRes = (await listHandler({}, {
    documentId: "doc-crud",
  })) as IpcResult<{ branches: BranchListItem[] }>;
  assert.equal(listRes.ok, true);
  if (!listRes.ok) {
    throw new Error("expected list branch success");
  }
  assert.equal(listRes.data.branches.some((item) => item.name === "main"), true);
  assert.equal(
    listRes.data.branches.some((item) => item.name === "alt-ending"),
    true,
  );

  const switchRes = (await switchHandler({}, {
    documentId: "doc-crud",
    name: "alt-ending",
  })) as IpcResult<{ currentBranch: string }>;
  assert.equal(switchRes.ok, true);
}

async function testMergeWithoutConflict(): Promise<void> {
  const db = createVersionBranchDb();
  insertProject(db);
  seedMergeNoConflictDocument(db);

  const { ipcMain, handlers } = createIpcHarness();
  registerVersionIpcHandlers({ ipcMain, db, logger: createNoopLogger() });

  const mergeHandler = handlers.get("version:branch:merge");
  assert.ok(mergeHandler, "version:branch:merge handler should be registered");

  const mergeRes = (await mergeHandler({}, {
    documentId: "doc-merge-clean",
    sourceBranchName: "alt-ending",
    targetBranchName: "main",
  })) as IpcResult<{ status: "merged"; mergeSnapshotId: string }>;

  assert.equal(mergeRes.ok, true);

  const reasons = db
    .prepare<[string], { reason: string }>(
      "SELECT reason FROM document_versions WHERE document_id = ? ORDER BY created_at ASC",
    )
    .all("doc-merge-clean")
    .map((row) => row.reason);
  assert.equal(reasons.includes("branch-merge"), true);

  const mergedDoc = db
    .prepare<[string], { contentText: string }>(
      "SELECT content_text as contentText FROM documents WHERE document_id = ?",
    )
    .get("doc-merge-clean");
  assert.equal(
    mergedDoc?.contentText.includes("line three from alt"),
    true,
    "merged document should include source branch addition",
  );
}

async function testMergeConflictAndResolve(): Promise<void> {
  const db = createVersionBranchDb();
  insertProject(db);
  seedMergeConflictDocument(db);

  const { ipcMain, handlers } = createIpcHarness();
  registerVersionIpcHandlers({ ipcMain, db, logger: createNoopLogger() });

  const mergeHandler = handlers.get("version:branch:merge");
  assert.ok(mergeHandler, "version:branch:merge handler should be registered");

  const resolveHandler = handlers.get("version:conflict:resolve");
  assert.ok(
    resolveHandler,
    "version:conflict:resolve handler should be registered",
  );

  const conflictRes = (await mergeHandler({}, {
    documentId: "doc-merge-conflict",
    sourceBranchName: "alt-ending",
    targetBranchName: "main",
  })) as IpcResult<unknown>;

  assert.equal(conflictRes.ok, false);
  if (conflictRes.ok) {
    throw new Error("expected conflict result");
  }
  assert.equal(conflictRes.error.code, "CONFLICT");

  const details = conflictRes.error.details as {
    mergeSessionId: string;
    conflicts: ConflictBlock[];
  };
  assert.equal(typeof details.mergeSessionId, "string");
  assert.equal(details.conflicts.length > 0, true);

  const mergeReasonsBeforeResolve = db
    .prepare<[string], { reason: string }>(
      "SELECT reason FROM document_versions WHERE document_id = ? ORDER BY created_at ASC",
    )
    .all("doc-merge-conflict")
    .map((row) => row.reason);
  assert.equal(
    mergeReasonsBeforeResolve.includes("branch-merge"),
    false,
    "conflict path should not auto-create merge snapshot",
  );

  const firstConflict = details.conflicts[0];
  if (!firstConflict) {
    throw new Error("expected at least one conflict block");
  }

  const resolveRes = (await resolveHandler({}, {
    documentId: "doc-merge-conflict",
    mergeSessionId: details.mergeSessionId,
    resolvedBy: "tester",
    resolutions: [
      {
        conflictId: firstConflict.conflictId,
        resolution: "manual",
        manualText: "line two resolved manually",
      },
    ],
  })) as IpcResult<{ status: "merged"; mergeSnapshotId: string }>;

  assert.equal(resolveRes.ok, true);

  const resolvedDoc = db
    .prepare<[string], { contentText: string }>(
      "SELECT content_text as contentText FROM documents WHERE document_id = ?",
    )
    .get("doc-merge-conflict");
  assert.equal(
    resolvedDoc?.contentText.includes("line two resolved manually"),
    true,
    "resolved content should be written to document",
  );

  const mergeReasonsAfterResolve = db
    .prepare<[string], { reason: string }>(
      "SELECT reason FROM document_versions WHERE document_id = ? ORDER BY created_at ASC",
    )
    .all("doc-merge-conflict")
    .map((row) => row.reason);
  assert.equal(
    mergeReasonsAfterResolve.includes("branch-merge"),
    true,
    "resolve path should create branch-merge snapshot",
  );
}

async function testMergeTimeout(): Promise<void> {
  const db = createVersionBranchDb();
  insertProject(db);
  seedMergeNoConflictDocument(db);

  const { ipcMain, handlers } = createIpcHarness();
  registerVersionIpcHandlers({
    ipcMain,
    db,
    logger: createNoopLogger(),
    mergeTimeoutMs: 0,
  } as never);

  const mergeHandler = handlers.get("version:branch:merge");
  assert.ok(mergeHandler, "version:branch:merge handler should be registered");

  const timeoutRes = (await mergeHandler({}, {
    documentId: "doc-merge-clean",
    sourceBranchName: "alt-ending",
    targetBranchName: "main",
  })) as IpcResult<unknown>;

  assert.equal(timeoutRes.ok, false);
  if (timeoutRes.ok) {
    throw new Error("expected timeout result");
  }
  assert.equal(timeoutRes.error.code, "VERSION_MERGE_TIMEOUT");
}

async function main(): Promise<void> {
  await testBranchCrudScenario();
  await testMergeWithoutConflict();
  await testMergeConflictAndResolve();
  await testMergeTimeout();
  console.log("version-branch-merge-conflict.ipc.test.ts: all assertions passed");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
