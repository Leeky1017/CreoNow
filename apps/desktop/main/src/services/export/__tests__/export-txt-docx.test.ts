import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import { createExportService } from "../exportService";

function createNoopLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

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

function seedProjectAndDocument(args: {
  db: Database.Database;
  projectId: string;
  documentId: string;
  title: string;
  contentText: string;
  contentMd: string;
}): void {
  const now = Date.now();
  args.db
    .prepare(
      `
      INSERT INTO projects (
        project_id, name, root_path, type, description, stage, created_at, updated_at
      ) VALUES (?, ?, ?, 'novel', '', 'outline', ?, ?)
    `,
    )
    .run(args.projectId, "Export Project", `/tmp/${args.projectId}`, now, now);

  args.db
    .prepare(
      `
      INSERT INTO documents (
        document_id, project_id, type, title, content_json, content_text, content_md,
        content_hash, status, sort_order, parent_id, created_at, updated_at
      ) VALUES (?, ?, 'chapter', ?, '{}', ?, ?, 'hash', 'draft', 0, NULL, ?, ?)
    `,
    )
    .run(
      args.documentId,
      args.projectId,
      args.title,
      args.contentText,
      args.contentMd,
      now,
      now,
    );
}

/**
 * Scenario: S3-EXPORT-S2
 * should export txt/docx as deterministic artifacts with semantic title+content.
 */
{
  const projectId = `project-${randomUUID()}`;
  const documentId = `doc-${randomUUID()}`;
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "creonow-exp-"));
  const db = createTestDb();

  try {
    seedProjectAndDocument({
      db,
      projectId,
      documentId,
      title: "Character Card",
      contentText: "Name: Alice\nTrait: Curious",
      contentMd: "Name: Alice\n\nTrait: Curious",
    });

    const service = createExportService({
      db,
      logger: createNoopLogger(),
      userDataDir,
    });

    const txtRes = await service.exportTxt({ projectId, documentId });
    assert.equal(txtRes.ok, true, "txt export should succeed");
    if (!txtRes.ok) {
      throw new Error("txt export should succeed");
    }

    const txtOutput = await fs.readFile(
      path.join(userDataDir, txtRes.data.relativePath),
      "utf8",
    );
    assert.match(
      txtOutput,
      /^Character Card\n\nName: Alice\nTrait: Curious$/,
      "txt export should preserve title + plain-text semantics",
    );

    const firstDocxRes = await service.exportDocx({ projectId, documentId });
    assert.equal(firstDocxRes.ok, true, "docx export should succeed");
    if (!firstDocxRes.ok) {
      throw new Error("docx export should succeed");
    }
    const docxPath = path.join(userDataDir, firstDocxRes.data.relativePath);
    const firstDocx = await fs.readFile(docxPath);
    assert.equal(
      firstDocx.subarray(0, 2).toString("utf8"),
      "PK",
      "docx export should produce a zip container artifact",
    );

    const secondDocxRes = await service.exportDocx({ projectId, documentId });
    assert.equal(
      secondDocxRes.ok,
      true,
      "docx export should remain stable across repeated calls",
    );
    if (!secondDocxRes.ok) {
      throw new Error("docx export should remain stable");
    }
    assert.equal(
      secondDocxRes.data.relativePath,
      firstDocxRes.data.relativePath,
      "docx export should keep stable output path for identical input",
    );
    assert.ok(
      secondDocxRes.data.bytesWritten > 0,
      "docx export should produce non-empty artifact bytes",
    );
  } finally {
    db.close();
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
}
