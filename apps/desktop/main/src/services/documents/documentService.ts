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

export type DocumentType =
  | "chapter"
  | "note"
  | "setting"
  | "timeline"
  | "character";

export type DocumentStatus = "draft" | "final";

export type DocumentListItem = {
  documentId: string;
  type: DocumentType;
  title: string;
  status: DocumentStatus;
  sortOrder: number;
  parentId?: string;
  updatedAt: number;
};

export type DocumentRead = {
  documentId: string;
  projectId: string;
  type: DocumentType;
  title: string;
  status: DocumentStatus;
  sortOrder: number;
  parentId?: string;
  contentJson: string;
  contentText: string;
  contentMd: string;
  contentHash: string;
  createdAt: number;
  updatedAt: number;
};

export type VersionListItem = {
  versionId: string;
  actor: "user" | "auto" | "ai";
  reason: string;
  contentHash: string;
  createdAt: number;
};

export type VersionRead = {
  documentId: string;
  projectId: string;
  versionId: string;
  actor: "user" | "auto" | "ai";
  reason: string;
  contentJson: string;
  contentText: string;
  contentMd: string;
  contentHash: string;
  createdAt: number;
};

export type DocumentService = {
  create: (args: {
    projectId: string;
    title?: string;
    type?: DocumentType;
  }) => ServiceResult<{
    documentId: string;
  }>;
  list: (args: { projectId: string }) => ServiceResult<{
    items: DocumentListItem[];
  }>;
  read: (args: {
    projectId: string;
    documentId: string;
  }) => ServiceResult<DocumentRead>;
  update: (args: {
    projectId: string;
    documentId: string;
    title?: string;
    type?: DocumentType;
    status?: DocumentStatus;
    sortOrder?: number;
    parentId?: string;
  }) => ServiceResult<{ updated: true }>;
  save: (args: {
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
  reorder: (args: {
    projectId: string;
    orderedDocumentIds: string[];
  }) => ServiceResult<{ updated: true }>;
  updateStatus: (args: {
    projectId: string;
    documentId: string;
    status: DocumentStatus;
  }) => ServiceResult<{ updated: true; status: DocumentStatus }>;

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
  readVersion: (args: {
    documentId: string;
    versionId: string;
  }) => ServiceResult<VersionRead>;
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

const DOCUMENT_TYPE_SET = new Set<DocumentType>([
  "chapter",
  "note",
  "setting",
  "timeline",
  "character",
]);

const DOCUMENT_STATUS_SET = new Set<DocumentStatus>(["draft", "final"]);

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

/**
 * Resolve a valid document type with a deterministic default.
 *
 * Why: create/update operations must reject unsupported types explicitly.
 */
function normalizeDocumentType(
  type: string | undefined,
): ServiceResult<DocumentType> {
  if (!type) {
    return { ok: true, data: "chapter" };
  }
  if (DOCUMENT_TYPE_SET.has(type as DocumentType)) {
    return { ok: true, data: type as DocumentType };
  }
  return ipcError("INVALID_ARGUMENT", "Unsupported document type");
}

/**
 * Resolve a valid document status value.
 *
 * Why: status transitions must be explicit and deterministic for UI guards.
 */
function normalizeDocumentStatus(
  status: string | undefined,
): ServiceResult<DocumentStatus> {
  if (!status) {
    return ipcError("INVALID_ARGUMENT", "status is required");
  }
  if (DOCUMENT_STATUS_SET.has(status as DocumentStatus)) {
    return { ok: true, data: status as DocumentStatus };
  }
  return ipcError("INVALID_ARGUMENT", "Unsupported document status");
}

/**
 * Produce default untitled title by document type.
 *
 * Why: different creation entries must render meaningful default titles.
 */
function defaultTitleByType(type: DocumentType): string {
  switch (type) {
    case "chapter":
      return "Untitled Chapter";
    case "note":
      return "Untitled Note";
    case "setting":
      return "Untitled Setting";
    case "timeline":
      return "Untitled Timeline";
    case "character":
      return "Untitled Character";
    default:
      return "Untitled";
  }
}

function normalizeParentId(
  parentId: string | null | undefined,
): string | undefined {
  return typeof parentId === "string" ? parentId : undefined;
}

type SettingsRow = {
  valueJson: string;
};

type DocumentRow = {
  documentId: string;
  projectId: string;
  type: DocumentType;
  title: string;
  status: DocumentStatus;
  sortOrder: number;
  parentId: string | null;
  contentJson: string;
  contentText: string;
  contentMd: string;
  contentHash: string;
  createdAt: number;
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

type DocumentContentRow = {
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
    create: ({ projectId, title, type }) => {
      const normalizedType = normalizeDocumentType(type);
      if (!normalizedType.ok) {
        return normalizedType;
      }
      const safeTitle = title?.trim().length
        ? title.trim()
        : defaultTitleByType(normalizedType.data);

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
        const maxSortRow = args.db
          .prepare<
            [string],
            { maxSortOrder: number | null }
          >("SELECT MAX(sort_order) as maxSortOrder FROM documents WHERE project_id = ?")
          .get(projectId);
        const nextSortOrder = (maxSortRow?.maxSortOrder ?? -1) + 1;

        args.db
          .prepare(
            "INSERT INTO documents (document_id, project_id, type, title, content_json, content_text, content_md, content_hash, status, sort_order, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            documentId,
            projectId,
            normalizedType.data,
            safeTitle,
            encoded.data,
            derived.data.contentText,
            derived.data.contentMd,
            contentHash,
            "draft",
            nextSortOrder,
            null,
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
            DocumentListItem & { parentId: string | null }
          >("SELECT document_id as documentId, type, title, status, sort_order as sortOrder, parent_id as parentId, updated_at as updatedAt FROM documents WHERE project_id = ? ORDER BY sort_order ASC, updated_at DESC, document_id ASC")
          .all(projectId);
        return {
          ok: true,
          data: {
            items: rows.map((row) => ({
              ...row,
              parentId: normalizeParentId(row.parentId),
            })),
          },
        };
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
          >("SELECT document_id as documentId, project_id as projectId, type, title, status, sort_order as sortOrder, parent_id as parentId, content_json as contentJson, content_text as contentText, content_md as contentMd, content_hash as contentHash, created_at as createdAt, updated_at as updatedAt FROM documents WHERE project_id = ? AND document_id = ?")
          .get(projectId, documentId);
        if (!row) {
          return ipcError("NOT_FOUND", "Document not found");
        }

        return {
          ok: true,
          data: {
            ...row,
            parentId: normalizeParentId(row.parentId),
          },
        };
      } catch (error) {
        args.logger.error("document_read_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to read document");
      }
    },

    update: ({
      projectId,
      documentId,
      title,
      type,
      status,
      sortOrder,
      parentId,
    }) => {
      if (projectId.trim().length === 0 || documentId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId/documentId is required");
      }

      const setParts: string[] = [];
      const params: Array<string | number | null> = [];

      if (title !== undefined) {
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
        setParts.push("title = ?");
        params.push(trimmedTitle);
      }

      if (type !== undefined) {
        const normalized = normalizeDocumentType(type);
        if (!normalized.ok) {
          return normalized;
        }
        setParts.push("type = ?");
        params.push(normalized.data);
      }

      if (status !== undefined) {
        const normalized = normalizeDocumentStatus(status);
        if (!normalized.ok) {
          return normalized;
        }
        setParts.push("status = ?");
        params.push(normalized.data);
      }

      if (sortOrder !== undefined) {
        if (!Number.isInteger(sortOrder) || sortOrder < 0) {
          return ipcError(
            "INVALID_ARGUMENT",
            "sortOrder must be a non-negative integer",
          );
        }
        setParts.push("sort_order = ?");
        params.push(sortOrder);
      }

      if (parentId !== undefined) {
        if (parentId.trim().length === 0) {
          return ipcError("INVALID_ARGUMENT", "parentId must be non-empty");
        }
        setParts.push("parent_id = ?");
        params.push(parentId);
      }

      if (setParts.length === 0) {
        return ipcError(
          "INVALID_ARGUMENT",
          "at least one mutable field is required",
        );
      }

      const ts = nowTs();
      setParts.push("updated_at = ?");
      params.push(ts);
      params.push(projectId);
      params.push(documentId);
      try {
        const stmt = args.db.prepare(
          `UPDATE documents SET ${setParts.join(", ")} WHERE project_id = ? AND document_id = ?`,
        );
        const res = stmt.run(...params);
        if (res.changes === 0) {
          return ipcError("NOT_FOUND", "Document not found");
        }

        args.logger.info("document_updated", { document_id: documentId });
        return { ok: true, data: { updated: true } };
      } catch (error) {
        args.logger.error("document_update_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to update document");
      }
    },

    save: ({ projectId, documentId, contentJson, actor, reason }) => {
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
          const isDeletingCurrent = currentRow?.valueJson === expectedValueJson;

          const res = args.db
            .prepare<
              [string, string]
            >("DELETE FROM documents WHERE project_id = ? AND document_id = ?")
            .run(projectId, documentId);
          if (res.changes === 0) {
            throw new Error("NOT_FOUND");
          }

          const next = args.db
            .prepare<
              [string],
              { documentId: string }
            >("SELECT document_id as documentId FROM documents WHERE project_id = ? ORDER BY updated_at DESC, document_id ASC LIMIT 1")
            .get(projectId);

          if (next) {
            if (isDeletingCurrent) {
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
            }
            return;
          }

          const replacementId = randomUUID();
          const derived = deriveContent({ contentJson: EMPTY_DOC });
          if (!derived.ok) {
            throw new Error("DERIVE_FAILED");
          }
          const encoded = serializeJson(EMPTY_DOC);
          if (!encoded.ok) {
            throw new Error("ENCODING_FAILED");
          }
          const contentHash = hashJson(encoded.data);

          args.db
            .prepare(
              "INSERT INTO documents (document_id, project_id, type, title, content_json, content_text, content_md, content_hash, status, sort_order, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .run(
              replacementId,
              projectId,
              "chapter",
              defaultTitleByType("chapter"),
              encoded.data,
              derived.data.contentText,
              derived.data.contentMd,
              contentHash,
              "draft",
              0,
              null,
              ts,
              ts,
            );

          switchedTo = replacementId;
          args.db
            .prepare(
              "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
            )
            .run(
              scope,
              CURRENT_DOCUMENT_ID_KEY,
              JSON.stringify(replacementId),
              ts,
            );
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

    reorder: ({ projectId, orderedDocumentIds }) => {
      if (projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }
      if (orderedDocumentIds.length === 0) {
        return ipcError("INVALID_ARGUMENT", "orderedDocumentIds is required");
      }

      const unique = new Set(orderedDocumentIds);
      if (unique.size !== orderedDocumentIds.length) {
        return ipcError(
          "INVALID_ARGUMENT",
          "orderedDocumentIds must not contain duplicates",
        );
      }

      const ts = nowTs();
      try {
        args.db.transaction(() => {
          orderedDocumentIds.forEach((docId, index) => {
            const updated = args.db
              .prepare<
                [number, number, string, string]
              >("UPDATE documents SET sort_order = ?, updated_at = ? WHERE project_id = ? AND document_id = ?")
              .run(index, ts, projectId, docId);
            if (updated.changes === 0) {
              throw new Error("NOT_FOUND");
            }
          });
        })();
        return { ok: true, data: { updated: true } };
      } catch (error) {
        const code =
          error instanceof Error && error.message === "NOT_FOUND"
            ? ("NOT_FOUND" as const)
            : ("DB_ERROR" as const);
        return ipcError(
          code,
          code === "NOT_FOUND"
            ? "Document not found"
            : "Failed to reorder documents",
        );
      }
    },

    updateStatus: ({ projectId, documentId, status }) => {
      if (projectId.trim().length === 0 || documentId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId/documentId is required");
      }
      const normalized = normalizeDocumentStatus(status);
      if (!normalized.ok) {
        return normalized;
      }

      const ts = nowTs();
      try {
        args.db.transaction(() => {
          const current = args.db
            .prepare<
              [string, string],
              DocumentContentRow
            >("SELECT content_json as contentJson, content_text as contentText, content_md as contentMd, content_hash as contentHash FROM documents WHERE project_id = ? AND document_id = ?")
            .get(projectId, documentId);
          if (!current) {
            throw new Error("NOT_FOUND");
          }

          const updated = args.db
            .prepare<
              [string, number, string, string]
            >("UPDATE documents SET status = ?, updated_at = ? WHERE project_id = ? AND document_id = ?")
            .run(normalized.data, ts, projectId, documentId);
          if (updated.changes === 0) {
            throw new Error("NOT_FOUND");
          }

          const versionId = randomUUID();
          args.db
            .prepare(
              "INSERT INTO document_versions (version_id, project_id, document_id, actor, reason, content_json, content_text, content_md, content_hash, diff_format, diff_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .run(
              versionId,
              projectId,
              documentId,
              "user",
              `status:${normalized.data}`,
              current.contentJson,
              current.contentText,
              current.contentMd,
              current.contentHash,
              "",
              "",
              ts,
            );
        })();

        return { ok: true, data: { updated: true, status: normalized.data } };
      } catch (error) {
        const code =
          error instanceof Error && error.message === "NOT_FOUND"
            ? ("NOT_FOUND" as const)
            : ("DB_ERROR" as const);
        return ipcError(
          code,
          code === "NOT_FOUND"
            ? "Document not found"
            : "Failed to update document status",
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

    readVersion: ({ documentId, versionId }) => {
      try {
        const row = args.db
          .prepare<
            [string, string],
            VersionRead
          >("SELECT document_id as documentId, project_id as projectId, version_id as versionId, actor, reason, content_json as contentJson, content_text as contentText, content_md as contentMd, content_hash as contentHash, created_at as createdAt FROM document_versions WHERE document_id = ? AND version_id = ?")
          .get(documentId, versionId);
        if (!row) {
          return ipcError("NOT_FOUND", "Version not found");
        }

        args.logger.info("version_read", {
          document_id: documentId,
          version_id: versionId,
        });
        return { ok: true, data: row };
      } catch (error) {
        args.logger.error("version_read_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
          document_id: documentId,
          version_id: versionId,
        });
        return ipcError("DB_ERROR", "Failed to read version");
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
