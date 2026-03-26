import assert from "node:assert/strict";

import type Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import { createSearchReplaceService } from "../searchReplaceService";

// ── helpers ─────────────────────────────────────────────────────────────

function createLogger(): Logger {
  return { logPath: "<test>", info: () => {}, error: () => {} };
}

type DocumentRow = {
  documentId: string;
  projectId: string;
  title: string;
  contentJson: string;
  contentText: string;
  contentMd: string;
  contentHash: string;
  type: string;
  updatedAt: number;
};

function makeDocRow(overrides?: Partial<DocumentRow>): DocumentRow {
  const text = overrides?.contentText ?? "Hello world";
  return {
    documentId: "doc-1",
    projectId: "proj-1",
    title: "Test Document",
    contentJson: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text }],
        },
      ],
    }),
    contentText: text,
    contentMd: text,
    contentHash: "hash-stub",
    type: "chapter",
    updatedAt: 1_700_000_000,
    ...overrides,
  };
}

function createDbStub(args?: {
  singleRow?: DocumentRow | undefined;
  allRows?: DocumentRow[];
  updateChanges?: number;
  latestRowAfterConflict?: DocumentRow | undefined;
}): Database.Database {
  const singleRow = args?.singleRow ?? makeDocRow();
  const allRows = args?.allRows ?? (singleRow ? [singleRow] : []);
  const updateChanges = args?.updateChanges ?? 1;
  const latestRowAfterConflict = args?.latestRowAfterConflict;

  let updateCallCount = 0;

  return {
    prepare: (sql: string) => {
      if (sql.includes("FROM documents") && sql.includes("document_id = ?")) {
        return {
          get: (..._params: unknown[]) => {
            // After a failed update (changes=0), service re-queries to decide conflict vs not-found
            if (updateCallCount > 0 && updateChanges === 0) {
              return latestRowAfterConflict;
            }
            return singleRow;
          },
        };
      }

      if (sql.includes("FROM documents") && sql.includes("ORDER BY")) {
        return {
          all: (..._params: unknown[]) => allRows,
        };
      }

      if (sql.includes("UPDATE documents SET")) {
        return {
          run: (..._params: unknown[]) => {
            updateCallCount += 1;
            return { changes: updateChanges };
          },
        };
      }

      if (sql.includes("INSERT INTO document_versions")) {
        return {
          run: (..._params: unknown[]) => ({ changes: 1 }),
        };
      }

      if (sql.includes("DELETE FROM documents_fts")) {
        return {
          run: (..._params: unknown[]) => ({ changes: 0 }),
        };
      }

      if (sql.includes("INSERT OR REPLACE INTO documents_fts")) {
        return {
          run: (..._params: unknown[]) => ({ changes: 1 }),
        };
      }

      return {
        get: () => undefined,
        all: () => [],
        run: () => ({ changes: 0 }),
      };
    },
    transaction: (fn: () => void) => {
      return () => {
        fn();
      };
    },
  } as unknown as Database.Database;
}

// ── Scenario 1: preview — empty projectId → INVALID_ARGUMENT ────────────

{
  const svc = createSearchReplaceService({
    db: createDbStub(),
    logger: createLogger(),
    previewStore: new Map(),
  });

  const res = svc.preview({
    projectId: "",
    scope: "currentDocument",
    query: "hello",
    replaceWith: "hi",
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.code, "INVALID_ARGUMENT");
    assert.ok(res.error.message.includes("projectId"));
  }
}

// ── Scenario 2: preview — empty query → INVALID_ARGUMENT ───────────────

{
  const svc = createSearchReplaceService({
    db: createDbStub(),
    logger: createLogger(),
    previewStore: new Map(),
  });

  const res = svc.preview({
    projectId: "proj-1",
    scope: "currentDocument",
    query: "   ",
    replaceWith: "hi",
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.code, "INVALID_ARGUMENT");
    assert.ok(res.error.message.includes("query"));
  }
}

// ── Scenario 3: preview — invalid scope → INVALID_ARGUMENT ─────────────

{
  const svc = createSearchReplaceService({
    db: createDbStub(),
    logger: createLogger(),
    previewStore: new Map(),
  });

  const res = svc.preview({
    projectId: "proj-1",
    scope: "bogusScope" as "currentDocument",
    query: "hello",
    replaceWith: "hi",
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.code, "INVALID_ARGUMENT");
    assert.ok(res.error.message.includes("scope"));
  }
}

// ── Scenario 4: preview — currentDocument happy path ────────────────────

{
  const row = makeDocRow({ contentText: "Hello world, Hello again" });
  const svc = createSearchReplaceService({
    db: createDbStub({ singleRow: row }),
    logger: createLogger(),
    previewStore: new Map(),
  });

  const res = svc.preview({
    projectId: "proj-1",
    documentId: "doc-1",
    scope: "currentDocument",
    query: "Hello",
    replaceWith: "Hi",
  });

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.data.affectedDocuments, 1);
    assert.equal(res.data.totalMatches, 2);
    assert.equal(res.data.items.length, 1);
    assert.equal(res.data.items[0].documentId, "doc-1");
    assert.equal(res.data.items[0].matchCount, 2);
    assert.ok(res.data.items[0].sample.length > 0);
    assert.equal(res.data.previewId, undefined);
  }
}

