import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { registerConstraintsIpcHandlers } from "../../../main/src/ipc/constraints";
import type { Logger } from "../../../main/src/logging/logger";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

type Handler = (event: unknown, payload: unknown) => Promise<unknown>;

type FakeIpcMain = {
  handle: (channel: string, handler: Handler) => void;
};

type ConstraintSource = "user" | "kg";

type ConstraintItem = {
  id: string;
  text: string;
  source: ConstraintSource;
  priority: number;
  updatedAt: string;
  degradable: boolean;
};

/**
 * Create a unique temp directory for isolation.
 */
async function createTempDir(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "CreoNow CE4 CRUD "));
}

/**
 * Create a no-op logger.
 */
function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

/**
 * Create a minimal DB stub for project lookup.
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
 * Build a minimal ipcMain harness.
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

// Scenario Mapping: CE4-R1-S1
{
  // Arrange
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

  const listHandler = handlers.get("constraints:policy:list");
  assert.ok(listHandler, "Missing handler constraints:policy:list");
  const createHandler = handlers.get("constraints:policy:create");
  assert.ok(createHandler, "Missing handler constraints:policy:create");
  const updateHandler = handlers.get("constraints:policy:update");
  assert.ok(updateHandler, "Missing handler constraints:policy:update");
  const deleteHandler = handlers.get("constraints:policy:delete");
  assert.ok(deleteHandler, "Missing handler constraints:policy:delete");

  // Act
  const invalid = (await createHandler(
    {},
    {
      projectId,
      constraint: {
        text: "   ",
        source: "user",
        priority: 100,
      },
    },
  )) as IpcResponse<unknown>;

  // Assert
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.equal(invalid.error.code, "CONSTRAINT_VALIDATION_ERROR");
  }

  // Act
  const created = (await createHandler(
    {},
    {
      projectId,
      constraint: {
        text: "主角在第五章前不知道真相",
        source: "user",
        priority: 100,
        degradable: false,
      },
    },
  )) as IpcResponse<{ constraint: ConstraintItem }>;

  // Assert
  assert.equal(created.ok, true);
  if (!created.ok) {
    assert.fail("expected create success");
  }

  const createdId = created.data.constraint.id;

  // Act
  const listed = (await listHandler({}, { projectId })) as IpcResponse<{
    constraints: ConstraintItem[];
  }>;

  // Assert
  assert.equal(listed.ok, true);
  if (listed.ok) {
    assert.equal(listed.data.constraints.length, 1);
    assert.equal(listed.data.constraints[0].id, createdId);
  }

  // Act
  const missing = (await updateHandler(
    {},
    {
      projectId,
      constraintId: "missing-id",
      patch: {
        text: "update",
      },
    },
  )) as IpcResponse<unknown>;

  // Assert
  assert.equal(missing.ok, false);
  if (!missing.ok) {
    assert.equal(missing.error.code, "CONSTRAINT_NOT_FOUND");
  }

  // Act
  const duplicate = (await createHandler(
    {},
    {
      projectId,
      constraint: {
        text: "主角在第五章前不知道真相",
        source: "user",
        priority: 80,
      },
    },
  )) as IpcResponse<unknown>;

  // Assert
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) {
    assert.equal(duplicate.error.code, "CONSTRAINT_CONFLICT");
  }

  // Act
  const deleted = (await deleteHandler(
    {},
    {
      projectId,
      constraintId: createdId,
    },
  )) as IpcResponse<{ deletedConstraintId: string }>;

  // Assert
  assert.equal(deleted.ok, true);
  if (deleted.ok) {
    assert.equal(deleted.data.deletedConstraintId, createdId);
  }

  await fs.rm(projectRoot, { recursive: true, force: true });
}
