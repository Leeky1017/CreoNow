import assert from "node:assert/strict";

import Database from "better-sqlite3";
import type { IpcMain } from "electron";

import type { Logger } from "../../logging/logger";
import { registerAiProxyIpcHandlers } from "../aiProxy";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function createSettingsDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE settings (
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (scope, key)
    )
  `);

  const now = Date.now();
  const insert = db.prepare(
    "INSERT INTO settings(scope, key, value_json, updated_at) VALUES (?, ?, ?, ?)",
  );
  insert.run("app", "creonow.ai.provider.mode", JSON.stringify("openai-byok"), now);
  insert.run(
    "app",
    "creonow.ai.provider.openaiByok.baseUrl",
    JSON.stringify("https://api.openai.com"),
    now,
  );
  insert.run(
    "app",
    "creonow.ai.provider.openaiByok.apiKey",
    JSON.stringify("sk-invalid-key"),
    now,
  );

  return db;
}

const handlers = new Map<string, Handler>();
const ipcMain = {
  handle: (channel: string, listener: Handler) => {
    handlers.set(channel, listener);
  },
} as unknown as IpcMain;

const db = createSettingsDb();

registerAiProxyIpcHandlers({
  ipcMain,
  db,
  logger: createLogger(),
});

let fetchCalls = 0;
const originalFetch = globalThis.fetch;

globalThis.fetch = (async () => {
  fetchCalls += 1;
  return new Response("", {
    status: 401,
    headers: { "content-type": "text/plain" },
  });
}) as typeof fetch;

try {
  const handler = handlers.get("ai:config:test");
  assert.ok(handler, "expected IPC handler ai:config:test to be registered");

  const res = (await handler({}, {})) as {
    ok: boolean;
    data?: {
      ok: boolean;
      error?: { code?: string };
    };
  };

  assert.equal(res.ok, true);
  assert.equal(res.data?.ok, false);
  assert.equal(
    res.data?.error?.code,
    "AI_AUTH_FAILED",
    "config test should map invalid key to AI_AUTH_FAILED",
  );
  assert.equal(fetchCalls, 1, "auth failures must not trigger retry storms");
} finally {
  globalThis.fetch = originalFetch;
}
