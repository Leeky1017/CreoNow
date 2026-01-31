import { createHash, randomUUID } from "node:crypto";

import type Database from "better-sqlite3";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../../logging/logger";
import { deriveContent } from "./derive";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type DocumentListItem = {
  documentId: string;
  title: string;
  updatedAt: number;
};

export type DocumentRead = {
  documentId: string;
  projectId: string;
  title: string;
  contentJson: string;
  contentText: string;
  contentMd: string;
  contentHash: string;
  updatedAt: number;
};

export type VersionListItem = {
  versionId: string;
  actor: "user" | "auto" | "ai";
  reason: string;
  contentHash: string;
  createdAt: number;
};

export type DocumentService = {
  create: (args: { projectId: string; title?: string }) => ServiceResult<{
    documentId: string;
  }>;
  list: (args: { projectId: string }) => ServiceResult<{
    items: DocumentListItem[];
  }>;
  read: (args: {
    projectId: string;
    documentId: string;
  }) => ServiceResult<DocumentRead>;
  write: (args: {
    projectId: string;
    documentId: string;
    contentJson: unknown;
    actor: "user" | "auto";
    reason: "manual-save" | "autosave";
  }) => ServiceResult<{
    updatedAt: number;
    contentHash: string;
  }>;
  delete: (args: {
    projectId: string;
    documentId: string;
  }) => ServiceResult<{ deleted: true }>;

  listVersions: (args: { documentId: string }) => ServiceResult<{
    items: VersionListItem[];
  }>;
  restoreVersion: (args: {
    documentId: string;
    versionId: string;
  }) => ServiceResult<{ restored: true }>;
};

const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
} as const;

function nowTs(): number {
  return Date.now();
}

/**
 * Build a stable IPC error object.
 *
 * Why: services must return deterministic error codes/messages for IPC tests.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

function hashJson(json: string): string {
  return createHash("sha256").update(json, "utf8").digest("hex");
}

function serializeJson(value: unknown): ServiceResult<string> {
  try {
    return { ok: true, data: JSON.stringify(value) };
  } catch (error) {
    return ipcError(
      "ENCODING_FAILED",
      "Failed to encode document JSON",
      error instanceof Error ? { message: error.message } : { error },
    );
  }
}

type DocumentRow = {
  documentId: string;
  projectId: string;
  title: string;
  contentJson: string;
  contentText: string;
  contentMd: string;
  contentHash: string;
  updatedAt: number;
};

type VersionRow = {
  contentHash: string;
};

type VersionRestoreRow = {
  projectId: string;
  documentId: string;
  contentJson: string;
  contentText: string;
  contentMd: string;
  contentHash: string;
};

/**
 * Create a document service backed by SQLite (SSOT).
 */
