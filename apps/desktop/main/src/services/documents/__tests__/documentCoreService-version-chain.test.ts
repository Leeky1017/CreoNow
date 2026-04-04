import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDocumentCoreService } from "../documentCoreService";

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../db/migrations",
);

const fakeLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
};

function applyAllMigrations(db: Database.Database): void {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql") && !file.includes("vec"))
    .sort();

  for (const file of files) {
    db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
  }
}

function insertProject(db: Database.Database, projectId: string): void {
  db.prepare(
    "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
  ).run(projectId, "测试项目", "/worktree/test-root", Date.now(), Date.now());
}

describe("documentCoreService 线性快照链", () => {
  let db: Database.Database;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T12:00:00.000Z"));
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    applyAllMigrations(db);
  });

  afterEach(() => {
    vi.useRealTimers();
    db.close();
  });

  it("保持 parentSnapshotId 线性连续，并在 rollback 后可追踪整条链", () => {
    const service = createDocumentCoreService({
      db,
      logger: fakeLogger as never,
    });
    const projectId = "proj-linear";
    insertProject(db, projectId);

    const created = service.create({
      projectId,
      title: "第一章",
      type: "chapter",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const documentId = created.data.documentId;

    const manualSave = service.save({
      projectId,
      documentId,
      actor: "user",
      reason: "manual-save",
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "初稿" }] }],
      },
    });
    expect(manualSave.ok).toBe(true);
    if (!manualSave.ok || !manualSave.data.versionId) {
      return;
    }
    const version1 = manualSave.data.versionId;

    vi.advanceTimersByTime(60_000);
    const autosave1 = service.save({
      projectId,
      documentId,
      actor: "auto",
      reason: "autosave",
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "初稿 第二版" }] }],
      },
    });
    expect(autosave1.ok).toBe(true);
    if (!autosave1.ok || !autosave1.data.versionId) {
      return;
    }
    const version2 = autosave1.data.versionId;

    vi.advanceTimersByTime(60_000);
    const autosave2 = service.save({
      projectId,
      documentId,
      actor: "auto",
      reason: "autosave",
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "初稿 第二版（合并后）" }] }],
      },
    });
    expect(autosave2.ok).toBe(true);
    if (!autosave2.ok || !autosave2.data.versionId) {
      return;
    }
    expect(autosave2.data.versionId).toBe(version2);

    vi.advanceTimersByTime(60_000);
    const manualSave2 = service.save({
      projectId,
      documentId,
      actor: "user",
      reason: "manual-save",
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "终稿" }] }],
      },
    });
    expect(manualSave2.ok).toBe(true);
    if (!manualSave2.ok || !manualSave2.data.versionId) {
      return;
    }
    const version3 = manualSave2.data.versionId;

    const listBeforeRollback = service.listVersions({ documentId });
    expect(listBeforeRollback.ok).toBe(true);
    if (!listBeforeRollback.ok) {
      return;
    }

    const beforeRollbackMap = new Map(
      listBeforeRollback.data.items.map((item) => [item.versionId, item]),
    );
    expect(beforeRollbackMap.get(version1)?.parentSnapshotId).toBeNull();
    expect(beforeRollbackMap.get(version2)?.parentSnapshotId).toBe(version1);
    expect(beforeRollbackMap.get(version3)?.parentSnapshotId).toBe(version2);

    const mergedAutosaveRead = service.readVersion({
      documentId,
      versionId: version2,
    });
    expect(mergedAutosaveRead.ok).toBe(true);
    if (!mergedAutosaveRead.ok) {
      return;
    }
    expect(mergedAutosaveRead.data.contentText).toBe("初稿 第二版（合并后）");
    expect(mergedAutosaveRead.data.parentSnapshotId).toBe(version1);

    vi.advanceTimersByTime(60_000);
    const rollback = service.rollbackVersion({
      documentId,
      versionId: version1,
    });
    expect(rollback.ok).toBe(true);
    if (!rollback.ok) {
      return;
    }

    const preRollbackRead = service.readVersion({
      documentId,
      versionId: rollback.data.preRollbackVersionId,
    });
    const rollbackRead = service.readVersion({
      documentId,
      versionId: rollback.data.rollbackVersionId,
    });
    expect(preRollbackRead.ok).toBe(true);
    expect(rollbackRead.ok).toBe(true);
    if (!preRollbackRead.ok || !rollbackRead.ok) {
      return;
    }

    expect(preRollbackRead.data.parentSnapshotId).toBe(version3);
    expect(preRollbackRead.data.contentText).toBe("终稿");
    expect(rollbackRead.data.parentSnapshotId).toBe(rollback.data.preRollbackVersionId);
    expect(rollbackRead.data.contentText).toBe("初稿");

    const readCurrent = service.read({ projectId, documentId });
    expect(readCurrent.ok).toBe(true);
    if (!readCurrent.ok) {
      return;
    }
    expect(readCurrent.data.contentText).toBe("初稿");

    const listAfterRollback = service.listVersions({ documentId });
    expect(listAfterRollback.ok).toBe(true);
    if (!listAfterRollback.ok) {
      return;
    }

    const afterRollbackMap = new Map(
      listAfterRollback.data.items.map((item) => [item.versionId, item.parentSnapshotId]),
    );
    const traversed: string[] = [];
    let cursor: string | null = rollback.data.rollbackVersionId;
    while (cursor !== null) {
      traversed.push(cursor);
      cursor = afterRollbackMap.get(cursor) ?? null;
    }

    expect(traversed).toEqual([
      rollback.data.rollbackVersionId,
      rollback.data.preRollbackVersionId,
      version3,
      version2,
      version1,
    ]);
  });
});
