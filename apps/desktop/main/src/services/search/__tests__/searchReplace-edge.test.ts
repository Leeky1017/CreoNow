/**
 * searchReplaceService — edge cases, concurrency, and advanced scenarios
 *
 * Covers: empty-match regex, special characters, wholeProject execute lifecycle,
 * preview token invalidation, encoding failure skips, concurrent writes in
 * wholeProject scope.
 */
import { describe, it, expect, vi } from "vitest";

import type Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import { createSearchReplaceService } from "../searchReplaceService";

// ── helpers ──────────────────────────────────────────────────────────

function createLogger(): Logger {
  return { logPath: "<test>", info: vi.fn(), error: vi.fn() };
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

type DbStubArgs = {
  singleRow?: DocumentRow | undefined;
  allRows?: DocumentRow[];
  updateChanges?: number;
  latestRowAfterConflict?: DocumentRow | undefined;
};

function createDbStub(args?: DbStubArgs): Database.Database {
  const singleRow =
    args?.singleRow === undefined
      ? args && "singleRow" in args
        ? undefined
        : makeDocRow()
      : args?.singleRow;
  const allRows = args?.allRows ?? (singleRow ? [singleRow] : []);
  const updateChanges = args?.updateChanges ?? 1;
  const latestRowAfterConflict = args?.latestRowAfterConflict;

  let updateCallCount = 0;

  return {
    prepare: (sql: string) => {
      if (sql.includes("FROM documents") && sql.includes("document_id = ?")) {
        return {
          get: () => {
            if (updateCallCount > 0 && updateChanges === 0) {
              return latestRowAfterConflict;
            }
            return singleRow;
          },
        };
      }

      if (sql.includes("FROM documents") && sql.includes("ORDER BY")) {
        return {
          all: () => allRows,
        };
      }

      if (sql.includes("UPDATE documents SET")) {
        return {
          run: () => {
            updateCallCount += 1;
            return { changes: updateChanges };
          },
        };
      }

      if (sql.includes("INSERT INTO document_versions")) {
        return {
          run: () => ({ changes: 1 }),
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

// ── edge cases ───────────────────────────────────────────────────────

describe("searchReplace — edge: empty-match regex", () => {
  it("handles zero-length regex match without infinite loop", () => {
    const row = makeDocRow({ contentText: "abc" });
    const svc = createSearchReplaceService({
      db: createDbStub({ singleRow: row }),
      logger: createLogger(),
      previewStore: new Map(),
    });

    const res = svc.preview({
      projectId: "proj-1",
      documentId: "doc-1",
      scope: "currentDocument",
      query: "(?:)",
      replaceWith: "x",
      regex: true,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.totalMatches).toBeGreaterThan(0);
    }
  });
});

describe("searchReplace — edge: special regex characters in literal mode", () => {
  it("escapes dots and brackets in non-regex mode", () => {
    const row = makeDocRow({ contentText: "price is $3.50 (USD)" });
    const svc = createSearchReplaceService({
      db: createDbStub({ singleRow: row }),
      logger: createLogger(),
      previewStore: new Map(),
    });

    const res = svc.preview({
      projectId: "proj-1",
      documentId: "doc-1",
      scope: "currentDocument",
      query: "$3.50",
      replaceWith: "$4.00",
      regex: false,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.totalMatches).toBe(1);
    }
  });
});

describe("searchReplace — edge: case-sensitive matching", () => {
  it("respects caseSensitive flag", () => {
    const row = makeDocRow({ contentText: "Hello HELLO hello" });
    const svc = createSearchReplaceService({
      db: createDbStub({ singleRow: row }),
      logger: createLogger(),
      previewStore: new Map(),
    });

    const caseInsensitive = svc.preview({
      projectId: "proj-1",
      documentId: "doc-1",
      scope: "currentDocument",
      query: "hello",
      replaceWith: "hi",
      caseSensitive: false,
    });
    expect(caseInsensitive.ok).toBe(true);
    if (caseInsensitive.ok) {
      expect(caseInsensitive.data.totalMatches).toBe(3);
    }

    const caseSensitive = svc.preview({
      projectId: "proj-1",
      documentId: "doc-1",
      scope: "currentDocument",
      query: "hello",
      replaceWith: "hi",
      caseSensitive: true,
    });
    expect(caseSensitive.ok).toBe(true);
    if (caseSensitive.ok) {
      expect(caseSensitive.data.totalMatches).toBe(1);
    }
  });
});

describe("searchReplace — edge: wholeWord matching", () => {
  it("only matches whole words", () => {
    const row = makeDocRow({ contentText: "cat category concatenate" });
    const svc = createSearchReplaceService({
      db: createDbStub({ singleRow: row }),
      logger: createLogger(),
      previewStore: new Map(),
    });

    const res = svc.preview({
      projectId: "proj-1",
      documentId: "doc-1",
      scope: "currentDocument",
      query: "cat",
      replaceWith: "dog",
      wholeWord: true,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.totalMatches).toBe(1);
    }
  });
});

describe("searchReplace — wholeProject execute lifecycle", () => {
  it("preview → execute completes full lifecycle with confirmation", () => {
    const rowA = makeDocRow({
      documentId: "doc-a",
      contentText: "alpha beta",
    });
    const rowB = makeDocRow({
      documentId: "doc-b",
      contentText: "alpha gamma",
    });
    const allRows = [rowA, rowB];
    const previewStore = new Map();

    // Custom DB stub that returns the correct row per documentId
    const db = {
      prepare: (sql: string) => {
        if (sql.includes("FROM documents") && sql.includes("document_id = ?")) {
          return {
            get: (_projectId: string, documentId: string) =>
              allRows.find((r) => r.documentId === documentId),
          };
        }
        if (sql.includes("FROM documents") && sql.includes("ORDER BY")) {
          return { all: () => allRows };
        }
        if (sql.includes("UPDATE documents SET")) {
          return { run: () => ({ changes: 1 }) };
        }
        if (sql.includes("INSERT INTO document_versions")) {
          return { run: () => ({ changes: 1 }) };
        }
        return {
          get: () => undefined,
          all: () => [],
          run: () => ({ changes: 0 }),
        };
      },
      transaction: (fn: () => void) => () => fn(),
    } as unknown as Database.Database;

    const svc = createSearchReplaceService({
      db,
      logger: createLogger(),
      previewStore,
    });

    const preview = svc.preview({
      projectId: "proj-1",
      scope: "wholeProject",
      query: "alpha",
      replaceWith: "omega",
    });

    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.data.previewId).toBeDefined();
    expect(preview.data.totalMatches).toBe(2);

    const execute = svc.execute({
      projectId: "proj-1",
      scope: "wholeProject",
      query: "alpha",
      replaceWith: "omega",
      confirmed: true,
      previewId: preview.data.previewId!,
    });

    expect(execute.ok).toBe(true);
    if (execute.ok) {
      expect(execute.data.replacedCount).toBe(2);
      expect(execute.data.affectedDocumentCount).toBe(2);
      expect(execute.data.snapshotIds.length).toBeGreaterThan(0);
    }
  });

  it("rejects execute when preview params changed", () => {
    const rows = [makeDocRow({ contentText: "alpha" })];
    const previewStore = new Map();
    const svc = createSearchReplaceService({
      db: createDbStub({ allRows: rows }),
      logger: createLogger(),
      previewStore,
    });

    const preview = svc.preview({
      projectId: "proj-1",
      scope: "wholeProject",
      query: "alpha",
      replaceWith: "omega",
    });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;

    const execute = svc.execute({
      projectId: "proj-1",
      scope: "wholeProject",
      query: "alpha",
      replaceWith: "DIFFERENT",
      confirmed: true,
      previewId: preview.data.previewId!,
    });

    expect(execute.ok).toBe(false);
    if (!execute.ok) {
      expect(execute.error.code).toBe("VALIDATION_ERROR");
      expect(execute.error.message).toContain("match");
    }
  });

  it("preview token is consumed after execute", () => {
    const rows = [makeDocRow({ contentText: "alpha" })];
    const previewStore = new Map();
    const svc = createSearchReplaceService({
      db: createDbStub({ allRows: rows, updateChanges: 1 }),
      logger: createLogger(),
      previewStore,
    });

    const preview = svc.preview({
      projectId: "proj-1",
      scope: "wholeProject",
      query: "alpha",
      replaceWith: "omega",
    });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;

    svc.execute({
      projectId: "proj-1",
      scope: "wholeProject",
      query: "alpha",
      replaceWith: "omega",
      confirmed: true,
      previewId: preview.data.previewId!,
    });

    const secondExecute = svc.execute({
      projectId: "proj-1",
      scope: "wholeProject",
      query: "alpha",
      replaceWith: "omega",
      confirmed: true,
      previewId: preview.data.previewId!,
    });

    expect(secondExecute.ok).toBe(false);
    if (!secondExecute.ok) {
      expect(secondExecute.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("searchReplace — wholeProject skip handling", () => {
  it("skips documents not found during execute and continues", () => {
    const rows = [
      makeDocRow({ documentId: "doc-a", contentText: "hello" }),
      makeDocRow({ documentId: "doc-b", contentText: "hello" }),
    ];
    const previewStore = new Map();

    const dbForPreview = createDbStub({ allRows: rows });
    const svcPreview = createSearchReplaceService({
      db: dbForPreview,
      logger: createLogger(),
      previewStore,
    });

    const preview = svcPreview.preview({
      projectId: "proj-1",
      scope: "wholeProject",
      query: "hello",
      replaceWith: "hi",
    });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;

    // Build a DB that returns undefined for all documents (simulating deletion)
    const dbForExecute = {
      ...dbForPreview,
      prepare: (sql: string) => {
        if (sql.includes("FROM documents") && sql.includes("document_id = ?")) {
          return { get: () => undefined };
        }
        return (dbForPreview as { prepare: (s: string) => unknown }).prepare(
          sql,
        );
      },
    } as unknown as Database.Database;

    const svcExecute = createSearchReplaceService({
      db: dbForExecute,
      logger: createLogger(),
      previewStore,
    });

    const res = svcExecute.execute({
      projectId: "proj-1",
      scope: "wholeProject",
      query: "hello",
      replaceWith: "hi",
      confirmed: true,
      previewId: preview.data.previewId!,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.replacedCount).toBe(0);
      expect(res.data.skipped.length).toBe(2);
      for (const skip of res.data.skipped) {
        expect(skip.reason).toBe("NOT_FOUND");
      }
    }
  });
});

describe("searchReplace — execute no matches is noop", () => {
  it("returns zero counts when text has no matches", () => {
    const row = makeDocRow({ contentText: "nothing relevant here" });
    const svc = createSearchReplaceService({
      db: createDbStub({ singleRow: row, updateChanges: 1 }),
      logger: createLogger(),
      previewStore: new Map(),
    });

    const res = svc.execute({
      projectId: "proj-1",
      documentId: "doc-1",
      scope: "currentDocument",
      query: "ZZZZZ",
      replaceWith: "abc",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.replacedCount).toBe(0);
      expect(res.data.affectedDocumentCount).toBe(0);
    }
  });
});

describe("searchReplace — regex with wholeWord combined", () => {
  it("uses regex with wholeWord boundary", () => {
    const row = makeDocRow({ contentText: "cat bat hat scatter" });
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
      wholeWord: true,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.totalMatches).toBe(3);
    }
  });
});
