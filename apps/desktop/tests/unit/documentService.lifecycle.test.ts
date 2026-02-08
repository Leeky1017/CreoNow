import assert from "node:assert/strict";

import type Database from "better-sqlite3";

import { createDocumentService } from "../../main/src/services/documents/documentService";
import type { Logger } from "../../main/src/logging/logger";

type DocumentType = "chapter" | "note" | "setting" | "timeline" | "character";
type DocumentStatus = "draft" | "final";

type DocRow = {
  documentId: string;
  projectId: string;
  type: DocumentType;
  title: string;
  contentJson: string;
  contentText: string;
  contentMd: string;
  contentHash: string;
  status: DocumentStatus;
  sortOrder: number;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
};

function createNoopLogger(): Logger {
  return { logPath: "<test>", info: () => {}, error: () => {} };
}

function createFakeDb(): Database.Database {
  const docs: DocRow[] = [];
  const settings = new Map<string, { valueJson: string; updatedAt: number }>();

  function settingsKey(scope: string, key: string): string {
    return `${scope}::${key}`;
  }

  const db = {
    prepare(sql: string) {
      if (
        sql.startsWith(
          "INSERT INTO documents (document_id, project_id, type, title, content_json",
        )
      ) {
        return {
          run(
            documentId: string,
            projectId: string,
            type: DocumentType,
            title: string,
            contentJson: string,
            contentText: string,
            contentMd: string,
            contentHash: string,
            status: DocumentStatus,
            sortOrder: number,
            parentId: string | null,
            createdAt: number,
            updatedAt: number,
          ) {
            docs.push({
              documentId,
              projectId,
              type,
              title,
              contentJson,
              contentText,
              contentMd,
              contentHash,
              status,
              sortOrder,
              parentId,
              createdAt,
              updatedAt,
            });
            return { changes: 1 };
          },
        };
      }

      if (
        sql ===
        "SELECT MAX(sort_order) as maxSortOrder FROM documents WHERE project_id = ?"
      ) {
        return {
          get(projectId: string) {
            const scoped = docs.filter((d) => d.projectId === projectId);
            if (scoped.length === 0) {
              return { maxSortOrder: null };
            }
            return {
              maxSortOrder: Math.max(...scoped.map((d) => d.sortOrder)),
            };
          },
        };
      }

      if (
        sql.startsWith(
          "INSERT INTO documents (document_id, project_id, title, content_json",
        )
      ) {
        return {
          run(
            documentId: string,
            projectId: string,
            title: string,
            contentJson: string,
            contentText: string,
            contentMd: string,
            contentHash: string,
            createdAt: number,
            updatedAt: number,
          ) {
            docs.push({
              documentId,
              projectId,
              type: "chapter",
              title,
              contentJson,
              contentText,
              contentMd,
              contentHash,
              status: "draft",
              sortOrder: docs.length,
              parentId: null,
              createdAt,
              updatedAt,
            });
            return { changes: 1 };
          },
        };
      }

      if (
        sql ===
        "SELECT document_id as documentId, type, title, status, sort_order as sortOrder, parent_id as parentId, updated_at as updatedAt FROM documents WHERE project_id = ? ORDER BY sort_order ASC, updated_at DESC, document_id ASC"
      ) {
        return {
          all(projectId: string) {
            return docs
              .filter((d) => d.projectId === projectId)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((d) => ({
                documentId: d.documentId,
                type: d.type,
                title: d.title,
                status: d.status,
                sortOrder: d.sortOrder,
                parentId: d.parentId ?? undefined,
                updatedAt: d.updatedAt,
              }));
          },
        };
      }

      if (
        sql ===
        "SELECT document_id as documentId FROM documents WHERE project_id = ? AND document_id = ?"
      ) {
        return {
          get(projectId: string, documentId: string) {
            const row = docs.find(
              (d) => d.projectId === projectId && d.documentId === documentId,
            );
            return row ? { documentId: row.documentId } : undefined;
          },
        };
      }

      if (
        sql ===
        "SELECT document_id as documentId FROM documents WHERE project_id = ? ORDER BY updated_at DESC, document_id ASC LIMIT 1"
      ) {
        return {
          get(projectId: string) {
            const row = docs
              .filter((d) => d.projectId === projectId)
              .sort((a, b) => b.updatedAt - a.updatedAt)[0];
            return row ? { documentId: row.documentId } : undefined;
          },
        };
      }

      if (
        sql ===
        "SELECT value_json as valueJson FROM settings WHERE scope = ? AND key = ?"
      ) {
        return {
          get(scope: string, key: string) {
            const row = settings.get(settingsKey(scope, key));
            return row ? { valueJson: row.valueJson } : undefined;
          },
        };
      }

      if (
        sql.startsWith(
          "INSERT INTO settings (scope, key, value_json, updated_at) VALUES",
        )
      ) {
        return {
          run(scope: string, key: string, valueJson: string, updatedAt: number) {
            settings.set(settingsKey(scope, key), { valueJson, updatedAt });
            return { changes: 1 };
          },
        };
      }

      if (sql === "DELETE FROM settings WHERE scope = ? AND key = ?") {
        return {
          run(scope: string, key: string) {
            settings.delete(settingsKey(scope, key));
            return { changes: 1 };
          },
        };
      }

      if (sql === "DELETE FROM documents WHERE project_id = ? AND document_id = ?") {
        return {
          run(projectId: string, documentId: string) {
            const before = docs.length;
            const next = docs.filter(
              (d) => !(d.projectId === projectId && d.documentId === documentId),
            );
            docs.length = 0;
            docs.push(...next);
            return { changes: before - docs.length };
          },
        };
      }

      if (sql === "SELECT type, status FROM documents WHERE document_id = ?") {
        return {
          get(documentId: string) {
            const row = docs.find((d) => d.documentId === documentId);
            return row ? { type: row.type, status: row.status } : undefined;
          },
        };
      }

      if (
        sql ===
        "SELECT content_json as contentJson, content_text as contentText, content_md as contentMd, content_hash as contentHash FROM documents WHERE project_id = ? AND document_id = ?"
      ) {
        return {
          get(projectId: string, documentId: string) {
            const row = docs.find(
              (d) => d.projectId === projectId && d.documentId === documentId,
            );
            if (!row) {
              return undefined;
            }
            return {
              contentJson: row.contentJson,
              contentText: row.contentText,
              contentMd: row.contentMd,
              contentHash: row.contentHash,
            };
          },
        };
      }

      if (
        sql ===
        "UPDATE documents SET status = ?, updated_at = ? WHERE project_id = ? AND document_id = ?"
      ) {
        return {
          run(
            status: DocumentStatus,
            updatedAt: number,
            projectId: string,
            documentId: string,
          ) {
            const row = docs.find(
              (d) => d.projectId === projectId && d.documentId === documentId,
            );
            if (!row) {
              return { changes: 0 };
            }
            row.status = status;
            row.updatedAt = updatedAt;
            return { changes: 1 };
          },
        };
      }

      if (
        sql.startsWith(
          "INSERT INTO document_versions (version_id, project_id, document_id, actor, reason, content_json, content_text, content_md, content_hash, diff_format, diff_text, created_at)",
        )
      ) {
        return {
          run() {
            return { changes: 1 };
          },
        };
      }

      throw new Error(`Unexpected SQL in fake DB: ${sql}`);
    },

    transaction<T>(fn: () => T): () => T {
      return () => fn();
    },
  } as unknown as Database.Database;

  return db;
}

