import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import type { IpcMain } from "electron";
import { afterEach, describe, it } from "vitest";

import { createDocumentService } from "../../services/documents/documentService";
import type { Logger } from "../../logging/logger";
import { createProjectSessionBindingRegistry } from "../projectSessionBinding";
import { registerVersionIpcHandlers } from "../version";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../db/migrations",
);

const openedDbs: Database.Database[] = [];

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

function createIpcHarness(): {
  handlers: Map<string, Handler>;
  ipcMain: IpcMain;
} {
  const handlers = new Map<string, Handler>();
  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;
  return { handlers, ipcMain };
}

function createEvent(webContentsId: number): { sender: { id: number } } {
  return { sender: { id: webContentsId } };
}

function createSnapshotFixture() {
  const db = new Database(":memory:");
  openedDbs.push(db);
  db.pragma("foreign_keys = ON");
  applyAllMigrations(db);
  db.prepare(
    "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
  ).run("project-bound", "测试项目", "/worktree/test-root", Date.now(), Date.now());

  const service = createDocumentService({ db, logger: createLogger() });
  const created = service.create({
    projectId: "project-bound",
    title: "第一章",
    type: "chapter",
  });
  if (!created.ok) {
    throw new Error(created.error.message);
  }

  const firstSave = service.save({
    projectId: "project-bound",
    documentId: created.data.documentId,
    contentJson: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "初稿" }],
        },
      ],
    },
    actor: "user",
    reason: "manual-save",
  });
  const secondSave = service.save({
    projectId: "project-bound",
    documentId: created.data.documentId,
    contentJson: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "终稿" }],
        },
      ],
    },
    actor: "user",
    reason: "manual-save",
  });
  if (!firstSave.ok || !firstSave.data.versionId || !secondSave.ok) {
    throw new Error("failed to prepare version snapshots");
  }

  return {
    db,
    service,
    documentId: created.data.documentId,
    rollbackTargetVersionId: firstSave.data.versionId,
  };
}

afterEach(() => {
  for (const db of openedDbs.splice(0)) {
    db.close();
  }
});

describe("version IPC project access guard", () => {
  it("rejects snapshot create when bound projectId mismatches", async () => {
    const binding = createProjectSessionBindingRegistry();
    binding.bind({ webContentsId: 71, projectId: "project-bound" });

    const harness = createIpcHarness();
    registerVersionIpcHandlers({
      ipcMain: harness.ipcMain,
      db: null,
      logger: createLogger(),
      projectSessionBinding: binding,
    });

    const snapshotCreate = harness.handlers.get("version:snapshot:create");
    assert.ok(snapshotCreate, "expected version:snapshot:create handler");

    const denied = (await snapshotCreate!(createEvent(71), {
      projectId: "project-other",
      documentId: "doc-1",
      contentJson: "{\"type\":\"doc\",\"content\":[]}",
      actor: "user",
      reason: "manual-save",
    })) as {
      ok: boolean;
      error?: { code?: string };
    };

    assert.equal(denied.ok, false);
    assert.equal(denied.error?.code, "FORBIDDEN");
  });

  it("fails closed for snapshot create when renderer session is unbound", async () => {
    const binding = createProjectSessionBindingRegistry();

    const harness = createIpcHarness();
    registerVersionIpcHandlers({
      ipcMain: harness.ipcMain,
      db: null,
      logger: createLogger(),
      projectSessionBinding: binding,
    });

    const snapshotCreate = harness.handlers.get("version:snapshot:create");
    assert.ok(snapshotCreate, "expected version:snapshot:create handler");

    const denied = (await snapshotCreate!(createEvent(999), {
      projectId: "project-guess",
      documentId: "doc-1",
      contentJson: "{\"type\":\"doc\",\"content\":[]}",
      actor: "user",
      reason: "manual-save",
    })) as {
      ok: boolean;
      error?: { code?: string };
    };

    assert.equal(denied.ok, false);
    assert.equal(denied.error?.code, "FORBIDDEN");
  });

  it("rejects rollback when project/session binding mismatches", async () => {
    const { db, documentId, rollbackTargetVersionId } = createSnapshotFixture();
    const binding = createProjectSessionBindingRegistry();
    binding.bind({ webContentsId: 72, projectId: "project-bound" });

    const harness = createIpcHarness();
    registerVersionIpcHandlers({
      ipcMain: harness.ipcMain,
      db,
      logger: createLogger(),
      projectSessionBinding: binding,
    });

    const rollback = harness.handlers.get("version:snapshot:rollback");
    assert.ok(rollback, "expected version:snapshot:rollback handler");

    const denied = (await rollback!(createEvent(72), {
      projectId: "project-other",
      documentId,
      versionId: rollbackTargetVersionId,
    })) as {
      ok: boolean;
      error?: { code?: string };
    };

    assert.equal(denied.ok, false);
    assert.equal(denied.error?.code, "FORBIDDEN");
  });

  it("allows rollback when project/session binding matches and restores content", async () => {
    const { db, service, documentId, rollbackTargetVersionId } =
      createSnapshotFixture();
    const binding = createProjectSessionBindingRegistry();
    binding.bind({ webContentsId: 73, projectId: "project-bound" });

    const harness = createIpcHarness();
    registerVersionIpcHandlers({
      ipcMain: harness.ipcMain,
      db,
      logger: createLogger(),
      projectSessionBinding: binding,
    });

    const rollback = harness.handlers.get("version:snapshot:rollback");
    assert.ok(rollback, "expected version:snapshot:rollback handler");

    const restored = (await rollback!(createEvent(73), {
      projectId: "project-bound",
      documentId,
      versionId: rollbackTargetVersionId,
    })) as {
      ok: boolean;
      data?: {
        restored: true;
        preRollbackVersionId: string;
        rollbackVersionId: string;
      };
    };

    const currentDocument = service.read({
      projectId: "project-bound",
      documentId,
    });
    if (currentDocument.ok === false) {
      throw new Error(currentDocument.error.message);
    }
    assert.equal(restored.ok, true);
    assert.equal(currentDocument.data.contentText, "初稿");
  });
});