// ── Scenario 5: preview — no matches → 0 totals ────────────────────────

{
  const row = makeDocRow({ contentText: "Nothing relevant here" });
  const svc = createSearchReplaceService({
    db: createDbStub({ singleRow: row }),
    logger: createLogger(),
    previewStore: new Map(),
  });

  const res = svc.preview({
    projectId: "proj-1",
    documentId: "doc-1",
    scope: "currentDocument",
    query: "ZZZZZ",
    replaceWith: "abc",
  });

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.data.affectedDocuments, 0);
    assert.equal(res.data.totalMatches, 0);
    assert.equal(res.data.items.length, 0);
  }
}

// ── Scenario 6: preview — wholeProject returns previewId ────────────────

{
  const rows = [
    makeDocRow({ documentId: "doc-1", contentText: "apple banana" }),
    makeDocRow({ documentId: "doc-2", contentText: "apple pie" }),
  ];
  const previewStore = new Map();
  const svc = createSearchReplaceService({
    db: createDbStub({ allRows: rows }),
    logger: createLogger(),
    previewStore,
  });

  const res = svc.preview({
    projectId: "proj-1",
    scope: "wholeProject",
    query: "apple",
    replaceWith: "orange",
  });

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.data.affectedDocuments, 2);
    assert.equal(res.data.totalMatches, 2);
    assert.ok(typeof res.data.previewId === "string");
    assert.ok(res.data.previewId!.length > 0);
    // previewStore should hold the entry
    assert.equal(previewStore.size, 1);
  }
}

// ── Scenario 7: execute — currentDocument happy path ────────────────────

{
  const row = makeDocRow({ contentText: "Hello world" });
  const svc = createSearchReplaceService({
    db: createDbStub({ singleRow: row, updateChanges: 1 }),
    logger: createLogger(),
    previewStore: new Map(),
  });

  const res = svc.execute({
    projectId: "proj-1",
    documentId: "doc-1",
    scope: "currentDocument",
    query: "Hello",
    replaceWith: "Hi",
  });

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.data.replacedCount, 1);
    assert.equal(res.data.affectedDocumentCount, 1);
    assert.equal(res.data.skipped.length, 0);
  }
}

// ── Scenario 8: execute — wholeProject without confirmed → VALIDATION_ERROR ─

{
  const svc = createSearchReplaceService({
    db: createDbStub(),
    logger: createLogger(),
    previewStore: new Map(),
  });

  const res = svc.execute({
    projectId: "proj-1",
    scope: "wholeProject",
    query: "hello",
    replaceWith: "hi",
    confirmed: false,
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.code, "VALIDATION_ERROR");
    assert.ok(res.error.message.includes("confirmation"));
  }
}

// ── Scenario 9: execute — wholeProject without previewId → VALIDATION_ERROR ─

{
  const svc = createSearchReplaceService({
    db: createDbStub(),
    logger: createLogger(),
    previewStore: new Map(),
  });

  const res = svc.execute({
    projectId: "proj-1",
    scope: "wholeProject",
    query: "hello",
    replaceWith: "hi",
    confirmed: true,
    previewId: "",
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.code, "VALIDATION_ERROR");
    assert.ok(res.error.message.includes("previewId"));
  }
}

// ── Scenario 10: execute — concurrent write conflict ────────────────────

{
  const row = makeDocRow({ contentText: "Hello world" });
  const conflictRow = makeDocRow({
    contentText: "Hello world modified",
    updatedAt: 1_700_000_001,
  });

  const svc = createSearchReplaceService({
    db: createDbStub({
      singleRow: row,
      updateChanges: 0,
      latestRowAfterConflict: conflictRow,
    }),
    logger: createLogger(),
    previewStore: new Map(),
  });

  const res = svc.execute({
    projectId: "proj-1",
    documentId: "doc-1",
    scope: "currentDocument",
    query: "Hello",
    replaceWith: "Hi",
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.code, "SEARCH_CONCURRENT_WRITE_CONFLICT");
  }
}

// ── Scenario 11: preview — invalid regex → INVALID_ARGUMENT ────────────

{
  const svc = createSearchReplaceService({
    db: createDbStub(),
    logger: createLogger(),
    previewStore: new Map(),
  });

  const res = svc.preview({
    projectId: "proj-1",
    documentId: "doc-1",
    scope: "currentDocument",
    query: "[invalid((",
    replaceWith: "x",
    regex: true,
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.code, "INVALID_ARGUMENT");
  }
}

// ── Scenario 12: preview — regex=true matches regex pattern ─────────────

{
  const row = makeDocRow({ contentText: "cat bat hat" });
  const svc = createSearchReplaceService({
    db: createDbStub({ singleRow: row }),
    logger: createLogger(),
    previewStore: new Map(),
  });

  const res = svc.preview({
    projectId: "proj-1",
    documentId: "doc-1",
    scope: "currentDocument",
    query: "[cbh]at",
    replaceWith: "dog",
    regex: true,
  });

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.data.totalMatches, 3);
    assert.equal(res.data.affectedDocuments, 1);
  }
}

console.log("searchReplaceService.test.ts: all assertions passed");
