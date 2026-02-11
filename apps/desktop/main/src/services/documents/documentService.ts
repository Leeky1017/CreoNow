import { createHash, randomUUID } from "node:crypto";

import type Database from "better-sqlite3";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type {
  VersionDiffPayload,
  VersionDiffStats,
} from "../../../../../../packages/shared/types/version-diff";
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
export type VersionSnapshotActor = "user" | "auto" | "ai";
export type VersionSnapshotReason =
  | "manual-save"
  | "autosave"
  | "ai-accept"
  | "status-change";

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
  actor: VersionSnapshotActor;
  reason: string;
  contentHash: string;
  wordCount: number;
  createdAt: number;
};

export type VersionRead = {
  documentId: string;
  projectId: string;
  versionId: string;
  actor: VersionSnapshotActor;
  reason: string;
  contentJson: string;
  contentText: string;
  contentMd: string;
  contentHash: string;
  wordCount: number;
  createdAt: number;
};

type VersionDiffResult = VersionDiffPayload;

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
    actor: VersionSnapshotActor;
    reason: VersionSnapshotReason;
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
  diffVersions: (args: {
    documentId: string;
    baseVersionId: string;
    targetVersionId?: string;
  }) => ServiceResult<VersionDiffResult>;
  rollbackVersion: (args: {
    documentId: string;
    versionId: string;
  }) => ServiceResult<{
    restored: true;
    preRollbackVersionId: string;
    rollbackVersionId: string;
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
const AUTOSAVE_MERGE_WINDOW_MS = 5 * 60 * 1000;

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

function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/u).length;
}

function normalizeNewlines(text: string): string {
  return text.replaceAll("\r\n", "\n");
}

function splitLines(text: string): string[] {
  if (text.length === 0) {
    return [];
  }
  return normalizeNewlines(text).split("\n");
}

type DiffOp =
  | { kind: "equal"; text: string }
  | { kind: "remove"; text: string }
  | { kind: "add"; text: string };

type DiffHunk = {
  oldStart: number;
  newStart: number;
  oldLines: string[];
  newLines: string[];
};

function diffLines(oldLines: string[], newLines: string[]): DiffOp[] {
  const oldLen = oldLines.length;
  const newLen = newLines.length;
  const lcs: number[][] = Array.from({ length: oldLen + 1 }, () =>
    Array.from({ length: newLen + 1 }, () => 0),
  );

  for (let i = oldLen - 1; i >= 0; i -= 1) {
    for (let j = newLen - 1; j >= 0; j -= 1) {
      if (oldLines[i] === newLines[j]) {
        lcs[i][j] = lcs[i + 1][j + 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < oldLen && j < newLen) {
    if (oldLines[i] === newLines[j]) {
      ops.push({ kind: "equal", text: oldLines[i] });
      i += 1;
      j += 1;
      continue;
    }

    if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ kind: "remove", text: oldLines[i] });
      i += 1;
    } else {
      ops.push({ kind: "add", text: newLines[j] });
      j += 1;
    }
  }

  while (i < oldLen) {
    ops.push({ kind: "remove", text: oldLines[i] });
    i += 1;
  }
  while (j < newLen) {
    ops.push({ kind: "add", text: newLines[j] });
    j += 1;
  }

  return ops;
}

function computeDiffHunks(args: {
  oldText: string;
  newText: string;
}): DiffHunk[] {
  const oldLines = splitLines(args.oldText);
  const newLines = splitLines(args.newText);
  const ops = diffLines(oldLines, newLines);

  const hunks: DiffHunk[] = [];
  let oldLine = 1;
  let newLine = 1;
  let cursor = 0;

  while (cursor < ops.length) {
    const op = ops[cursor];
    if (op.kind === "equal") {
      oldLine += 1;
      newLine += 1;
      cursor += 1;
      continue;
    }

    const oldStart = oldLine;
    const newStart = newLine;
    const oldChunk: string[] = [];
    const newChunk: string[] = [];

    while (cursor < ops.length && ops[cursor]?.kind !== "equal") {
      const chunkOp = ops[cursor];
      if (chunkOp.kind === "remove") {
        oldChunk.push(chunkOp.text);
        oldLine += 1;
      } else if (chunkOp.kind === "add") {
        newChunk.push(chunkOp.text);
        newLine += 1;
      }
      cursor += 1;
    }

    hunks.push({
      oldStart,
      newStart,
      oldLines: oldChunk,
      newLines: newChunk,
    });
  }

  return hunks;
}

