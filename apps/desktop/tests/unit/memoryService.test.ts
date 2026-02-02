import assert from "node:assert/strict";

import type Database from "better-sqlite3";

import type { Logger } from "../../main/src/logging/logger";
import { createMemoryService } from "../../main/src/services/memory/memoryService";

type MemoryRow = {
  memoryId: string;
  type: string;
  scope: string;
  projectId: string | null;
  documentId: string | null;
  origin: string;
  sourceRef: string | null;
  content: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

type DocumentRow = {
  documentId: string;
  projectId: string;
};

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function createDbStub(): {
  db: Database.Database;
  data: { memories: MemoryRow[]; documents: DocumentRow[] };
} {
  const memories: MemoryRow[] = [];
  const documents: DocumentRow[] = [
    { documentId: "doc-1", projectId: "proj-1" },
    { documentId: "doc-2", projectId: "proj-1" },
  ];

  const db = {
    prepare: (sql: string) => {
      // SELECT for checking document existence
      if (sql.includes("FROM documents WHERE document_id")) {
        return {
          get: (documentId: string, projectId: string) => {
            const found = documents.find(
              (d) => d.documentId === documentId && d.projectId === projectId,
            );
            return found ? { exists: 1 } : undefined;
          },
        };
      }

      // SELECT by memory_id
      if (sql.includes("FROM user_memory WHERE memory_id")) {
        return {
          get: (memoryId: string) => {
            const row = memories.find((m) => m.memoryId === memoryId);
            if (!row) return undefined;
            return {
              memoryId: row.memoryId,
              type: row.type,
              scope: row.scope,
              projectId: row.projectId,
              documentId: row.documentId,
              origin: row.origin,
              sourceRef: row.sourceRef,
              content: row.content,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
              deletedAt: row.deletedAt,
            };
          },
        };
      }

      // SELECT list query
      if (sql.includes("FROM user_memory") && sql.includes("WHERE 1=1")) {
        return {
          all: (...args: unknown[]) => {
            let filtered = memories.filter((m) => m.deletedAt === null);

            // Handle scope filtering based on args
            if (args.length === 1) {
              // projectId only
              const projectId = args[0] as string;
              filtered = filtered.filter(
                (m) =>
                  m.scope === "global" ||
                  (m.scope === "project" && m.projectId === projectId),
              );
            } else if (args.length === 3) {
              // projectId, projectId, documentId (for document scope)
              const projectId = args[0] as string;
              const documentId = args[2] as string;
              filtered = filtered.filter(
                (m) =>
                  m.scope === "global" ||
                  (m.scope === "project" && m.projectId === projectId) ||
                  (m.scope === "document" &&
                    m.projectId === projectId &&
                    m.documentId === documentId),
              );
            }

            return filtered.map((m) => ({
              memoryId: m.memoryId,
              type: m.type,
              scope: m.scope,
              projectId: m.projectId,
              documentId: m.documentId,
              origin: m.origin,
              sourceRef: m.sourceRef,
              content: m.content,
              createdAt: m.createdAt,
              updatedAt: m.updatedAt,
              deletedAt: m.deletedAt,
            }));
          },
        };
      }

      // INSERT
      if (sql.startsWith("INSERT INTO user_memory")) {
        return {
          run: (
            memoryId: string,
            type: string,
            scope: string,
            projectId: string | null,
            documentId: string | null,
            content: string,
            createdAt: number,
            updatedAt: number,
          ) => {
            memories.push({
              memoryId,
              type,
              scope,
              projectId,
              documentId,
              origin: "manual",
              sourceRef: null,
              content,
              createdAt,
              updatedAt,
              deletedAt: null,
            });
          },
        };
      }

      // UPDATE
      if (sql.startsWith("UPDATE user_memory SET type")) {
        return {
          run: (
            type: string,
            scope: string,
            projectId: string | null,
            documentId: string | null,
            content: string,
            updatedAt: number,
            memoryId: string,
          ) => {
            const row = memories.find((m) => m.memoryId === memoryId);
            if (row) {
              row.type = type;
              row.scope = scope;
              row.projectId = projectId;
              row.documentId = documentId;
              row.content = content;
              row.updatedAt = updatedAt;
            }
          },
        };
      }

      // DELETE (soft delete)
      if (sql.includes("SET deleted_at")) {
        return {
          run: (ts: number, _: number, memoryId: string) => {
            const row = memories.find((m) => m.memoryId === memoryId);
            if (row) {
              row.deletedAt = ts;
              row.updatedAt = ts;
            }
          },
        };
      }

      // SELECT deleted_at (for delete check)
      if (sql.includes("deleted_at as deletedAt FROM user_memory")) {
        return {
          get: (memoryId: string) => {
            const row = memories.find((m) => m.memoryId === memoryId);
            if (!row) return undefined;
            return { deletedAt: row.deletedAt };
          },
        };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    },
  } as unknown as Database.Database;

  return { db, data: { memories, documents } };
}

const logger = createLogger();

// Test: create with scope=document requires documentId
{
  const { db } = createDbStub();
  const svc = createMemoryService({ db, logger });

  const res = svc.create({
    type: "preference",
    scope: "document",
    projectId: "proj-1",
    content: "test",
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.code, "INVALID_ARGUMENT");
    assert.ok(res.error.message.includes("documentId is required"));
  }
}

// Test: create with scope=document and missing projectId
{
  const { db } = createDbStub();
  const svc = createMemoryService({ db, logger });

  const res = svc.create({
    type: "preference",
    scope: "document",
    documentId: "doc-1",
    content: "test",
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.code, "INVALID_ARGUMENT");
    assert.ok(res.error.message.includes("projectId is required"));
  }
}

// Test: create with scope=document succeeds when document exists
{
  const { db, data } = createDbStub();
  const svc = createMemoryService({ db, logger });

  const res = svc.create({
    type: "preference",
    scope: "document",
    projectId: "proj-1",
    documentId: "doc-1",
    content: "document-level memory",
  });

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.data.scope, "document");
    assert.equal(res.data.projectId, "proj-1");
    assert.equal(res.data.documentId, "doc-1");
    assert.equal(res.data.content, "document-level memory");
  }
  assert.equal(data.memories.length, 1);
}