/**
 * S3/S4: create should persist requested document type and default draft status.
 */
{
  const db = createFakeDb();
  const svc = createDocumentService({ db, logger: createNoopLogger() });
  const createWithType = svc.create as unknown as (args: {
    projectId: string;
    title?: string;
    type?: DocumentType;
  }) => { ok: boolean; data: { documentId: string } };

  const created = createWithType({ projectId: "proj-1", type: "note" });
  assert.equal(created.ok, true);
  if (!created.ok) {
    throw new Error("create failed");
  }

  const row = db
    .prepare<
      [string],
      { type: string; status: string }
    >("SELECT type, status FROM documents WHERE document_id = ?")
    .get(created.data.documentId);

  assert.equal(row?.type, "note");
  assert.equal(row?.status, "draft");
}

/**
 * S2: deleting the last document should auto-create a new blank chapter document.
 */
{
  const db = createFakeDb();
  const svc = createDocumentService({ db, logger: createNoopLogger() });

  const created = svc.create({ projectId: "proj-1" });
  if (!created.ok) {
    throw new Error(`create failed: ${created.error.code}`);
  }
  const setCurrent = svc.setCurrent({
    projectId: "proj-1",
    documentId: created.data.documentId,
  });
  if (!setCurrent.ok) {
    throw new Error(`set current failed: ${setCurrent.error.code}`);
  }

  const deleted = svc.delete({
    projectId: "proj-1",
    documentId: created.data.documentId,
  });
  assert.equal(deleted.ok, true);

  const listed = svc.list({ projectId: "proj-1" });
  if (!listed.ok) {
    throw new Error(`list failed: ${listed.error.code}`);
  }
  assert.equal(
    listed.data.items.length,
    1,
    "project should keep one document after deleting the last one",
  );
}

/**
 * S5: status update API must exist and support draft/final transitions.
 */
{
  const db = createFakeDb();
  const svc = createDocumentService({ db, logger: createNoopLogger() });
  const created = svc.create({ projectId: "proj-1" });
  if (!created.ok) {
    throw new Error(`create failed: ${created.error.code}`);
  }

  const updater = (
    svc as unknown as {
      updateStatus?: (args: {
        projectId: string;
        documentId: string;
        status: "draft" | "final";
      }) => { ok: boolean };
    }
  ).updateStatus;

  assert.equal(typeof updater, "function", "updateStatus API must exist");
  if (!updater) {
    throw new Error("missing updateStatus");
  }

  const updated = updater({
    projectId: "proj-1",
    documentId: created.data.documentId,
    status: "final",
  });
  assert.equal(updated.ok, true);
}

console.log("documentService.lifecycle.test.ts: all assertions passed");
