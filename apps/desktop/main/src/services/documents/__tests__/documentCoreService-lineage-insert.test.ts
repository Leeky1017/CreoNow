import { describe, expect, it, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";

import { createDocumentCoreService } from "../documentCoreService";

/**
 * 验证 3 处 INSERT INTO document_versions callsite 的 parent_version_id 参数位置正确。
 * Issue #56 — P1 parent lineage skeleton closure
 */

const fakeLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
};

function createInMemoryDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      document_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'chapter',
      title TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      sort_order INTEGER NOT NULL DEFAULT 0,
      parent_id TEXT,
      content_json TEXT NOT NULL DEFAULT '{}',
      content_text TEXT NOT NULL DEFAULT '',
      content_md TEXT NOT NULL DEFAULT '',
      content_hash TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0,
      cover_image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS document_versions (
      version_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      actor TEXT NOT NULL,
      reason TEXT NOT NULL,
      parent_version_id TEXT,
      content_json TEXT NOT NULL DEFAULT '{}',
      content_text TEXT NOT NULL DEFAULT '',
      content_md TEXT NOT NULL DEFAULT '',
      content_hash TEXT NOT NULL DEFAULT '',
      word_count INTEGER NOT NULL DEFAULT 0,
      diff_format TEXT NOT NULL DEFAULT '',
      diff_text TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS document_branches (
      branch_id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      name TEXT NOT NULL,
      base_snapshot_id TEXT NOT NULL,
      head_snapshot_id TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT 'user',
      created_at INTEGER NOT NULL DEFAULT 0,
      UNIQUE(document_id, name)
    );

    CREATE TABLE IF NOT EXISTS settings (
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (scope, key)
    );
  `);
  return db;
}

function seedDocument(
  db: Database.Database,
  projectId: string,
  documentId: string,
  contentText = "hello world",
): void {
  const contentJson = JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: contentText }] }],
  });
  db.prepare(
    "INSERT INTO documents (document_id, project_id, type, title, status, sort_order, content_json, content_text, content_md, content_hash, created_at, updated_at) VALUES (?, ?, 'chapter', 'Test', 'draft', 0, ?, ?, ?, 'hash-seed', 0, 0)",
  ).run(documentId, projectId, contentJson, contentText, contentText);
}

describe("lineage insert — parent_version_id 参数对齐", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createInMemoryDb();
  });

  afterEach(() => {
    db.close();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. status-change snapshot 的 parent_version_id 正确指向上一版本
  // ──────────────────────────────────────────────────────────────────────────
  it("status-change snapshot 的 parent_version_id 指向先前版本", () => {
    seedDocument(db, "proj-1", "doc-1");
    const svc = createDocumentCoreService({ db, logger: fakeLogger as never });

    // 先存一个版本，以便 status-change 时有前版本
    const saveResult = svc.save({
      projectId: "proj-1",
      documentId: "doc-1",
      contentJson: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }] },
      actor: "user",
      reason: "manual-save",
    });
    expect(saveResult.ok).toBe(true);

    const firstVersionId = db
      .prepare<[], { version_id: string }>(
        "SELECT version_id FROM document_versions ORDER BY created_at ASC LIMIT 1",
      )
      .get()?.version_id;
    expect(firstVersionId).toBeDefined();

    const statusResult = svc.updateStatus({
      projectId: "proj-1",
      documentId: "doc-1",
      status: "final",
    });
    expect(statusResult.ok).toBe(true);

    const statusSnapshot = db
      .prepare<[], { version_id: string; reason: string; parent_version_id: string | null; word_count: number; content_text: string }>(
        "SELECT version_id, reason, parent_version_id, word_count, content_text FROM document_versions WHERE reason = 'status-change' LIMIT 1",
      )
      .get();

    expect(statusSnapshot).toBeDefined();
    // parent_version_id 必须指向先前快照，不能是 content 字符串
    expect(statusSnapshot!.parent_version_id).toBe(firstVersionId);
    // word_count 必须是数字，参数错位时 word_count 列会被写成字符串内容
    expect(typeof statusSnapshot!.word_count).toBe("number");
    // content_text 不应该是 UUID（参数错位时 content_text 会被赋成 parent_version_id 的值）
    expect(statusSnapshot!.content_text).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("status-change snapshot 在无历史版本时 parent_version_id 为 null", () => {
    seedDocument(db, "proj-1", "doc-1");
    const svc = createDocumentCoreService({ db, logger: fakeLogger as never });

    const result = svc.updateStatus({
      projectId: "proj-1",
      documentId: "doc-1",
      status: "final",
    });
    expect(result.ok).toBe(true);

    const snapshot = db
      .prepare<[], { parent_version_id: string | null; word_count: number }>(
        "SELECT parent_version_id, word_count FROM document_versions WHERE reason = 'status-change' LIMIT 1",
      )
      .get();

    expect(snapshot).toBeDefined();
    expect(snapshot!.parent_version_id).toBeNull();
    expect(typeof snapshot!.word_count).toBe("number");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. bootstrap manual-save 参数不错位
  //    createBranch → ensureMainBranch → bootstrap 时创建 manual-save 快照，
  //    各列值不应因 parent_version_id 遗漏而发生偏移
  // ──────────────────────────────────────────────────────────────────────────
  it("bootstrap manual-save 列值不因 parent_version_id 缺失而错位", () => {
    const contentText = "bootstrap content";
    seedDocument(db, "proj-1", "doc-1", contentText);
    const svc = createDocumentCoreService({ db, logger: fakeLogger as never });

    // createBranch 会触发 ensureMainBranch，后者发现无任何版本时执行 bootstrap manual-save
    const result = svc.createBranch({
      documentId: "doc-1",
      name: "feature-one",
      createdBy: "user",
    });
    expect(result.ok).toBe(true);

    const snapshot = db
      .prepare<[], {
        parent_version_id: string | null;
        content_text: string;
        content_md: string;
        word_count: number;
        created_at: number;
      }>(
        "SELECT parent_version_id, content_text, content_md, word_count, created_at FROM document_versions WHERE reason = 'manual-save' LIMIT 1",
      )
      .get();

    expect(snapshot).toBeDefined();
    // bootstrap 无父版本
    expect(snapshot!.parent_version_id).toBeNull();
    // content_text 必须是实际文本，参数错位时会被赋成 contentJson 字符串
    expect(snapshot!.content_text).toBe(contentText);
    // word_count 必须是数字
    expect(typeof snapshot!.word_count).toBe("number");
    // created_at 必须是数字（参数错位时会被赋成 "" 等字符串）
    expect(typeof snapshot!.created_at).toBe("number");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. branch-merge snapshot 的 parent_version_id 指向合并前的 head
  // ──────────────────────────────────────────────────────────────────────────
  it("branch-merge snapshot 的 parent_version_id 指向合并前 head snapshot", () => {
    seedDocument(db, "proj-1", "doc-1", "original text");
    const svc = createDocumentCoreService({ db, logger: fakeLogger as never });

    // 创建 feature-one 分支（同时触发 ensureMainBranch 建立 main 分支）
    const createResult = svc.createBranch({
      documentId: "doc-1",
      name: "feature-one",
      createdBy: "user",
    });
    expect(createResult.ok).toBe(true);

    // 记录合并前 main 的 head snapshot id
    const mainHeadBefore = db
      .prepare<[], { head_snapshot_id: string }>(
        "SELECT head_snapshot_id FROM document_branches WHERE document_id = 'doc-1' AND name = 'main' LIMIT 1",
      )
      .get()?.head_snapshot_id;
    expect(mainHeadBefore).toBeDefined();

    // 将 feature-one 合并回 main（两者内容相同，不会产生冲突）
    const mergeResult = svc.mergeBranch({
      documentId: "doc-1",
      sourceBranchName: "feature-one",
      targetBranchName: "main",
    });
    expect(mergeResult.ok).toBe(true);

    const mergeSnapshot = db
      .prepare<[], { parent_version_id: string | null; content_text: string; word_count: number }>(
        "SELECT parent_version_id, content_text, word_count FROM document_versions WHERE reason = 'branch-merge' LIMIT 1",
      )
      .get();

    expect(mergeSnapshot).toBeDefined();
    // parent_version_id 必须指向合并前的 head，不能是 content（参数错位时会写成 encoded.data）
    expect(mergeSnapshot!.parent_version_id).toBe(mainHeadBefore);
    // content_text 不应该是 UUID
    expect(mergeSnapshot!.content_text).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(typeof mergeSnapshot!.word_count).toBe("number");
  });
});