// Test: create with scope=document fails when document does not exist
{
  const { db } = createDbStub();
  const svc = createMemoryService({ db, logger });

  const res = svc.create({
    type: "preference",
    scope: "document",
    projectId: "proj-1",
    documentId: "non-existent-doc",
    content: "test",
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.code, "NOT_FOUND");
    assert.ok(res.error.message.includes("Document not found"));
  }
}

// Test: list with documentId returns three layers
{
  const { db, data } = createDbStub();
  const svc = createMemoryService({ db, logger });

  // Create memories at all three scopes
  svc.create({ type: "preference", scope: "global", content: "global mem" });
  svc.create({
    type: "fact",
    scope: "project",
    projectId: "proj-1",
    content: "project mem",
  });
  svc.create({
    type: "note",
    scope: "document",
    projectId: "proj-1",
    documentId: "doc-1",
    content: "document mem",
  });

  assert.equal(data.memories.length, 3);

  const listRes = svc.list({ projectId: "proj-1", documentId: "doc-1" });
  assert.equal(listRes.ok, true);
  if (listRes.ok) {
    assert.equal(listRes.data.items.length, 3);
    // Verify sorting: document (0) > project (1) > global (2)
    assert.equal(listRes.data.items[0]?.scope, "document");
    assert.equal(listRes.data.items[1]?.scope, "project");
    assert.equal(listRes.data.items[2]?.scope, "global");
  }
}

// Test: list without documentId returns only global + project
{
  const { db } = createDbStub();
  const svc = createMemoryService({ db, logger });

  svc.create({ type: "preference", scope: "global", content: "global mem" });
  svc.create({
    type: "fact",
    scope: "project",
    projectId: "proj-1",
    content: "project mem",
  });
  svc.create({
    type: "note",
    scope: "document",
    projectId: "proj-1",
    documentId: "doc-1",
    content: "document mem",
  });

  const listRes = svc.list({ projectId: "proj-1" });
  assert.equal(listRes.ok, true);
  if (listRes.ok) {
    assert.equal(listRes.data.items.length, 2);
    const scopes = listRes.data.items.map((i) => i.scope);
    assert.ok(scopes.includes("global"));
    assert.ok(scopes.includes("project"));
    assert.ok(!scopes.includes("document"));
  }
}

// Test: scope validation - global scope cannot have projectId
{
  const { db } = createDbStub();
  const svc = createMemoryService({ db, logger });

  const res = svc.create({
    type: "preference",
    scope: "global",
    projectId: "proj-1",
    content: "test",
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.code, "INVALID_ARGUMENT");
    assert.ok(
      res.error.message.includes("projectId is not allowed for global scope"),
    );
  }
}

// Test: scope validation - project scope cannot have documentId
{
  const { db } = createDbStub();
  const svc = createMemoryService({ db, logger });

  const res = svc.create({
    type: "preference",
    scope: "project",
    projectId: "proj-1",
    documentId: "doc-1",
    content: "test",
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.code, "INVALID_ARGUMENT");
    assert.ok(
      res.error.message.includes("documentId is not allowed for project scope"),
    );
  }
}

console.log("memoryService.test.ts: all assertions passed");
