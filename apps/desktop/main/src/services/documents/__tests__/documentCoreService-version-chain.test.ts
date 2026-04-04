import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initDb } from "../../../db/init";
import { createDocumentCoreService } from "../documentCoreService";

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../db/migrations",
);
const VERSION_PARENT_SNAPSHOT_MIGRATION = "0026_version_parent_snapshot_id.sql";
const VERSION_PARENT_SNAPSHOT_ROWID_FIX_MIGRATION =
  "0027_version_parent_snapshot_rowid_order.sql";
const TEST_ARTIFACTS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "__artifacts__",
);

const fakeLogger = {
  logPath: "<test>",
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
};

function applyMigrations(
  db: Database.Database,
  predicate: (file: string) => boolean = () => true,
): void {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql") && !file.includes("vec"))
    .filter(predicate)
    .sort();

  for (const file of files) {
    db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
  }
}

function applyAllMigrations(db: Database.Database): void {
  applyMigrations(db);
}

function applyMigrationsBeforeVersionParentSnapshot(db: Database.Database): void {
  applyMigrations(
    db,
    (file) =>
      file !== VERSION_PARENT_SNAPSHOT_MIGRATION &&
      file !== VERSION_PARENT_SNAPSHOT_ROWID_FIX_MIGRATION,
  );
}

function readVersionChain(
  db: Database.Database,
  documentId: string,
): Array<{
  versionId: string;
  parentSnapshotId: string | null;
  reason: string;
}> {
  return db
    .prepare<
      [string],
      {
        versionId: string;
        parentSnapshotId: string | null;
        reason: string;
      }
    >(
      "SELECT version_id as versionId, parent_snapshot_id as parentSnapshotId, reason FROM document_versions WHERE document_id = ? ORDER BY created_at DESC, rowid DESC",
    )
    .all(documentId);
}

function insertProject(db: Database.Database, projectId: string): void {
  db.prepare(
    "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
  ).run(projectId, "测试项目", "/worktree/test-root", Date.now(), Date.now());
}

function insertDocument(args: {
  db: Database.Database;
  projectId: string;
  documentId: string;
  title: string;
  contentText: string;
}): void {
  args.db.prepare(
    "INSERT INTO documents (document_id, project_id, title, content_json, content_text, content_md, content_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    args.documentId,
    args.projectId,
    args.title,
    JSON.stringify({ type: "doc", content: [] }),
    args.contentText,
    args.contentText,
    `hash-${args.documentId}`,
    Date.now(),
    Date.now(),
  );
}

function insertLegacyVersion(args: {
  db: Database.Database;
  projectId: string;
  documentId: string;
  versionId: string;
  contentText: string;
  wordCount: number;
  createdAt: number;
}): void {
  args.db.prepare(
    "INSERT INTO document_versions (version_id, project_id, document_id, actor, reason, content_json, content_text, content_md, content_hash, diff_format, diff_text, word_count, created_at) VALUES (?, ?, ?, 'user', 'manual-save', ?, ?, ?, ?, '', '', ?, ?)",
  ).run(
    args.versionId,
    args.projectId,
    args.documentId,
    JSON.stringify({ type: "doc", content: [] }),
    args.contentText,
    args.contentText,
    `hash-${args.versionId}`,
    args.wordCount,
    args.createdAt,
  );
}

