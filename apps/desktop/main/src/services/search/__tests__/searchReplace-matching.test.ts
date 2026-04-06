/**
 * searchReplaceService — matching, replace, regex, scope tests
 *
 * Covers: case-sensitive, wholeWord, regex matching, JSON tree replacement,
 * wholeProject scope with preview/execute lifecycle, edge cases.
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

function createDbStub(args?: {
  singleRow?: DocumentRow | undefined;
  allRows?: DocumentRow[];
  updateChanges?: number;
  latestRowAfterConflict?: DocumentRow | undefined;
}): Database.Database {
  const singleRow = args?.singleRow === undefined
    ? (args && "singleRow" in args ? undefined : makeDocRow())
    : args?.singleRow;
  const allRows = args?.allRows ?? (singleRow ? [singleRow] : []);
  const updateChanges = args?.updateChanges ?? 1;
  const latestRowAfterConflict = args?.latestRowAfterConflict;

  let updateCallCount = 0;

  return {
    prepare: (sql: string) => {
      if (sql.includes("FROM documents") && sql.includes("document_id = ?")) {
        return {
          get: (..._params: unknown[]) => {
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

// ── tests ────────────────────────────────────────────────────────────

describe("searchReplaceService — matching logic", () => {
  describe("case sensitivity", () => {
    it("case-insensitive search (default) matches all cases", () => {
      const row = makeDocRow({ contentText: "Apple apple APPLE" });
      const svc = createSearchReplaceService({
        db: createDbStub({ singleRow: row }),
        logger: createLogger(),
        previewStore: new Map(),
      });

      const res = svc.preview({
        projectId: "proj-1",
        documentId: "doc-1",
        scope: "currentDocument",
        query: "apple",
        replaceWith: "pear",
        caseSensitive: false,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.totalMatches).toBe(3);
      }
    });

    it("case-sensitive search only matches exact case", () => {
      const row = makeDocRow({ contentText: "Apple apple APPLE" });
      const svc = createSearchReplaceService({
        db: createDbStub({ singleRow: row }),
        logger: createLogger(),
        previewStore: new Map(),
      });

      const res = svc.preview({
        projectId: "proj-1",
        documentId: "doc-1",
        scope: "currentDocument",
        query: "apple",
        replaceWith: "pear",
        caseSensitive: true,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.totalMatches).toBe(1);
      }
    });
  });

  describe("whole word matching", () => {
    it("wholeWord=true does not match partial words", () => {
      const row = makeDocRow({ contentText: "catapult cat scatter" });
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

    it("wholeWord=false matches within words", () => {
      const row = makeDocRow({ contentText: "catapult cat scatter" });
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
        wholeWord: false,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.totalMatches).toBe(3);
      }
    });
  });

  describe("regex mode", () => {
    it("regex matches patterns correctly", () => {
      const row = makeDocRow({ contentText: "2024-01-15 and 2024-12-31" });
      const svc = createSearchReplaceService({
        db: createDbStub({ singleRow: row }),
        logger: createLogger(),
        previewStore: new Map(),
      });

      const res = svc.preview({
        projectId: "proj-1",
        documentId: "doc-1",
        scope: "currentDocument",
        query: "\\d{4}-\\d{2}-\\d{2}",
        replaceWith: "DATE",
        regex: true,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.totalMatches).toBe(2);
      }
    });

    it("special regex chars are escaped when regex=false", () => {
      const row = makeDocRow({ contentText: "price is $10.00 (USD)" });
      const svc = createSearchReplaceService({
        db: createDbStub({ singleRow: row }),
        logger: createLogger(),
        previewStore: new Map(),
      });

      const res = svc.preview({
        projectId: "proj-1",
        documentId: "doc-1",
        scope: "currentDocument",
        query: "$10.00",
        replaceWith: "$20.00",
        regex: false,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.totalMatches).toBe(1);
      }
    });

    it("regex + caseSensitive combo works", () => {
      const row = makeDocRow({ contentText: "Cat cat CAT" });
      const svc = createSearchReplaceService({
        db: createDbStub({ singleRow: row }),
        logger: createLogger(),
        previewStore: new Map(),
      });

      const res = svc.preview({
        projectId: "proj-1",
        documentId: "doc-1",
        scope: "currentDocument",
        query: "c[a-z]t",
        replaceWith: "dog",
        regex: true,
        caseSensitive: true,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.totalMatches).toBe(1);
      }
    });
  });

  describe("preview — sample generation", () => {
    it("preview returns a non-empty sample with context", () => {
      const longText = "Before text. Replace me here. After text that is quite long.";
      const row = makeDocRow({ contentText: longText });
      const svc = createSearchReplaceService({
        db: createDbStub({ singleRow: row }),
        logger: createLogger(),
        previewStore: new Map(),
      });

      const res = svc.preview({
        projectId: "proj-1",
        documentId: "doc-1",
        scope: "currentDocument",
        query: "Replace me",
        replaceWith: "Fixed",
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.items[0].sample).toContain("Replace me");
        expect(res.data.items[0].sample.length).toBeGreaterThan(0);
        expect(res.data.items[0].sample.length).toBeLessThanOrEqual(80);
      }
    });
  });
});

describe("searchReplaceService — execute replace", () => {
  it("execute replaces text inside JSON text nodes", () => {
    const row = makeDocRow({ contentText: "old text here" });
    const svc = createSearchReplaceService({
      db: createDbStub({ singleRow: row, updateChanges: 1 }),
      logger: createLogger(),
      previewStore: new Map(),
    });

    const res = svc.execute({
      projectId: "proj-1",
      documentId: "doc-1",
      scope: "currentDocument",
      query: "old",
      replaceWith: "new",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.replacedCount).toBe(1);
      expect(res.data.affectedDocumentCount).toBe(1);
      expect(res.data.skipped).toHaveLength(0);
    }
  });

  it("execute with regex replaceWith captures", () => {
    const row = makeDocRow({ contentText: "foo123bar" });
    const svc = createSearchReplaceService({
      db: createDbStub({ singleRow: row, updateChanges: 1 }),
      logger: createLogger(),
      previewStore: new Map(),
    });

    const res = svc.execute({
      projectId: "proj-1",
      documentId: "doc-1",
      scope: "currentDocument",
      query: "(\\d+)",
      replaceWith: "[$1]",
      regex: true,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.replacedCount).toBe(1);
    }
  });

  it("execute returns 0 replacedCount when no matches", () => {
    const row = makeDocRow({ contentText: "nothing to find" });
    const svc = createSearchReplaceService({
      db: createDbStub({ singleRow: row }),
      logger: createLogger(),
      previewStore: new Map(),
    });

    const res = svc.execute({
      projectId: "proj-1",
      documentId: "doc-1",
      scope: "currentDocument",
      query: "ZZZZZZ",
      replaceWith: "x",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.replacedCount).toBe(0);
      expect(res.data.affectedDocumentCount).toBe(0);
    }
  });

  it("execute skips NOT_FOUND when document missing", () => {
    const svc = createSearchReplaceService({
      db: createDbStub({ singleRow: undefined }),
      logger: createLogger(),
      previewStore: new Map(),
    });

    const res = svc.execute({
      projectId: "proj-1",
      documentId: "doc-missing",
      scope: "currentDocument",
      query: "hello",
      replaceWith: "hi",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.replacedCount).toBe(0);
      expect(res.data.skipped).toHaveLength(1);
      expect(res.data.skipped[0].reason).toBe("NOT_FOUND");
    }
  });
});

describe("searchReplaceService — wholeProject scope lifecycle", () => {
  it("preview → execute lifecycle with previewId works correctly", () => {
    const rows = [
      makeDocRow({ documentId: "doc-1", contentText: "hello world" }),
      makeDocRow({ documentId: "doc-2", contentText: "hello again" }),
      makeDocRow({ documentId: "doc-3", contentText: "no match here" }),
    ];
    const previewStore = new Map();
    const svc = createSearchReplaceService({
      db: createDbStub({ allRows: rows, updateChanges: 1 }),
      logger: createLogger(),
      previewStore,
    });

    const previewRes = svc.preview({
      projectId: "proj-1",
      scope: "wholeProject",
      query: "hello",
      replaceWith: "hi",
    });

    expect(previewRes.ok).toBe(true);
    if (!previewRes.ok) return;

    expect(previewRes.data.affectedDocuments).toBe(2);
    expect(previewRes.data.totalMatches).toBe(2);
    expect(previewRes.data.previewId).toBeDefined();
    expect(previewStore.size).toBe(1);

    const previewId = previewRes.data.previewId!;

    const executeRes = svc.execute({
      projectId: "proj-1",
      scope: "wholeProject",
      query: "hello",
      replaceWith: "hi",
      confirmed: true,
      previewId,
    });

    expect(executeRes.ok).toBe(true);
    if (executeRes.ok) {
      expect(executeRes.data.replacedCount).toBe(2);
      expect(executeRes.data.affectedDocumentCount).toBe(2);
      expect(executeRes.data.snapshotIds.length).toBeGreaterThanOrEqual(2);
    }

    expect(previewStore.size).toBe(0);
  });

  it("wholeProject execute with mismatched preview returns VALIDATION_ERROR", () => {
    const previewStore = new Map();
    const svc = createSearchReplaceService({
      db: createDbStub({ allRows: [makeDocRow()] }),
      logger: createLogger(),
      previewStore,
    });

    const previewRes = svc.preview({
      projectId: "proj-1",
      scope: "wholeProject",
      query: "hello",
      replaceWith: "hi",
    });
    expect(previewRes.ok).toBe(true);
    if (!previewRes.ok) return;

    const res = svc.execute({
      projectId: "proj-1",
      scope: "wholeProject",
      query: "DIFFERENT_QUERY",
      replaceWith: "hi",
      confirmed: true,
      previewId: previewRes.data.previewId!,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("VALIDATION_ERROR");
      expect(res.error.message).toContain("match");
    }
  });

  it("wholeProject execute with invalid previewId returns VALIDATION_ERROR", () => {
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
      previewId: "non-existent-id",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("VALIDATION_ERROR");
      expect(res.error.message).toContain("Preview");
    }
  });

  it("wholeProject execute skips documents that disappear between preview and execute", () => {
    const rows = [
      makeDocRow({ documentId: "doc-1", contentText: "hello" }),
      makeDocRow({ documentId: "doc-2", contentText: "hello" }),
    ];
    const previewStore = new Map();

    const dbStubForPreview = createDbStub({ allRows: rows });
    const svc = createSearchReplaceService({
      db: dbStubForPreview,
      logger: createLogger(),
      previewStore,
    });

    const previewRes = svc.preview({
      projectId: "proj-1",
      scope: "wholeProject",
      query: "hello",
      replaceWith: "hi",
    });
    expect(previewRes.ok).toBe(true);
    if (!previewRes.ok) return;

    const dbStubForExecute = {
      ...dbStubForPreview,
      prepare: (sql: string) => {
        if (sql.includes("FROM documents") && sql.includes("document_id = ?")) {
          return { get: () => undefined };
        }
        return (dbStubForPreview as { prepare: (sql: string) => unknown }).prepare(sql);
      },
    } as unknown as Database.Database;

    const svc2 = createSearchReplaceService({
      db: dbStubForExecute,
      logger: createLogger(),
      previewStore,
    });

    const res = svc2.execute({
      projectId: "proj-1",
      scope: "wholeProject",
      query: "hello",
      replaceWith: "hi",
      confirmed: true,
      previewId: previewRes.data.previewId!,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.replacedCount).toBe(0);
      expect(res.data.skipped.length).toBe(2);
      expect(res.data.skipped[0].reason).toBe("NOT_FOUND");
    }
  });
});

describe("searchReplaceService — error paths", () => {
  it("currentDocument scope requires documentId", () => {
    const svc = createSearchReplaceService({
      db: createDbStub(),
      logger: createLogger(),
      previewStore: new Map(),
    });

    const res = svc.preview({
      projectId: "proj-1",
      scope: "currentDocument",
      query: "hello",
      replaceWith: "hi",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
      expect(res.error.message).toContain("documentId");
    }
  });

  it("DB error during preview returns DB_ERROR", () => {
    const db = {
      prepare: () => {
        throw new Error("DB crashed");
      },
      transaction: (fn: () => void) => () => fn(),
    } as unknown as Database.Database;

    const svc = createSearchReplaceService({
      db,
      logger: createLogger(),
      previewStore: new Map(),
    });

    const res = svc.preview({
      projectId: "proj-1",
      documentId: "doc-1",
      scope: "currentDocument",
      query: "hello",
      replaceWith: "hi",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("DB_ERROR");
    }
  });

  it("concurrent write conflict in currentDocument returns retryable error", () => {
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

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("SEARCH_CONCURRENT_WRITE_CONFLICT");
      expect(res.error.retryable).toBe(true);
    }
  });

  it("document deleted during execute returns NOT_FOUND", () => {
    const row = makeDocRow({ contentText: "Hello world" });

    const svc = createSearchReplaceService({
      db: createDbStub({
        singleRow: row,
        updateChanges: 0,
        latestRowAfterConflict: undefined,
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

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("NOT_FOUND");
    }
  });
});

describe("searchReplaceService — nested JSON content", () => {
  it("replaces text across multiple nested text nodes", () => {
    const nestedJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "First hello" },
            { type: "text", text: " and another hello" },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Second paragraph hello" }],
        },
      ],
    };
    const row = makeDocRow({
      contentText: "First hello and another hello Second paragraph hello",
      contentJson: JSON.stringify(nestedJson),
    });
    const svc = createSearchReplaceService({
      db: createDbStub({ singleRow: row, updateChanges: 1 }),
      logger: createLogger(),
      previewStore: new Map(),
    });

    const res = svc.execute({
      projectId: "proj-1",
      documentId: "doc-1",
      scope: "currentDocument",
      query: "hello",
      replaceWith: "hi",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.replacedCount).toBe(3);
    }
  });
});