export function createDocumentService(args: {
  db: Database.Database;
  logger: Logger;
}): DocumentService {
  return {
    create: ({ projectId, title }) => {
      const safeTitle = title?.trim().length ? title.trim() : "Untitled";

      const derived = deriveContent({ contentJson: EMPTY_DOC });
      if (!derived.ok) {
        return derived;
      }
      const encoded = serializeJson(EMPTY_DOC);
      if (!encoded.ok) {
        return encoded;
      }
      const contentHash = hashJson(encoded.data);

      const documentId = randomUUID();
      const ts = nowTs();

      try {
        args.db
          .prepare(
            "INSERT INTO documents (document_id, project_id, title, content_json, content_text, content_md, content_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            documentId,
            projectId,
            safeTitle,
            encoded.data,
            derived.data.contentText,
            derived.data.contentMd,
            contentHash,
            ts,
            ts,
          );

        args.logger.info("document_created", {
          project_id: projectId,
          document_id: documentId,
        });

        return { ok: true, data: { documentId } };
      } catch (error) {
        args.logger.error("document_create_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to create document");
      }
    },

    list: ({ projectId }) => {
      try {
        const rows = args.db
          .prepare<
            [string],
            DocumentListItem
          >("SELECT document_id as documentId, title, updated_at as updatedAt FROM documents WHERE project_id = ? ORDER BY updated_at DESC, document_id ASC")
          .all(projectId);
        return { ok: true, data: { items: rows } };
      } catch (error) {
        args.logger.error("document_list_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to list documents");
      }
    },

    read: ({ projectId, documentId }) => {
      try {
        const row = args.db
          .prepare<
            [string, string],
            DocumentRow
          >("SELECT document_id as documentId, project_id as projectId, title, content_json as contentJson, content_text as contentText, content_md as contentMd, content_hash as contentHash, updated_at as updatedAt FROM documents WHERE project_id = ? AND document_id = ?")
          .get(projectId, documentId);
        if (!row) {
          return ipcError("NOT_FOUND", "Document not found");
        }

        return { ok: true, data: row };
      } catch (error) {
        args.logger.error("document_read_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to read document");
      }
    },

    write: ({ projectId, documentId, contentJson, actor, reason }) => {
      const derived = deriveContent({ contentJson });
      if (!derived.ok) {
        return derived;
      }

      const encoded = serializeJson(contentJson);
      if (!encoded.ok) {
        return encoded;
      }
      const contentHash = hashJson(encoded.data);
      const ts = nowTs();

      args.logger.info("doc_save_started", { document_id: documentId });

      try {
        args.db.transaction(() => {
          const exists = args.db
            .prepare<
              [string, string],
              { documentId: string }
            >("SELECT document_id as documentId FROM documents WHERE project_id = ? AND document_id = ?")
            .get(projectId, documentId);
          if (!exists) {
            throw new Error("NOT_FOUND");
          }

          args.db
            .prepare(
              "UPDATE documents SET content_json = ?, content_text = ?, content_md = ?, content_hash = ?, updated_at = ? WHERE project_id = ? AND document_id = ?",
            )
            .run(
              encoded.data,
              derived.data.contentText,
              derived.data.contentMd,
              contentHash,
              ts,
              projectId,
              documentId,
            );

          const last = args.db
            .prepare<
              [string],
              VersionRow
            >("SELECT content_hash as contentHash FROM document_versions WHERE document_id = ? ORDER BY created_at DESC, version_id ASC LIMIT 1")
            .get(documentId);
          const lastHash = last?.contentHash ?? null;
          const shouldInsertVersion =
            actor === "user" ? true : lastHash !== contentHash;

          if (shouldInsertVersion) {
            const versionId = randomUUID();
            args.db
              .prepare(
                "INSERT INTO document_versions (version_id, project_id, document_id, actor, reason, content_json, content_text, content_md, content_hash, diff_format, diff_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              )
              .run(
                versionId,
                projectId,
                documentId,
                actor,
                reason,
                encoded.data,
                derived.data.contentText,
                derived.data.contentMd,
                contentHash,
                "",
                "",
                ts,
              );

            args.logger.info("version_created", {
              version_id: versionId,
              actor,
              reason,
              document_id: documentId,
              content_hash: contentHash,
            });
          }
        })();
      } catch (error) {
        const code =
          error instanceof Error && error.message === "NOT_FOUND"
            ? ("NOT_FOUND" as const)
            : ("DB_ERROR" as const);
        args.logger.error("doc_save_failed", {
          code,
          message: error instanceof Error ? error.message : String(error),
          document_id: documentId,
        });
        return ipcError(
          code,
          code === "NOT_FOUND"
            ? "Document not found"
            : "Failed to save document",
        );
      }

      args.logger.info("doc_save_succeeded", {
        document_id: documentId,
        content_hash: contentHash,
      });
      return { ok: true, data: { updatedAt: ts, contentHash } };
    },

    delete: ({ projectId, documentId }) => {
      try {
        const res = args.db
          .prepare<
            [string, string]
          >("DELETE FROM documents WHERE project_id = ? AND document_id = ?")
          .run(projectId, documentId);
        if (res.changes === 0) {
          return ipcError("NOT_FOUND", "Document not found");
        }

        args.logger.info("document_deleted", { document_id: documentId });
        return { ok: true, data: { deleted: true } };
      } catch (error) {
        args.logger.error("document_delete_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to delete document");
      }
    },

    listVersions: ({ documentId }) => {
      try {
        const rows = args.db
          .prepare<
            [string],
            VersionListItem
          >("SELECT version_id as versionId, actor, reason, content_hash as contentHash, created_at as createdAt FROM document_versions WHERE document_id = ? ORDER BY created_at DESC, version_id ASC")
          .all(documentId);
        return { ok: true, data: { items: rows } };
      } catch (error) {
        args.logger.error("version_list_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to list versions");
      }
    },

    restoreVersion: ({ documentId, versionId }) => {
      const ts = nowTs();

      try {
        args.db.transaction(() => {
          const row = args.db
            .prepare<
              [string, string],
              VersionRestoreRow
            >("SELECT project_id as projectId, document_id as documentId, content_json as contentJson, content_text as contentText, content_md as contentMd, content_hash as contentHash FROM document_versions WHERE document_id = ? AND version_id = ?")
            .get(documentId, versionId);
          if (!row) {
            throw new Error("NOT_FOUND");
          }

          const updated = args.db
            .prepare<
              [string, string, string, string, number, string]
            >("UPDATE documents SET content_json = ?, content_text = ?, content_md = ?, content_hash = ?, updated_at = ? WHERE document_id = ?")
            .run(
              row.contentJson,
              row.contentText,
              row.contentMd,
              row.contentHash,
              ts,
              row.documentId,
            );
          if (updated.changes === 0) {
            throw new Error("NOT_FOUND");
          }

          const newVersionId = randomUUID();
          args.db
            .prepare(
              "INSERT INTO document_versions (version_id, project_id, document_id, actor, reason, content_json, content_text, content_md, content_hash, diff_format, diff_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .run(
              newVersionId,
              row.projectId,
              row.documentId,
              "user",
              "restore",
              row.contentJson,
              row.contentText,
              row.contentMd,
              row.contentHash,
              "",
              "",
              ts,
            );

          args.logger.info("version_restored", {
            document_id: row.documentId,
            from_version_id: versionId,
            new_version_id: newVersionId,
          });
        })();

        return { ok: true, data: { restored: true } };
      } catch (error) {
        const code =
          error instanceof Error && error.message === "NOT_FOUND"
            ? ("NOT_FOUND" as const)
            : ("DB_ERROR" as const);
        args.logger.error("version_restore_failed", {
          code,
          message: error instanceof Error ? error.message : String(error),
          document_id: documentId,
          version_id: versionId,
        });
        return ipcError(
          code,
          code === "NOT_FOUND"
            ? "Version not found"
            : "Failed to restore version",
        );
      }
    },
  };
}
