import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type Database from "better-sqlite3";

import { createDocumentService } from "../../../main/src/services/documents/documentService";
import type { Logger } from "../../../main/src/logging/logger";

function createNoopLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function createDbForReadNotFound(): Database.Database {
  return {
    prepare() {
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

const service = createDocumentService({
  db: createDbForReadNotFound(),
  logger: createNoopLogger(),
});

assert.deepEqual(
  Object.keys(service).sort(),
  [
    "create",
    "createBranch",
    "delete",
    "diffVersions",
    "getCurrent",
    "list",
    "listBranches",
    "listVersions",
    "mergeBranch",
    "read",
    "readVersion",
    "reorder",
    "resolveMergeConflict",
    "restoreVersion",
    "rollbackVersion",
    "save",
    "setCurrent",
    "switchBranch",
    "update",
    "updateStatus",
  ],
  "S1-DSE-S2: facade contract must keep the same public method surface",
);

const notFoundResult = service.read({
  projectId: "project-1",
  documentId: "missing-doc",
});
assert.equal(notFoundResult.ok, false);
if (notFoundResult.ok) {
  throw new Error("expected read to fail with NOT_FOUND");
}
assert.equal(
  notFoundResult.error.code,
  "NOT_FOUND",
  "S1-DSE-S2: read error semantics should remain stable",
);

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const facadePath = path.resolve(
  currentDir,
  "../../../main/src/services/documents/documentService.ts",
);
const facadeSource = readFileSync(facadePath, "utf8");

assert.match(
  facadeSource,
  /createDocumentCrudService/,
  "S1-DSE-S2: facade should delegate CRUD to extracted service",
);
assert.match(
  facadeSource,
  /createVersionService/,
  "S1-DSE-S2: facade should delegate version to extracted service",
);
assert.match(
  facadeSource,
  /createBranchService/,
  "S1-DSE-S2: facade should delegate branch to extracted service",
);
