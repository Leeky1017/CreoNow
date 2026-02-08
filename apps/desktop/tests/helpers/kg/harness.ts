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

/**
 * Build a no-op logger for deterministic KG tests.
 *
 * Why: KG services require explicit logger injection and tests must avoid
 * environment-dependent side effects.
 */
function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => undefined,
    error: () => undefined,
  };
}

/**
 * Create the SQLite schema required by KG P0 tests.
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
function createIpcHarness(): {
  ipcMain: FakeIpcMain;
  handlers: Map<string, Handler>;
} {
  const handlers = new Map<string, Handler>();
  const ipcMain: FakeIpcMain = {
    handle: (channel, handler) => {
      handlers.set(channel, handler);
    },
  };
  return { ipcMain, handlers };
}

/**
 * Create a ready-to-use KG test harness.
 */
export function createKnowledgeGraphIpcHarness(args?: { projectId?: string }): {
  db: Database.Database;
  projectId: string;
  handlers: Map<string, Handler>;
  invoke: <T>(channel: string, payload: unknown) => Promise<KgIpcResult<T>>;
  close: () => void;
} {
  const projectId = args?.projectId ?? "proj-1";
  const db = new Database(":memory:");
  bootstrapKgSchema(db, projectId);

  const { ipcMain, handlers } = createIpcHarness();
  registerKnowledgeGraphIpcHandlers({
    ipcMain: ipcMain as unknown as IpcMain,
    db,
    logger: createLogger(),
  });

  return {
    db,
    projectId,
    handlers,
    invoke: async <T>(channel: string, payload: unknown) => {
      const handler = handlers.get(channel);
      assert.ok(handler, `Missing IPC handler: ${channel}`);
      return (await handler({}, payload)) as KgIpcResult<T>;
    },
    close: () => db.close(),
  };
}
