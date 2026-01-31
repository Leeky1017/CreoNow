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
  rename: (args: {
    projectId: string;
    documentId: string;
    title: string;
  }) => ServiceResult<{ updated: true }>;
  write: (args: {
    projectId: string;
    documentId: string;
    contentJson: unknown;
    actor: "user" | "auto" | "ai";
    reason: "manual-save" | "autosave" | `ai-apply:${string}`;
  }) => ServiceResult<{
    updatedAt: number;
    contentHash: string;
  }>;
  delete: (args: {
    projectId: string;
    documentId: string;
  }) => ServiceResult<{ deleted: true }>;

  getCurrent: (args: { projectId: string }) => ServiceResult<{
    documentId: string;
  }>;
  setCurrent: (args: {
    projectId: string;
    documentId: string;
  }) => ServiceResult<{ documentId: string }>;

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

const SETTINGS_SCOPE_PREFIX = "project:" as const;
const CURRENT_DOCUMENT_ID_KEY = "creonow.document.currentId" as const;
const MAX_TITLE_LENGTH = 200;
const AI_APPLY_REASON_PREFIX = "ai-apply:" as const;

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

function parseAiApplyRunId(reason: string): string | null {
  if (!reason.startsWith(AI_APPLY_REASON_PREFIX)) {
    return null;
  }
  const runId = reason.slice(AI_APPLY_REASON_PREFIX.length).trim();
  return runId.length > 0 ? runId : null;
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

type SettingsRow = {
  valueJson: string;
};

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
 * Compute a project-scoped settings namespace.
 *
 * Why: current document must never leak across projects.
 */
function getProjectSettingsScope(projectId: string): string {
  return `${SETTINGS_SCOPE_PREFIX}${projectId}`;
}

/**
 * Read the current documentId for a project from settings.
 *
 * Why: current document must persist across restarts for a stable workbench entry.
 */
function readCurrentDocumentId(
  db: Database.Database,
  projectId: string,
): ServiceResult<string> {
  const scope = getProjectSettingsScope(projectId);

  try {
    const row = db
      .prepare<
        [string, string],
        SettingsRow
      >("SELECT value_json as valueJson FROM settings WHERE scope = ? AND key = ?")
      .get(scope, CURRENT_DOCUMENT_ID_KEY);
    if (!row) {
      return ipcError("NOT_FOUND", "No current document");
    }
    const parsed: unknown = JSON.parse(row.valueJson);
    if (typeof parsed !== "string" || parsed.trim().length === 0) {
      return ipcError("DB_ERROR", "Invalid current document setting");
    }
    return { ok: true, data: parsed };
  } catch (error) {
    return ipcError(
      "DB_ERROR",
      "Failed to read current document setting",
      error instanceof Error ? { message: error.message } : { error },
    );
  }
}

/**
 * Persist the current documentId for a project.
 *
 * Why: renderer needs a stable restore point across restarts.
 */
function writeCurrentDocumentId(
  db: Database.Database,
  projectId: string,
  documentId: string,
): ServiceResult<true> {
  const scope = getProjectSettingsScope(projectId);

  try {
    const ts = nowTs();
    db.prepare(
      "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
    ).run(scope, CURRENT_DOCUMENT_ID_KEY, JSON.stringify(documentId), ts);
    return { ok: true, data: true };
  } catch (error) {
    return ipcError(
      "DB_ERROR",
      "Failed to persist current document",
      error instanceof Error ? { message: error.message } : { error },
    );
  }
}

/**
 * Clear the current documentId for a project.
 *
 * Why: deleting the last document must leave a deterministic "no current document" state.
 */
function clearCurrentDocumentId(
  db: Database.Database,
  projectId: string,
): ServiceResult<true> {
  const scope = getProjectSettingsScope(projectId);

  try {
    db.prepare("DELETE FROM settings WHERE scope = ? AND key = ?").run(
      scope,
      CURRENT_DOCUMENT_ID_KEY,
    );
    return { ok: true, data: true };
  } catch (error) {
    return ipcError(
      "DB_ERROR",
      "Failed to clear current document",
      error instanceof Error ? { message: error.message } : { error },
    );
  }
}

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

    rename: ({ projectId, documentId, title }) => {
      if (projectId.trim().length === 0 || documentId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId/documentId is required");
      }

      const trimmedTitle = title.trim();
      if (trimmedTitle.length === 0) {
        return ipcError("INVALID_ARGUMENT", "title is required");
      }
      if (trimmedTitle.length > MAX_TITLE_LENGTH) {
        return ipcError(
          "INVALID_ARGUMENT",
          `title too long (max ${MAX_TITLE_LENGTH})`,
        );
      }

      const ts = nowTs();
      try {
        const res = args.db
          .prepare<
            [string, number, string, string]
          >("UPDATE documents SET title = ?, updated_at = ? WHERE project_id = ? AND document_id = ?")
          .run(trimmedTitle, ts, projectId, documentId);
        if (res.changes === 0) {
          return ipcError("NOT_FOUND", "Document not found");
        }

        args.logger.info("document_renamed", { document_id: documentId });
        return { ok: true, data: { updated: true } };
      } catch (error) {
        args.logger.error("document_rename_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to rename document");
      }
    },

    write: ({ projectId, documentId, contentJson, actor, reason }) => {
      const aiRunId = actor === "ai" ? parseAiApplyRunId(reason) : null;
      if (actor === "ai" && !aiRunId) {
        return ipcError(
          "INVALID_ARGUMENT",
          "AI apply reason must be ai-apply:<runId>",
        );
      }

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

      if (aiRunId) {
        args.logger.info("ai_apply_started", {
          runId: aiRunId,
          document_id: documentId,
        });
      }
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
            actor === "auto" ? lastHash !== contentHash : true;

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
      if (aiRunId) {
        args.logger.info("ai_apply_succeeded", {
          runId: aiRunId,
          document_id: documentId,
          content_hash: contentHash,
        });
      }
      return { ok: true, data: { updatedAt: ts, contentHash } };
    },

    delete: ({ projectId, documentId }) => {
      if (projectId.trim().length === 0 || documentId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId/documentId is required");
      }

      const scope = getProjectSettingsScope(projectId);
      const expectedValueJson = JSON.stringify(documentId);
      const ts = nowTs();

      let switchedTo: string | null = null;
      try {
        args.db.transaction(() => {
          const currentRow = args.db
            .prepare<
              [string, string],
              SettingsRow
            >("SELECT value_json as valueJson FROM settings WHERE scope = ? AND key = ?")
            .get(scope, CURRENT_DOCUMENT_ID_KEY);
          const isDeletingCurrent =
            currentRow?.valueJson === expectedValueJson;

          const res = args.db
            .prepare<
              [string, string]
            >("DELETE FROM documents WHERE project_id = ? AND document_id = ?")
            .run(projectId, documentId);
          if (res.changes === 0) {
            throw new Error("NOT_FOUND");
          }

          if (!isDeletingCurrent) {
            return;
          }

          const next = args.db
            .prepare<
              [string],
              { documentId: string }
            >("SELECT document_id as documentId FROM documents WHERE project_id = ? ORDER BY updated_at DESC, document_id ASC LIMIT 1")
            .get(projectId);

          if (next) {
            switchedTo = next.documentId;
            args.db
              .prepare(
                "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
              )
              .run(
                scope,
                CURRENT_DOCUMENT_ID_KEY,
                JSON.stringify(next.documentId),
                ts,
              );
          } else {
            args.db
              .prepare("DELETE FROM settings WHERE scope = ? AND key = ?")
              .run(scope, CURRENT_DOCUMENT_ID_KEY);
          }
        })();

        args.logger.info("document_deleted", { document_id: documentId });
        if (switchedTo) {
          args.logger.info("document_set_current", {
            project_id: projectId,
            document_id: switchedTo,
          });
        }
        return { ok: true, data: { deleted: true } };
      } catch (error) {
        const code =
          error instanceof Error && error.message === "NOT_FOUND"
            ? ("NOT_FOUND" as const)
            : ("DB_ERROR" as const);
        args.logger.error("document_delete_failed", {
          code,
          message: error instanceof Error ? error.message : String(error),
          document_id: documentId,
        });
        return ipcError(
          code,
          code === "NOT_FOUND"
            ? "Document not found"
            : "Failed to delete document",
        );
      }
    },

    getCurrent: ({ projectId }) => {
      if (projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }

      const current = readCurrentDocumentId(args.db, projectId);
      if (!current.ok) {
        return current;
      }

      try {
        const exists = args.db
          .prepare<
            [string, string],
            { documentId: string }
          >("SELECT document_id as documentId FROM documents WHERE project_id = ? AND document_id = ?")
          .get(projectId, current.data);
        if (!exists) {
          void clearCurrentDocumentId(args.db, projectId);
          return ipcError("NOT_FOUND", "Current document not found");
        }

        return { ok: true, data: { documentId: current.data } };
      } catch (error) {
        args.logger.error("document_get_current_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to resolve current document");
      }
    },

    setCurrent: ({ projectId, documentId }) => {
      if (projectId.trim().length === 0 || documentId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId/documentId is required");
      }

      try {
        const exists = args.db
          .prepare<
            [string, string],
            { documentId: string }
          >("SELECT document_id as documentId FROM documents WHERE project_id = ? AND document_id = ?")
          .get(projectId, documentId);
        if (!exists) {
          return ipcError("NOT_FOUND", "Document not found");
        }
      } catch (error) {
        args.logger.error("document_set_current_lookup_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to load document");
      }

      const persisted = writeCurrentDocumentId(args.db, projectId, documentId);
      if (!persisted.ok) {
        return persisted;
      }

      args.logger.info("document_set_current", {
        project_id: projectId,
        document_id: documentId,
      });
      return { ok: true, data: { documentId } };
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
