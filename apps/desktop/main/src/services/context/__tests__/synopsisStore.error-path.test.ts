import assert from "node:assert/strict";

import Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import { createSqliteSynopsisStore } from "../synopsisStore";

function createLogger(
  errors: Array<{ event: string; data?: Record<string, unknown> }>,
): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: (event, data) => {
      errors.push({ event, ...(data ? { data } : {}) });
    },
  };
}

// Scenario: S3-SYN-INJ-S3
// emits structured degradation signals on synopsis persistence failure.
{
  const db = new Database(":memory:");
  const errorLogs: Array<{ event: string; data?: Record<string, unknown> }> =
    [];
  const store = createSqliteSynopsisStore({
    db,
    logger: createLogger(errorLogs),
    now: () => 1701000000000,
  });

  const persist = store.upsert({
    projectId: "proj-synopsis-store",
    documentId: "doc-1",
    chapterOrder: 1,
    synopsisText: "第一章摘要",
  });

  assert.equal(persist.ok, false);
  if (persist.ok) {
    throw new Error("upsert should fail when schema is missing");
  }
  assert.equal(persist.error.code, "DB_ERROR");

  const list = store.listRecentByProject({
    projectId: "proj-synopsis-store",
    limit: 3,
  });

  assert.equal(list.ok, false);
  if (list.ok) {
    throw new Error("listRecentByProject should fail when schema is missing");
  }
  assert.equal(list.error.code, "DB_ERROR");

  assert.equal(errorLogs.length >= 2, true);
  assert.equal(
    errorLogs.some((log) => log.event === "synopsis_store_upsert_failed"),
    true,
  );
  assert.equal(
    errorLogs.some((log) => log.event === "synopsis_store_list_failed"),
    true,
  );

  db.close();
}

console.log("synopsisStore.error-path.test.ts: all assertions passed");
