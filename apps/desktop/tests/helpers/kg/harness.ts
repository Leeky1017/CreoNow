import assert from "node:assert/strict";

import Database from "better-sqlite3";
import type { IpcMain } from "electron";

import { registerKnowledgeGraphIpcHandlers } from "../../../main/src/ipc/knowledgeGraph";
import type { Logger } from "../../../main/src/logging/logger";

export type KgIpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

export type LoggedEvent = {
  event: string;
  data?: Record<string, unknown>;
};

type HarnessLoggerEvents = {
  info: LoggedEvent[];
  error: LoggedEvent[];
};

type PushEvent = {
  channel: string;
  payload: unknown;
};

/**
 * Build a deterministic in-memory logger for KG tests.
 *
 * Why: tests need to assert structured error/info events without touching disk.
 */
function createLogger(events: HarnessLoggerEvents): Logger {
  return {
    logPath: "<test>",
    info: (event, data) => {
      events.info.push({ event, data });
    },
    error: (event, data) => {
      events.error.push({ event, data });
    },
  };
}

/**
 * Create the SQLite schema required by KG tests.
 *
 * Why: in-memory DB setup keeps tests isolated and deterministic.
 */
function bootstrapKgSchema(db: Database.Database, projectId: string): void {
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      project_id TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS kg_entities (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      attributes_json TEXT NOT NULL,
      ai_context_level TEXT NOT NULL DEFAULT 'when_detected',
      aliases TEXT NOT NULL DEFAULT '[]',
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_kg_entities_project_type_name
      ON kg_entities(project_id, type, name);

    CREATE INDEX IF NOT EXISTS idx_kg_entities_project
      ON kg_entities(project_id);

    CREATE INDEX IF NOT EXISTS idx_kg_entities_project_type
      ON kg_entities(project_id, type);

    CREATE INDEX IF NOT EXISTS idx_kg_entities_project_name
      ON kg_entities(project_id, name);

    CREATE INDEX IF NOT EXISTS idx_kg_entities_project_context_level
      ON kg_entities(project_id, ai_context_level);

    CREATE TABLE IF NOT EXISTS kg_relation_types (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      key TEXT NOT NULL,
      label TEXT NOT NULL,
      builtin INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(project_id, key),
      FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS kg_relations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      source_entity_id TEXT NOT NULL,
      target_entity_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
      FOREIGN KEY(source_entity_id) REFERENCES kg_entities(id) ON DELETE CASCADE,
      FOREIGN KEY(target_entity_id) REFERENCES kg_entities(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_kg_relations_project
      ON kg_relations(project_id);

    CREATE INDEX IF NOT EXISTS idx_kg_relations_source
      ON kg_relations(project_id, source_entity_id);

    CREATE INDEX IF NOT EXISTS idx_kg_relations_target
      ON kg_relations(project_id, target_entity_id);
  `);

  db.prepare("INSERT INTO projects (project_id) VALUES (?)").run(projectId);
}

/**
 * Build a tiny IPC harness for KG integration tests.
 *
 * Why: tests must validate real handler wiring without booting Electron.
 */
function createIpcHarness(rendererId: number): {
  ipcMain: FakeIpcMain;
  handlers: Map<string, Handler>;
  sender: { id: number; send: (channel: string, payload: unknown) => void };
  pushEvents: PushEvent[];
} {
  const handlers = new Map<string, Handler>();
  const pushEvents: PushEvent[] = [];

  const ipcMain: FakeIpcMain = {
    handle: (channel, handler) => {
      handlers.set(channel, handler);
    },
  };

  const sender = {
    id: rendererId,
    send: (channel: string, payload: unknown) => {
      pushEvents.push({ channel, payload });
    },
  };

  return { ipcMain, handlers, sender, pushEvents };
}

/**
 * Wait until pushed events for a specific channel reach a minimum count.
 */
async function waitForPushCount(args: {
  channel: string;
  events: PushEvent[];
  count: number;
  timeoutMs: number;
}): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= args.timeoutMs) {
    const matchedCount = args.events.filter(
      (event) => event.channel === args.channel,
    ).length;
    if (matchedCount >= args.count) {
      return true;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 5);
    });
  }

  return false;
}

/**
 * Create a ready-to-use KG test harness.
 */
export function createKnowledgeGraphIpcHarness(args?: {
  projectId?: string;
  rendererId?: number;
}): {
  db: Database.Database;
  projectId: string;
  handlers: Map<string, Handler>;
  logs: HarnessLoggerEvents;
  invoke: <T>(channel: string, payload: unknown) => Promise<KgIpcResult<T>>;
  getPushEvents: <T>(
    channel?: string,
  ) => Array<{ channel: string; payload: T }>;
  takePushEvents: <T>(
    channel: string,
  ) => Array<{ channel: string; payload: T }>;
  waitForPushCount: (
    channel: string,
    count: number,
    timeoutMs?: number,
  ) => Promise<boolean>;
  close: () => void;
} {
  const projectId = args?.projectId ?? "proj-1";
  const rendererId = args?.rendererId ?? 1;
  const db = new Database(":memory:");
  bootstrapKgSchema(db, projectId);

  const { ipcMain, handlers, sender, pushEvents } =
    createIpcHarness(rendererId);
  const logs: HarnessLoggerEvents = {
    info: [],
    error: [],
  };

  registerKnowledgeGraphIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db,
    logger: createLogger(logs),
  });

  return {
    db,
    projectId,
    handlers,
    logs,
    invoke: async <T>(channel: string, payload: unknown) => {
      const handler = handlers.get(channel);
      assert.ok(handler, `Missing IPC handler: ${channel}`);
      return (await handler({ sender }, payload)) as KgIpcResult<T>;
    },
    getPushEvents: <T>(channel?: string) => {
      const events = channel
        ? pushEvents.filter((event) => event.channel === channel)
        : pushEvents;
      return events.map((event) => ({
        channel: event.channel,
        payload: event.payload as T,
      }));
    },
    takePushEvents: <T>(channel: string) => {
      const taken: Array<{ channel: string; payload: T }> = [];
      for (let i = pushEvents.length - 1; i >= 0; i -= 1) {
        if (pushEvents[i]?.channel !== channel) {
          continue;
        }
        const event = pushEvents.splice(i, 1)[0];
        if (!event) {
          continue;
        }
        taken.push({
          channel: event.channel,
          payload: event.payload as T,
        });
      }
      taken.reverse();
      return taken;
    },
    waitForPushCount: async (channel, count, timeoutMs = 1_000) => {
      return await waitForPushCount({
        channel,
        events: pushEvents,
        count,
        timeoutMs,
      });
    },
    close: () => db.close(),
  };
}
