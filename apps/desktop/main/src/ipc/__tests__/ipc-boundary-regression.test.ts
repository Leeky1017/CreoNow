import assert from "node:assert/strict";

import Database from "better-sqlite3";
import type { IpcMain, IpcMainInvokeEvent } from "electron";

import { registerProjectIpcHandlers } from "../project";
import { registerSearchIpcHandlers } from "../search";
import { registerStatsIpcHandlers } from "../stats";
import {
  createNoopLogger,
  createProjectTestDb,
} from "../../../../tests/unit/projectService.test-helpers";

type Handler = (
  event: IpcMainInvokeEvent,
  payload: unknown,
) => Promise<unknown> | unknown;

function createIpcHarness() {
  const handlers = new Map<string, Handler>();
  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  return {
    ipcMain,
    invoke: async (channel: string, payload: unknown) => {
      const handler = handlers.get(channel);
      assert.ok(handler, `missing handler ${channel}`);
      return await handler({} as IpcMainInvokeEvent, payload);
    },
  };
}

async function main(): Promise<void> {
  const logger = createNoopLogger();

  {
    const harness = createIpcHarness();
    const db = new Database(":memory:");
    db.exec(`
      CREATE TABLE stats_daily (
        date TEXT PRIMARY KEY,
        words_written INTEGER NOT NULL DEFAULT 0,
        writing_seconds INTEGER NOT NULL DEFAULT 0,
        skills_used INTEGER NOT NULL DEFAULT 0,
        documents_created INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT 0
      )
    `);

    registerStatsIpcHandlers({ ipcMain: harness.ipcMain, db, logger });

    const res = (await harness.invoke("stats:range:get", {
      from: "2026-02-30",
      to: "2026-03-01",
    })) as { ok: boolean; error?: { code?: string } };

    assert.equal(res.ok, false);
    assert.equal(res.error?.code, "INVALID_ARGUMENT");
    db.close();
  }

  {
    const harness = createIpcHarness();
    const db = new Database(":memory:");
    registerSearchIpcHandlers({ ipcMain: harness.ipcMain, db, logger });

    const res = (await harness.invoke("search:fts:query", null)) as {
      ok: boolean;
      error?: { code?: string };
    };

    assert.equal(res.ok, false);
    assert.equal(res.error?.code, "INVALID_ARGUMENT");
    db.close();
  }

  {
    const harness = createIpcHarness();
    const db = createProjectTestDb();

    registerProjectIpcHandlers({
      ipcMain: harness.ipcMain,
      db,
      userDataDir: "/tmp",
      logger,
    });

    const res = (await harness.invoke("project:project:list", undefined)) as {
      ok: boolean;
      data?: { items?: unknown[] };
    };

    assert.equal(res.ok, true);
    assert.deepEqual(res.data?.items, []);
    db.close();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
