import type Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import { createDocumentService } from "../documentService";
import type { Logger } from "../../../logging/logger";

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

describe("createDocumentService facade contract", () => {
  it("exposes only the P1 CRUD + linear snapshot surface", () => {
    const service = createDocumentService({
      db: createDbForReadNotFound(),
      logger: createNoopLogger(),
    });

    expect(Object.keys(service).sort()).toEqual([
      "create",
      "delete",
      "diffVersions",
      "getCurrent",
      "list",
      "listVersions",
      "read",
      "readVersion",
      "reorder",
      "restoreVersion",
      "rollbackVersion",
      "save",
      "setCurrent",
      "update",
      "updateStatus",
    ]);
  });

  it("keeps read error semantics stable", () => {
    const service = createDocumentService({
      db: createDbForReadNotFound(),
      logger: createNoopLogger(),
    });

    const notFoundResult = service.read({
      projectId: "project-1",
      documentId: "missing-doc",
    });

    expect(notFoundResult.ok).toBe(false);
    if (notFoundResult.ok) {
      throw new Error("expected read to fail with NOT_FOUND");
    }
    expect(notFoundResult.error.code).toBe("NOT_FOUND");
  });
});
