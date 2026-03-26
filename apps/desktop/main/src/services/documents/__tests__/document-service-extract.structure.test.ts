import assert from "node:assert/strict";

import type Database from "better-sqlite3";

import { createBranchService } from "../branchService";
import { createDocumentCrudService } from "../documentCrudService";
import { createVersionService } from "../versionService";

type Logger = {
  logPath: string;
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

function createNoopLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function createFakeDb(): Database.Database {
  return {
    prepare() {
      throw new Error("should not execute SQL while wiring services");
    },
    transaction(run: () => void) {
      return () => run();
    },
  } as unknown as Database.Database;
}

const db = createFakeDb();
const logger = createNoopLogger();

const crud = createDocumentCrudService({ db, logger });
assert.deepEqual(
  Object.keys(crud).sort(),
  [
    "create",
    "delete",
    "getCurrent",
    "list",
    "read",
    "reorder",
    "save",
    "setCurrent",
    "update",
    "updateStatus",
  ],
  "S1-DSE-S1: CRUD methods should be extracted into a dedicated service",
);

const version = createVersionService({ db, logger });
assert.deepEqual(
  Object.keys(version).sort(),
  [
    "diffVersions",
    "listVersions",
    "readVersion",
    "restoreVersion",
    "rollbackVersion",
  ],
  "S1-DSE-S1: Version methods should be extracted into a dedicated service",
);

const branch = createBranchService({ db, logger });
assert.deepEqual(
  Object.keys(branch).sort(),
  [
    "createBranch",
    "listBranches",
    "mergeBranch",
    "resolveMergeConflict",
    "switchBranch",
  ],
  "S1-DSE-S1: Branch methods should be extracted into a dedicated service",
);
