/**
 * exportService — orchestration, format selection, input validation
 *
 * Covers: getDocumentProsemirror, getProjectProsemirror, input validation,
 * error mapping, format dispatch, path safety.
 *
 * Heavy I/O ops (PDF/DOCX/Markdown write) are tested lightly via mocks.
 */
import { describe, it, expect, vi } from "vitest";

import type Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import { createExportService } from "../exportService";

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
  wordCount: number;
  type: string;
  sortOrder: number;
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
    wordCount: text.split(/\s+/).length,
    type: "chapter",
    sortOrder: 0,
    updatedAt: 1_700_000_000,
    ...overrides,
  };
}

type ListRow = {
  documentId: string;
  title: string;
  sortOrder: number;
};

function createDbStub(args?: {
  readRow?: DocumentRow;
  listRows?: ListRow[];
  currentDocId?: string;
}): Database.Database {
  const readRow = args?.readRow ?? makeDocRow();
  const listRows = args?.listRows ?? [
    { documentId: "doc-1", title: "Test Document", sortOrder: 0 },
  ];
  const currentDocId = args?.currentDocId;

  return {
    prepare: (sql: string) => {
      // getCurrent query
      if (
        sql.includes("current_document_id") ||
        sql.includes("is_current = 1")
      ) {
        return {
          get: () =>
            currentDocId
              ? { documentId: currentDocId, projectId: "proj-1" }
              : undefined,
        };
      }

      // read single document
      if (sql.includes("FROM documents") && sql.includes("document_id = ?")) {
        return {
          get: (_projectId: string, _documentId: string) => readRow,
        };
      }

      // list documents
      if (sql.includes("FROM documents") && sql.includes("ORDER BY")) {
        return {
          all: () =>
            listRows.map((r) => ({
              ...readRow,
              documentId: r.documentId,
              title: r.title,
              sortOrder: r.sortOrder,
            })),
        };
      }

      return {
        get: () => undefined,
        all: () => [],
        run: () => ({ changes: 0 }),
      };
    },
    transaction: (fn: () => void) => () => fn(),
  } as unknown as Database.Database;
}

// ── getDocumentProsemirror ───────────────────────────────────────────

describe("exportService — getDocumentProsemirror", () => {
  it("returns contentJson for valid document", () => {
    const row = makeDocRow({ documentId: "doc-1" });
    const svc = createExportService({
      db: createDbStub({ readRow: row }),
      logger: createLogger(),
      userDataDir: "/fake/user",
    });

    const res = svc.getDocumentProsemirror({
      projectId: "proj-1",
      documentId: "doc-1",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.documentId).toBe("doc-1");
      expect(res.data.content).toBe(row.contentJson);
    }
  });

  it("returns error for missing document", () => {
    const db = {
      prepare: () => ({ get: () => undefined, all: () => [] }),
      transaction: (fn: () => void) => () => fn(),
    } as unknown as Database.Database;

    const svc = createExportService({
      db,
      logger: createLogger(),
      userDataDir: "/fake/user",
    });

    const res = svc.getDocumentProsemirror({
      projectId: "proj-1",
      documentId: "not-found",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("EXPORT_EMPTY_DOCUMENT");
    }
  });

  it("returns EXPORT_EMPTY_DOCUMENT when contentJson is empty", () => {
    const rowNoContent = makeDocRow({ documentId: "doc-empty" });
    // Create a row that returns empty contentJson
    const db = {
      prepare: (sql: string) => {
        if (sql.includes("FROM documents") && sql.includes("document_id = ?")) {
          return {
            get: () => ({
              ...rowNoContent,
              contentJson: "",
            }),
          };
        }
        return { get: () => undefined, all: () => [] };
      },
      transaction: (fn: () => void) => () => fn(),
    } as unknown as Database.Database;

    const svc = createExportService({
      db,
      logger: createLogger(),
      userDataDir: "/fake/user",
    });

    const res = svc.getDocumentProsemirror({
      projectId: "proj-1",
      documentId: "doc-empty",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("EXPORT_EMPTY_DOCUMENT");
    }
  });
});

// ── getProjectProsemirror ───────────────────────────────────────────

describe("exportService — getProjectProsemirror", () => {
  it("returns items with contentJson for each document", () => {
    const listRows: ListRow[] = [
      { documentId: "doc-a", title: "Chapter 1", sortOrder: 0 },
      { documentId: "doc-b", title: "Chapter 2", sortOrder: 1 },
    ];
    const row = makeDocRow();
    const svc = createExportService({
      db: createDbStub({ readRow: row, listRows }),
      logger: createLogger(),
      userDataDir: "/fake/user",
    });

    const res = svc.getProjectProsemirror({ projectId: "proj-1" });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.items.length).toBe(2);
      expect(res.data.items[0].documentId).toBe("doc-a");
      expect(res.data.items[1].documentId).toBe("doc-b");
      for (const item of res.data.items) {
        expect(item.content).toBeDefined();
        expect(item.content.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns empty items when no documents exist", () => {
    const svc = createExportService({
      db: createDbStub({ listRows: [] }),
      logger: createLogger(),
      userDataDir: "/fake/user",
    });

    const res = svc.getProjectProsemirror({ projectId: "proj-1" });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.items).toEqual([]);
    }
  });
});

// ── input validation ─────────────────────────────────────────────────

describe("exportService — input validation", () => {
  it("exportMarkdown rejects empty projectId", async () => {
    const svc = createExportService({
      db: createDbStub(),
      logger: createLogger(),
      userDataDir: "/fake/user",
    });

    const res = await svc.exportMarkdown({ projectId: "  " });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("exportTxt rejects empty projectId", async () => {
    const svc = createExportService({
      db: createDbStub(),
      logger: createLogger(),
      userDataDir: "/fake/user",
    });

    const res = await svc.exportTxt({ projectId: "" });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("exportPdf rejects empty projectId", async () => {
    const svc = createExportService({
      db: createDbStub(),
      logger: createLogger(),
      userDataDir: "/fake/user",
    });

    const res = await svc.exportPdf({ projectId: "  " });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("exportDocx rejects empty projectId", async () => {
    const svc = createExportService({
      db: createDbStub(),
      logger: createLogger(),
      userDataDir: "/fake/user",
    });

    const res = await svc.exportDocx({ projectId: "   " });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("exportProjectBundle rejects empty projectId", async () => {
    const svc = createExportService({
      db: createDbStub(),
      logger: createLogger(),
      userDataDir: "/fake/user",
    });

    const res = await svc.exportProjectBundle({ projectId: "" });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });
});

// ── path traversal guard ─────────────────────────────────────────────

describe("exportService — path safety", () => {
  it("rejects path traversal in projectId", async () => {
    const svc = createExportService({
      db: createDbStub(),
      logger: createLogger(),
      userDataDir: "/fake/user",
    });

    const res = await svc.exportMarkdown({
      projectId: "../etc",
      documentId: "doc-1",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
      expect(res.error.message).toContain("Unsafe");
    }
  });

  it("rejects slash in documentId", async () => {
    const svc = createExportService({
      db: createDbStub(),
      logger: createLogger(),
      userDataDir: "/fake/user",
    });

    const res = await svc.exportMarkdown({
      projectId: "proj-1",
      documentId: "../../etc/passwd",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });
});
