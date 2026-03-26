import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { registerConstraintsIpcHandlers } from "../../main/src/ipc/constraints";
import type { Logger } from "../../main/src/logging/logger";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

type ConstraintsConfig = { version: 1; items: string[] };

/**
 * Create a unique temp directory for integration tests.
 *
 * Why: isolation prevents tests from depending on local developer state.
 */
async function createTempDir(): Promise<string> {
  const base = path.join(os.tmpdir(), "CreoNow Integration 世界 ");
  return await fs.mkdtemp(base);
}

/**
 * Create a no-op logger.
 *
 * Why: IPC handlers require an explicit logger dependency.
 */
function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

/**
 * Create a minimal DB stub that supports `projects` lookups.
 */
function createDbStub(args: {
  projectId: string;
  rootPath: string;
}): Database.Database {
  const row = { rootPath: args.rootPath };
  const prepare = () => {
    return {
      get: (projectId: string) => {
        return projectId === args.projectId ? row : undefined;
      },
    };
  };
  return { prepare } as unknown as Database.Database;
}

/**
 * Create a minimal `ipcMain.handle` harness for integration tests.
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

const projectId = `proj_${randomUUID()}`;
const projectRoot = await createTempDir();
const db = createDbStub({ projectId, rootPath: projectRoot });
const logger = createLogger();
const { ipcMain, handlers } = createIpcHarness();

registerConstraintsIpcHandlers({
  ipcMain: ipcMain as unknown as IpcMain,
  db,
  logger,
});

const getHandler = handlers.get("constraints:policy:get");
assert.ok(getHandler, "Missing handler constraints:policy:get");
const setHandler = handlers.get("constraints:policy:set");
assert.ok(setHandler, "Missing handler constraints:policy:set");

const first = (await getHandler({}, { projectId })) as IpcResponse<{
  constraints: ConstraintsConfig;
}>;
assert.equal(first.ok, true);
if (first.ok) {
  assert.deepEqual(first.data.constraints, { version: 1, items: [] });
}

const desired: ConstraintsConfig = { version: 1, items: ["no spoilers"] };
const setRes = (await setHandler(
  {},
  { projectId, constraints: desired },
)) as IpcResponse<{
  constraints: ConstraintsConfig;
}>;
assert.equal(setRes.ok, true);

const second = (await getHandler({}, { projectId })) as IpcResponse<{
  constraints: ConstraintsConfig;
}>;
assert.equal(second.ok, true);
if (second.ok) {
  assert.deepEqual(second.data.constraints, desired);
}

const invalid = (await setHandler(
  {},
  {
    projectId,
    constraints: { version: 2, items: [] },
  },
)) as IpcResponse<unknown>;
assert.equal(invalid.ok, false);
if (!invalid.ok) {
  assert.equal(invalid.error.code, "INVALID_ARGUMENT");
}

const constraintsPath = path.join(
  projectRoot,
  ".creonow",
  "rules",
  "constraints.json",
);
await fs.writeFile(constraintsPath, "{", "utf8");

const corrupted = (await getHandler({}, { projectId })) as IpcResponse<unknown>;
assert.equal(corrupted.ok, false);
if (!corrupted.ok) {
  assert.equal(corrupted.error.code, "INVALID_ARGUMENT");
}

await fs.rm(projectRoot, { recursive: true, force: true });
