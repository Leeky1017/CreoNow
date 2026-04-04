import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { randomUuidMock } = vi.hoisted(() => ({
  randomUuidMock: vi.fn(),
}));

vi.mock("node:crypto", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:crypto")>();
  return {
    ...original,
    randomUUID: randomUuidMock,
  };
});

import { createDocumentService } from "../documentService";
import type { Logger } from "../../../logging/logger";

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../db/migrations",
);

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function applyAllMigrations(db: Database.Database): void {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql") && !file.includes("vec"))
    .sort();
  for (const file of files) {
    db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
  }
}

function makeDoc(text: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

describe("document service snapshot lineage persistence", () => {
  const opened: Database.Database[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
    randomUuidMock.mockReset();
    randomUuidMock.mockReturnValueOnce("doc-1");
    randomUuidMock.mockReturnValueOnce("version-b");
    randomUuidMock.mockReturnValueOnce("version-c");
    randomUuidMock.mockReturnValueOnce("version-a");
    randomUuidMock.mockReturnValueOnce("version-z");
  });

  afterEach(() => {
    for (const db of opened.splice(0)) {
      db.close();
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("persists parent_version_id and keeps rollback/pre-rollback order stable under identical timestamps", () => {
    const db = new Database(":memory:");
    opened.push(db);
    db.pragma("foreign_keys = ON");
    applyAllMigrations(db);

    db.prepare(
      "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run("project-1", "测试项目", "/workspace/project-1", Date.now(), Date.now());

    const service = createDocumentService({
      db,
      logger: createLogger(),
      maxSnapshotsPerDocument: 5,
      autosaveCompactionAgeMs: 0,
    });

    const created = service.create({
      projectId: "project-1",
      title: "第一章",
      type: "chapter",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      throw new Error("expected document create to succeed");
    }

    const initialSave = service.save({
      projectId: "project-1",
      documentId: created.data.documentId,
      contentJson: makeDoc("版本一"),
      actor: "user",
      reason: "manual-save",
    });
    expect(initialSave.ok).toBe(true);
    if (!initialSave.ok) {
      throw new Error("expected initial save to succeed");
    }

    const aiSave = service.save({
      projectId: "project-1",
      documentId: created.data.documentId,
      contentJson: makeDoc("版本二"),
      actor: "ai",
      reason: "ai-accept",
    });
    expect(aiSave.ok).toBe(true);
    if (!aiSave.ok) {
      throw new Error("expected ai save to succeed");
    }

    const rollback = service.rollbackVersion({
      documentId: created.data.documentId,
      versionId: initialSave.data.versionId!,
    });
    expect(rollback.ok).toBe(true);
    if (!rollback.ok) {
      throw new Error("expected rollback to succeed");
    }

    const rows = db.prepare(
      "SELECT version_id as versionId, parent_version_id as parentVersionId, reason FROM document_versions WHERE document_id = ? ORDER BY rowid ASC",
    ).all(created.data.documentId) as Array<{
      versionId: string;
      parentVersionId: string | null;
      reason: string;
    }>;

    expect(rows).toEqual([
      {
        versionId: "version-b",
        parentVersionId: null,
        reason: "manual-save",
      },
      {
        versionId: "version-c",
        parentVersionId: "version-b",
        reason: "ai-accept",
      },
      {
        versionId: "version-a",
        parentVersionId: "version-c",
        reason: "pre-rollback",
      },
      {
        versionId: "version-z",
        parentVersionId: "version-a",
        reason: "rollback",
      },
    ]);

    const listed = service.listVersions({ documentId: created.data.documentId });
    expect(listed.ok).toBe(true);
    if (!listed.ok) {
      throw new Error("expected listVersions to succeed");
    }
    expect(listed.data.items.slice(0, 2).map((item) => item.reason)).toEqual([
      "rollback",
      "pre-rollback",
    ]);
  });
});
