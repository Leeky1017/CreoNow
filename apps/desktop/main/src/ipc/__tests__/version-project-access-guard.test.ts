import assert from "node:assert/strict";

import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { Logger } from "../../logging/logger";
import { registerVersionIpcHandlers } from "../version";
import { createProjectSessionBindingRegistry } from "../projectSessionBinding";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
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

function createAccessDb(): Database.Database {
  return {
    prepare(sql: string) {
      if (sql.includes("FROM documents WHERE document_id = ?")) {
        return {
          get(documentId: string) {
            if (documentId === "doc-bound") {
              return { projectId: "project-bound" };
            }
            if (documentId === "doc-other") {
              return { projectId: "project-other" };
            }
            return undefined;
          },
        };
      }

      if (sql.includes("FROM document_versions WHERE document_id = ? AND version_id = ?")) {
        return {
          get(documentId: string, versionId: string) {
            if (documentId === "doc-bound" && versionId === "version-bound") {
              return { projectId: "project-bound" };
            }
            if (documentId === "doc-other" && versionId === "version-other") {
              return { projectId: "project-other" };
            }
            return undefined;
          },
        };
      }

      return {
        get() {
          return undefined;
        },
      };
    },
    transaction(run: () => void) {
      return () => run();
    },
  } as unknown as Database.Database;
}

// Scenario: version:snapshot:create rejects mismatched bound projectId [ADDED]
{
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
    contentJson: '{"type":"doc","content":[]}',
    actor: "user",
    reason: "manual-save",
  })) as {
    ok: boolean;
    error?: { code?: string };
  };

  assert.equal(denied.ok, false);
  assert.equal(denied.error?.code, "FORBIDDEN");
}

// Scenario: version:snapshot:create fails closed when renderer session is unbound [ADDED]
{
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
    contentJson: '{"type":"doc","content":[]}',
    actor: "user",
    reason: "manual-save",
  })) as {
    ok: boolean;
    error?: { code?: string };
  };

  assert.equal(denied.ok, false);
  assert.equal(denied.error?.code, "FORBIDDEN");
}

// Scenario: version list/read/rollback/restore enforce bound project session [ADDED]
{
  const binding = createProjectSessionBindingRegistry();
  binding.bind({ webContentsId: 72, projectId: "project-bound" });

  const harness = createIpcHarness();
  registerVersionIpcHandlers({
    ipcMain: harness.ipcMain,
    db: createAccessDb(),
    logger: createLogger(),
    projectSessionBinding: binding,
  });

  const snapshotList = harness.handlers.get("version:snapshot:list");
  const snapshotRead = harness.handlers.get("version:snapshot:read");
  const snapshotRollback = harness.handlers.get("version:snapshot:rollback");
  const snapshotRestore = harness.handlers.get("version:snapshot:restore");
  assert.ok(snapshotList, "expected version:snapshot:list handler");
  assert.ok(snapshotRead, "expected version:snapshot:read handler");
  assert.ok(snapshotRollback, "expected version:snapshot:rollback handler");
  assert.ok(snapshotRestore, "expected version:snapshot:restore handler");

  const deniedList = (await snapshotList!(createEvent(72), {
    documentId: "doc-other",
  })) as {
    ok: boolean;
    error?: { code?: string };
  };
  assert.equal(deniedList.ok, false);
  assert.equal(deniedList.error?.code, "FORBIDDEN");

  const deniedRead = (await snapshotRead!(createEvent(72), {
    documentId: "doc-other",
    versionId: "version-other",
  })) as {
    ok: boolean;
    error?: { code?: string };
  };
  assert.equal(deniedRead.ok, false);
  assert.equal(deniedRead.error?.code, "FORBIDDEN");

  const deniedRollback = (await snapshotRollback!(createEvent(72), {
    documentId: "doc-other",
    versionId: "version-other",
  })) as {
    ok: boolean;
    error?: { code?: string };
  };
  assert.equal(deniedRollback.ok, false);
  assert.equal(deniedRollback.error?.code, "FORBIDDEN");

  const deniedRestore = (await snapshotRestore!(createEvent(72), {
    documentId: "doc-other",
    versionId: "version-other",
  })) as {
    ok: boolean;
    error?: { code?: string };
  };
  assert.equal(deniedRestore.ok, false);
  assert.equal(deniedRestore.error?.code, "FORBIDDEN");
}