function createInitDbUserDataDir(): string {
  fs.mkdirSync(TEST_ARTIFACTS_DIR, { recursive: true });
  return fs.mkdtempSync(path.join(TEST_ARTIFACTS_DIR, "db-init-"));
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

  it("通过生产迁移回填 legacy 快照链，并在同秒并列时保持从最新可追到最早", () => {
    const legacyDb = new Database(":memory:");
    legacyDb.pragma("foreign_keys = ON");
    try {
      applyMigrationsBeforeVersionParentSnapshot(legacyDb);
      insertProject(legacyDb, "proj-legacy");
      insertDocument({
        db: legacyDb,
        projectId: "proj-legacy",
        documentId: "doc-legacy",
        title: "迁移前文稿",
        contentText: "迁移前文稿",
      });
      insertLegacyVersion({
        db: legacyDb,
        projectId: "proj-legacy",
        documentId: "doc-legacy",
        versionId: "legacy-1",
        contentText: "初稿",
        wordCount: 2,
        createdAt: 1_000,
      });
      insertLegacyVersion({
        db: legacyDb,
        projectId: "proj-legacy",
        documentId: "doc-legacy",
        versionId: "aaa-old",
        contentText: "三稿",
        wordCount: 4,
        createdAt: 2_000,
      });
      insertLegacyVersion({
        db: legacyDb,
        projectId: "proj-legacy",
        documentId: "doc-legacy",
        versionId: "zzz-newer",
        contentText: "四稿",
        wordCount: 5,
        createdAt: 2_000,
      });
      insertLegacyVersion({
        db: legacyDb,
        projectId: "proj-legacy",
        documentId: "doc-legacy",
        versionId: "legacy-final",
        contentText: "终稿",
        wordCount: 6,
        createdAt: 3_000,
      });

      for (const migrationFile of [
        VERSION_PARENT_SNAPSHOT_MIGRATION,
        VERSION_PARENT_SNAPSHOT_ROWID_FIX_MIGRATION,
      ]) {
        legacyDb.exec(
          fs.readFileSync(path.join(MIGRATIONS_DIR, migrationFile), "utf8"),
        );
      }

      const rows = legacyDb
        .prepare<
          [string],
          { versionId: string; parentSnapshotId: string | null }
        >(
          "SELECT version_id as versionId, parent_snapshot_id as parentSnapshotId FROM document_versions WHERE document_id = ? ORDER BY created_at DESC, rowid DESC",
        )
        .all("doc-legacy");
      expect(rows).toEqual([
        { versionId: "legacy-final", parentSnapshotId: "zzz-newer" },
        { versionId: "zzz-newer", parentSnapshotId: "aaa-old" },
        { versionId: "aaa-old", parentSnapshotId: "legacy-1" },
        { versionId: "legacy-1", parentSnapshotId: null },
      ]);

      const parentMap = new Map(
        rows.map((row) => [row.versionId, row.parentSnapshotId] as const),
      );
      const traversed: string[] = [];
      let cursor: string | null = rows[0]?.versionId ?? null;
      while (cursor !== null) {
        traversed.push(cursor);
        cursor = parentMap.get(cursor) ?? null;
      }
      expect(traversed).toEqual([
        "legacy-final",
        "zzz-newer",
        "aaa-old",
        "legacy-1",
      ]);
    } finally {
      legacyDb.close();
    }
  });

  it("通过生产 initDb 注册链路执行 0027 migration，并把 legacy parentSnapshotId 回填到最新顺序", () => {
    const userDataDir = createInitDbUserDataDir();
    const dbPath = path.join(userDataDir, "data", "creonow.db");

    try {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      const legacyDb = new Database(dbPath);
      legacyDb.pragma("foreign_keys = ON");

      try {
        applyMigrations(
          legacyDb,
          (file) => file !== VERSION_PARENT_SNAPSHOT_ROWID_FIX_MIGRATION,
        );
        insertProject(legacyDb, "proj-init");
        insertDocument({
          db: legacyDb,
          projectId: "proj-init",
          documentId: "doc-init",
          title: "initDb 迁移链路",
          contentText: "迁移前文稿",
        });
        insertLegacyVersion({
          db: legacyDb,
          projectId: "proj-init",
          documentId: "doc-init",
          versionId: "legacy-1",
          contentText: "初稿",
          wordCount: 2,
          createdAt: 1_000,
        });
        insertLegacyVersion({
          db: legacyDb,
          projectId: "proj-init",
          documentId: "doc-init",
          versionId: "aaa-old",
          contentText: "三稿",
          wordCount: 4,
          createdAt: 2_000,
        });
        insertLegacyVersion({
          db: legacyDb,
          projectId: "proj-init",
          documentId: "doc-init",
          versionId: "zzz-newer",
          contentText: "四稿",
          wordCount: 5,
          createdAt: 2_000,
        });
        insertLegacyVersion({
          db: legacyDb,
          projectId: "proj-init",
          documentId: "doc-init",
          versionId: "legacy-final",
          contentText: "终稿",
          wordCount: 6,
          createdAt: 3_000,
        });
        legacyDb.exec(`
          CREATE TABLE schema_version (version INTEGER NOT NULL);
          INSERT INTO schema_version (version) VALUES (27);
        `);
      } finally {
        legacyDb.close();
      }

      const initResult = initDb({
        userDataDir,
        logger: fakeLogger,
      });
      expect(initResult.ok).toBe(true);
      if (!initResult.ok) {
        return;
      }

      try {
        expect(initResult.schemaVersion).toBe(28);
        const rows = initResult.db
          .prepare<
            [string],
            { versionId: string; parentSnapshotId: string | null }
          >(
            "SELECT version_id as versionId, parent_snapshot_id as parentSnapshotId FROM document_versions WHERE document_id = ? ORDER BY created_at DESC, rowid DESC",
          )
          .all("doc-init");

        expect(rows).toEqual([
          { versionId: "legacy-final", parentSnapshotId: "zzz-newer" },
          { versionId: "zzz-newer", parentSnapshotId: "aaa-old" },
          { versionId: "aaa-old", parentSnapshotId: "legacy-1" },
          { versionId: "legacy-1", parentSnapshotId: null },
        ]);
      } finally {
        initResult.db.close();
      }
    } finally {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  });

  it("同毫秒多次写入时仍把新快照挂到最后写入的 parent，并保持列表按真实写入顺序倒序展示", () => {
    const service = createDocumentCoreService({
      db,
      logger: fakeLogger as never,
    });
    const projectId = "proj-same-ms";
    insertProject(db, projectId);

    const created = service.create({
      projectId,
      title: "同毫秒文稿",
      type: "chapter",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const documentId = created.data.documentId;
    const save1 = service.save({
      projectId,
      documentId,
      actor: "user",
      reason: "manual-save",
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "第一稿" }] }],
      },
    });
    const save2 = service.save({
      projectId,
      documentId,
      actor: "user",
      reason: "manual-save",
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "第二稿" }] }],
      },
    });
    const save3 = service.save({
      projectId,
      documentId,
      actor: "auto",
      reason: "pre-write",
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "第三稿" }] }],
      },
    });
    expect(save1.ok).toBe(true);
    expect(save2.ok).toBe(true);
    expect(save3.ok).toBe(true);
    if (
      !save1.ok ||
      !save1.data.versionId ||
      !save2.ok ||
      !save2.data.versionId ||
      !save3.ok ||
      !save3.data.versionId
    ) {
      return;
    }

    const chain = readVersionChain(db, documentId);
    const byId = new Map(
      chain.map((item) => [item.versionId, item.parentSnapshotId] as const),
    );
    expect(chain.slice(0, 4).map((item) => item.versionId)).toEqual([
      save3.data.versionId,
      save2.data.versionId,
      save1.data.versionId,
    ]);
    expect(byId.get(save1.data.versionId)).toBeNull();
    expect(byId.get(save2.data.versionId)).toBe(save1.data.versionId);
    expect(byId.get(save3.data.versionId)).toBe(save2.data.versionId);

    const listed = service.listVersions({ documentId });
    expect(listed.ok).toBe(true);
    if (!listed.ok) {
      return;
    }
    expect(listed.data.items.slice(0, 3).map((item) => item.versionId)).toEqual([
      save3.data.versionId,
      save2.data.versionId,
      save1.data.versionId,
    ]);
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

  it("压缩连续 autosave 时会把保留节点重新挂到最近仍保留的前驱", () => {
    const bootstrapService = createDocumentCoreService({
      db,
      logger: fakeLogger as never,
    });
    const projectId = "proj-compaction";
    insertProject(db, projectId);

    const created = bootstrapService.create({
      projectId,
      title: "压缩链路",
      type: "chapter",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    const documentId = created.data.documentId;
    const initialSnapshots = bootstrapService.listVersions({ documentId });
    expect(initialSnapshots.ok).toBe(true);
    if (!initialSnapshots.ok) {
      return;
    }
    const initialVersionIds = initialSnapshots.data.items.map((item) => item.versionId);
    const manualSave1 = bootstrapService.save({
      projectId,
      documentId,
      actor: "user",
      reason: "manual-save",
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "基线稿" }] }],
      },
    });
    expect(manualSave1.ok).toBe(true);
    if (!manualSave1.ok || !manualSave1.data.versionId) {
      return;
    }

    vi.advanceTimersByTime(6 * 60_000);
    const autosave1 = bootstrapService.save({
      projectId,
      documentId,
      actor: "auto",
      reason: "autosave",
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "自动稿 1" }] }],
      },
    });
    expect(autosave1.ok).toBe(true);
    if (!autosave1.ok || !autosave1.data.versionId) {
      return;
    }

    vi.advanceTimersByTime(6 * 60_000);
    const autosave2 = bootstrapService.save({
      projectId,
      documentId,
      actor: "auto",
      reason: "autosave",
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "自动稿 2" }] }],
      },
    });
    expect(autosave2.ok).toBe(true);
    if (!autosave2.ok || !autosave2.data.versionId) {
      return;
    }

    vi.advanceTimersByTime(6 * 60_000);
    const autosave3 = bootstrapService.save({
      projectId,
      documentId,
      actor: "auto",
      reason: "autosave",
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "自动稿 3" }] }],
      },
    });
    expect(autosave3.ok).toBe(true);
    if (!autosave3.ok || !autosave3.data.versionId) {
      return;
    }

    vi.advanceTimersByTime(6 * 60_000);
    const compactionService = createDocumentCoreService({
      db,
      logger: fakeLogger as never,
      maxSnapshotsPerDocument: initialVersionIds.length + 3,
      autosaveCompactionAgeMs: 0,
    });
    const manualSave2 = compactionService.save({
      projectId,
      documentId,
      actor: "user",
      reason: "manual-save",
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "最终稿" }] }],
      },
    });
    expect(manualSave2.ok).toBe(true);
    expect(manualSave2.ok && manualSave2.data.compaction).toEqual({
      code: "VERSION_SNAPSHOT_COMPACTED",
      deletedCount: 2,
      remainingCount: initialVersionIds.length + 3,
    });
    if (!manualSave2.ok || !manualSave2.data.versionId) {
      return;
    }

    const versions = compactionService.listVersions({ documentId });
    expect(versions.ok).toBe(true);
    if (!versions.ok) {
      return;
    }

    const byId = new Map(versions.data.items.map((item) => [item.versionId, item] as const));
    expect(
      versions.data.items.filter((item) => item.parentSnapshotId === null),
    ).toHaveLength(1);
    expect(byId.has(autosave1.data.versionId)).toBe(false);
    expect(byId.has(autosave2.data.versionId)).toBe(false);
    expect(byId.get(autosave3.data.versionId)?.parentSnapshotId).toBe(
      manualSave1.data.versionId,
    );
    expect(byId.get(manualSave2.data.versionId)?.parentSnapshotId).toBe(
      autosave3.data.versionId,
    );

    const traversed: string[] = [];
    let cursor: string | null = manualSave2.data.versionId;
    while (cursor !== null) {
      traversed.push(cursor);
      cursor = byId.get(cursor)?.parentSnapshotId ?? null;
    }

    expect(traversed).toEqual([
      manualSave2.data.versionId,
      autosave3.data.versionId,
      manualSave1.data.versionId,
      ...initialVersionIds,
    ]);
  });

  it("同毫秒 autosave merge 与 rollback 仍保持单链，并指向最后写入的保留快照", () => {
    const service = createDocumentCoreService({
      db,
      logger: fakeLogger as never,
    });
    const projectId = "proj-same-ms-merge";
    insertProject(db, projectId);

    const created = service.create({
      projectId,
      title: "同毫秒合并文稿",
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
        content: [{ type: "paragraph", content: [{ type: "text", text: "基线稿" }] }],
      },
    });
    const autosave1 = service.save({
      projectId,
      documentId,
      actor: "auto",
      reason: "autosave",
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "自动稿 1" }] }],
      },
    });
    const autosave2 = service.save({
      projectId,
      documentId,
      actor: "auto",
      reason: "autosave",
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "自动稿 2（合并后）" }] }],
      },
    });
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
    expect(manualSave.ok).toBe(true);
    expect(autosave1.ok).toBe(true);
    expect(autosave2.ok).toBe(true);
    expect(manualSave2.ok).toBe(true);
    if (
      !manualSave.ok ||
      !manualSave.data.versionId ||
      !autosave1.ok ||
      !autosave1.data.versionId ||
      !autosave2.ok ||
      !autosave2.data.versionId ||
      !manualSave2.ok ||
      !manualSave2.data.versionId
    ) {
      return;
    }

    expect(autosave2.data.versionId).toBe(autosave1.data.versionId);

    const rollback = service.rollbackVersion({
      documentId,
      versionId: manualSave.data.versionId,
    });
    expect(rollback.ok).toBe(true);
    if (!rollback.ok) {
      return;
    }

    const chain = readVersionChain(db, documentId);
    const byId = new Map(chain.map((item) => [item.versionId, item] as const));
    expect(byId.get(manualSave.data.versionId)?.parentSnapshotId).toBeNull();
    expect(byId.get(autosave1.data.versionId)?.parentSnapshotId).toBe(
      manualSave.data.versionId,
    );
    expect(byId.get(manualSave2.data.versionId)?.parentSnapshotId).toBe(
      autosave1.data.versionId,
    );
    expect(byId.get(rollback.data.preRollbackVersionId)?.parentSnapshotId).toBe(
      manualSave2.data.versionId,
    );
    expect(byId.get(rollback.data.rollbackVersionId)?.parentSnapshotId).toBe(
      rollback.data.preRollbackVersionId,
    );

    expect(chain.slice(0, 6).map((item) => item.versionId)).toEqual([
      rollback.data.rollbackVersionId,
      rollback.data.preRollbackVersionId,
      manualSave2.data.versionId,
      autosave1.data.versionId,
      manualSave.data.versionId,
    ]);
  });
});