function buildUnifiedDiff(args: {
  oldText: string;
  newText: string;
  oldLabel: string;
  newLabel: string;
}): { diffText: string; stats: VersionDiffStats } {
  if (args.oldText === args.newText) {
    return {
      diffText: "",
      stats: { addedLines: 0, removedLines: 0, changedHunks: 0 },
    };
  }

  const hunks = computeDiffHunks({
    oldText: args.oldText,
    newText: args.newText,
  });

  const lines: string[] = [];
  lines.push(`--- ${args.oldLabel}`);
  lines.push(`+++ ${args.newLabel}`);

  let addedLines = 0;
  let removedLines = 0;
  for (const hunk of hunks) {
    lines.push(
      `@@ -${hunk.oldStart},${hunk.oldLines.length} +${hunk.newStart},${hunk.newLines.length} @@`,
    );
    for (const oldLine of hunk.oldLines) {
      lines.push(`-${oldLine}`);
      removedLines += 1;
    }
    for (const newLine of hunk.newLines) {
      lines.push(`+${newLine}`);
      addedLines += 1;
    }
  }

  return {
    diffText: `${lines.join("\n")}\n`,
    stats: {
      addedLines,
      removedLines,
      changedHunks: hunks.length,
    },
  };
}

function isReasonValidForActor(
  actor: VersionSnapshotActor,
  reason: VersionSnapshotReason,
): boolean {
  if (actor === "auto") {
    return reason === "autosave";
  }
  if (actor === "ai") {
    return reason === "ai-accept";
  }
  return reason === "manual-save" || reason === "status-change";
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

type LatestVersionRow = {
  versionId: string;
  reason: string;
  contentHash: string;
  createdAt: number;
};

type VersionListRow = {
  versionId: string;
  actor: VersionSnapshotActor;
  reason: string;
  contentHash: string;
  wordCount: number;
  createdAt: number;
};

type VersionRestoreRow = {
  projectId: string;
  documentId: string;
  contentJson: string;
  contentText: string;
  contentMd: string;
  contentHash: string;
};

type VersionDiffRow = {
  actor: VersionSnapshotActor;
  contentText: string;
};

type CurrentDocumentDiffRow = {
  contentText: string;
};

type DocumentContentRow = {
  contentJson: string;
  contentText: string;
  contentMd: string;
  contentHash: string;
};

type RollbackCurrentDocumentRow = {
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
  const rollbackToVersion = (params: {
    documentId: string;
    versionId: string;
  }): ServiceResult<{
    restored: true;
    preRollbackVersionId: string;
    rollbackVersionId: string;
  }> => {
    const ts = nowTs();
    let preRollbackVersionId = "";
    let rollbackVersionId = "";

    try {
      args.db.transaction(() => {
        const target = args.db
          .prepare<
            [string, string],
            VersionRestoreRow
          >("SELECT project_id as projectId, document_id as documentId, content_json as contentJson, content_text as contentText, content_md as contentMd, content_hash as contentHash FROM document_versions WHERE document_id = ? AND version_id = ?")
          .get(params.documentId, params.versionId);
        if (!target) {
          throw new Error("NOT_FOUND");
        }

        const current = args.db
          .prepare<
            [string],
            RollbackCurrentDocumentRow
          >("SELECT project_id as projectId, document_id as documentId, content_json as contentJson, content_text as contentText, content_md as contentMd, content_hash as contentHash FROM documents WHERE document_id = ?")
          .get(params.documentId);
        if (!current) {
          throw new Error("NOT_FOUND");
        }

        preRollbackVersionId = randomUUID();
        args.db
          .prepare(
            "INSERT INTO document_versions (version_id, project_id, document_id, actor, reason, content_json, content_text, content_md, content_hash, word_count, diff_format, diff_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            preRollbackVersionId,
            current.projectId,
            current.documentId,
            "user",
            "pre-rollback",
            current.contentJson,
            current.contentText,
            current.contentMd,
            current.contentHash,
            countWords(current.contentText),
            "",
            "",
            ts,
          );

        const updated = args.db
          .prepare<
            [string, string, string, string, number, string]
          >("UPDATE documents SET content_json = ?, content_text = ?, content_md = ?, content_hash = ?, updated_at = ? WHERE document_id = ?")
          .run(
            target.contentJson,
            target.contentText,
            target.contentMd,
            target.contentHash,
            ts,
            target.documentId,
          );
        if (updated.changes === 0) {
          throw new Error("NOT_FOUND");
        }

        rollbackVersionId = randomUUID();
        args.db
          .prepare(
            "INSERT INTO document_versions (version_id, project_id, document_id, actor, reason, content_json, content_text, content_md, content_hash, word_count, diff_format, diff_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            rollbackVersionId,
            target.projectId,
            target.documentId,
            "user",
            "rollback",
            target.contentJson,
            target.contentText,
            target.contentMd,
            target.contentHash,
            countWords(target.contentText),
            "",
            "",
            ts,
          );

        args.logger.info("version_rollback_applied", {
          document_id: target.documentId,
          from_version_id: params.versionId,
          pre_rollback_version_id: preRollbackVersionId,
          rollback_version_id: rollbackVersionId,
        });
      })();

      return {
        ok: true,
        data: { restored: true, preRollbackVersionId, rollbackVersionId },
      };
    } catch (error) {
      const code =
        error instanceof Error && error.message === "NOT_FOUND"
          ? ("NOT_FOUND" as const)
          : ("DB_ERROR" as const);
      args.logger.error("version_rollback_failed", {
        code,
        message: error instanceof Error ? error.message : String(error),
        document_id: params.documentId,
        version_id: params.versionId,
      });
      return ipcError(
        code,
        code === "NOT_FOUND"
          ? "Version not found"
          : "Failed to rollback version",
      );
    }
  };

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
      if (!isReasonValidForActor(actor, reason)) {
        return ipcError("INVALID_ARGUMENT", "actor/reason mismatch");
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
      const wordCount = countWords(derived.data.contentText);
      const ts = nowTs();

      if (actor === "ai") {
        args.logger.info("ai_apply_started", { document_id: documentId });
      }
      args.logger.info("doc_save_started", {
        document_id: documentId,
        actor,
        reason,
      });

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

          const latest = args.db
            .prepare<
              [string],
              LatestVersionRow
            >("SELECT version_id as versionId, reason, content_hash as contentHash, created_at as createdAt FROM document_versions WHERE document_id = ? ORDER BY created_at DESC, version_id ASC LIMIT 1")
            .get(documentId);

          const shouldMergeAutosave =
            actor === "auto" &&
            latest?.reason === "autosave" &&
            ts - latest.createdAt < AUTOSAVE_MERGE_WINDOW_MS;

          if (shouldMergeAutosave && latest) {
            args.db
              .prepare(
                "UPDATE document_versions SET content_json = ?, content_text = ?, content_md = ?, content_hash = ?, word_count = ?, created_at = ? WHERE version_id = ?",
              )
              .run(
                encoded.data,
                derived.data.contentText,
                derived.data.contentMd,
                contentHash,
                wordCount,
                ts,
                latest.versionId,
              );

            args.logger.info("version_autosave_merged", {
              version_id: latest.versionId,
              document_id: documentId,
              content_hash: contentHash,
            });
          } else {
            const shouldInsertVersion =
              actor === "auto" ? latest?.contentHash !== contentHash : true;
            if (!shouldInsertVersion) {
              return;
            }

            const versionId = randomUUID();
            args.db
              .prepare(
                "INSERT INTO document_versions (version_id, project_id, document_id, actor, reason, content_json, content_text, content_md, content_hash, word_count, diff_format, diff_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
                wordCount,
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
      if (actor === "ai") {
        args.logger.info("ai_apply_succeeded", {
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
          const wordCount = countWords(current.contentText);
          args.db
            .prepare(
              "INSERT INTO document_versions (version_id, project_id, document_id, actor, reason, content_json, content_text, content_md, content_hash, word_count, diff_format, diff_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .run(
              versionId,
              projectId,
              documentId,
              "user",
              "status-change",
              current.contentJson,
              current.contentText,
              current.contentMd,
              current.contentHash,
              wordCount,
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
            VersionListRow
          >("SELECT version_id as versionId, actor, reason, content_hash as contentHash, COALESCE(word_count, 0) as wordCount, created_at as createdAt FROM document_versions WHERE document_id = ? ORDER BY created_at DESC, version_id ASC")
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
          >("SELECT document_id as documentId, project_id as projectId, version_id as versionId, actor, reason, content_json as contentJson, content_text as contentText, content_md as contentMd, content_hash as contentHash, COALESCE(word_count, 0) as wordCount, created_at as createdAt FROM document_versions WHERE document_id = ? AND version_id = ?")
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

    diffVersions: ({ documentId, baseVersionId, targetVersionId }) => {
      try {
        const base = args.db
          .prepare<
            [string, string],
            VersionDiffRow
          >("SELECT actor, content_text as contentText FROM document_versions WHERE document_id = ? AND version_id = ?")
          .get(documentId, baseVersionId);
        if (!base) {
          return ipcError("NOT_FOUND", "Version not found");
        }

        let targetText = "";
        let targetActor: VersionSnapshotActor | null = null;

        if (targetVersionId) {
          const target = args.db
            .prepare<
              [string, string],
              VersionDiffRow
            >("SELECT actor, content_text as contentText FROM document_versions WHERE document_id = ? AND version_id = ?")
            .get(documentId, targetVersionId);
          if (!target) {
            return ipcError("NOT_FOUND", "Target version not found");
          }
          targetText = target.contentText;
          targetActor = target.actor;
        } else {
          const current = args.db
            .prepare<
              [string],
              CurrentDocumentDiffRow
            >("SELECT content_text as contentText FROM documents WHERE document_id = ?")
            .get(documentId);
          if (!current) {
            return ipcError("NOT_FOUND", "Document not found");
          }
          targetText = current.contentText;
        }

        const diff = buildUnifiedDiff({
          oldText: base.contentText,
          newText: targetText,
          oldLabel: baseVersionId,
          newLabel: targetVersionId ?? "current",
        });
        return {
          ok: true,
          data: {
            diffText: diff.diffText,
            hasDifferences: diff.diffText.length > 0,
            stats: diff.stats,
            aiMarked: base.actor === "ai" || targetActor === "ai",
          },
        };
      } catch (error) {
        args.logger.error("version_diff_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
          document_id: documentId,
          version_id: baseVersionId,
          target_version_id: targetVersionId,
        });
        return ipcError("DB_ERROR", "Failed to compute version diff");
      }
    },

    rollbackVersion: ({ documentId, versionId }) =>
      rollbackToVersion({ documentId, versionId }),

    restoreVersion: ({ documentId, versionId }) => {
      const rollback = rollbackToVersion({ documentId, versionId });
      if (!rollback.ok) {
        return rollback;
      }
      return { ok: true, data: { restored: true } };
    },
  };
}
