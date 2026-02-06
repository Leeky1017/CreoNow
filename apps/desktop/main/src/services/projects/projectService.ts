import fs from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

import type Database from "better-sqlite3";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../../logging/logger";
import { redactUserDataPath } from "../../db/paths";
import {
  ensureCreonowDirStructure,
  getCreonowRootPath,
} from "../context/contextFs";

export type ProjectInfo = {
  projectId: string;
  rootPath: string;
};

export type ProjectListItem = {
  projectId: string;
  name: string;
  rootPath: string;
  updatedAt: number;
  archivedAt: number | null;
};

type ProjectRow = ProjectListItem;

type DuplicateDocumentRow = {
  documentId: string;
  title: string;
  contentJson: string;
  contentText: string;
  contentMd: string;
  contentHash: string;
};

type SettingsRow = {
  valueJson: string;
};

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type ProjectService = {
  create: (args: { name?: string }) => ServiceResult<ProjectInfo>;
  list: (args?: {
    includeArchived?: boolean;
  }) => ServiceResult<{ items: ProjectListItem[] }>;
  getCurrent: () => ServiceResult<ProjectInfo>;
  setCurrent: (args: { projectId: string }) => ServiceResult<ProjectInfo>;
  delete: (args: { projectId: string }) => ServiceResult<{ deleted: true }>;
  rename: (args: {
    projectId: string;
    name: string;
  }) => ServiceResult<{ projectId: string; name: string; updatedAt: number }>;
  duplicate: (args: {
    projectId: string;
  }) => ServiceResult<{ projectId: string; rootPath: string; name: string }>;
  archive: (args: {
    projectId: string;
    archived: boolean;
  }) => ServiceResult<{
    projectId: string;
    archived: boolean;
    archivedAt: number | null;
  }>;
};

const SETTINGS_SCOPE = "app" as const;
const CURRENT_PROJECT_ID_KEY = "creonow.project.currentId" as const;
const PROJECT_SETTINGS_SCOPE_PREFIX = "project:" as const;
const CURRENT_DOCUMENT_ID_KEY = "creonow.document.currentId" as const;
const MAX_PROJECT_NAME_LENGTH = 120;

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

/**
 * Compute the app-managed project root path.
 *
 * Why: V1 prefers a userData-managed root for deterministic Windows E2E and
 * to avoid permissions issues with arbitrary paths.
 */
function getProjectRootPath(userDataDir: string, projectId: string): string {
  return path.join(userDataDir, "projects", projectId);
}

/**
 * Normalize and validate a project name.
 *
 * Why: dashboard rename/create must reject empty and oversized labels.
 */
function normalizeProjectName(
  name: string | undefined,
  fallback: string,
): ServiceResult<string> {
  const trimmed = name?.trim() ?? "";
  const normalized = trimmed.length > 0 ? trimmed : fallback;

  if (normalized.trim().length === 0) {
    return ipcError("INVALID_ARGUMENT", "name is required");
  }
  if (normalized.length > MAX_PROJECT_NAME_LENGTH) {
    return ipcError(
      "INVALID_ARGUMENT",
      `name too long (max ${MAX_PROJECT_NAME_LENGTH})`,
    );
  }

  return { ok: true, data: normalized };
}

/**
 * Compute a settings scope for project-scoped settings.
 *
 * Why: duplicated project should preserve current document pointer if possible.
 */
function getProjectSettingsScope(projectId: string): string {
  return `${PROJECT_SETTINGS_SCOPE_PREFIX}${projectId}`;
}

/**
 * Read the current projectId from settings.
 *
 * Why: the current project must persist across restarts for a stable local entry.
 */
function readCurrentProjectId(db: Database.Database): ServiceResult<string> {
  try {
    const row = db
      .prepare<
        [string, string],
        { value_json: string }
      >("SELECT value_json FROM settings WHERE scope = ? AND key = ?")
      .get(SETTINGS_SCOPE, CURRENT_PROJECT_ID_KEY);
    if (!row) {
      return ipcError("NOT_FOUND", "No current project");
    }
    const parsed: unknown = JSON.parse(row.value_json);
    if (typeof parsed !== "string" || parsed.length === 0) {
      return ipcError("DB_ERROR", "Invalid current project setting");
    }
    return { ok: true, data: parsed };
  } catch (error) {
    return ipcError(
      "DB_ERROR",
      "Failed to read current project setting",
      error instanceof Error ? { message: error.message } : { error },
    );
  }
}

function writeCurrentProjectId(
  db: Database.Database,
  projectId: string,
): ServiceResult<true> {
  try {
    const ts = nowTs();
    db.prepare(
      "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
    ).run(
      SETTINGS_SCOPE,
      CURRENT_PROJECT_ID_KEY,
      JSON.stringify(projectId),
      ts,
    );
    return { ok: true, data: true };
  } catch (error) {
    return ipcError(
      "DB_ERROR",
      "Failed to persist current project",
      error instanceof Error ? { message: error.message } : { error },
    );
  }
}

function clearCurrentProjectId(db: Database.Database): ServiceResult<true> {
  try {
    db.prepare("DELETE FROM settings WHERE scope = ? AND key = ?").run(
      SETTINGS_SCOPE,
      CURRENT_PROJECT_ID_KEY,
    );
    return { ok: true, data: true };
  } catch (error) {
    return ipcError(
      "DB_ERROR",
      "Failed to clear current project",
      error instanceof Error ? { message: error.message } : { error },
    );
  }
}

function getProjectById(
  db: Database.Database,
  projectId: string,
): ServiceResult<ProjectRow> {
  try {
    const row = db
      .prepare<
        [string],
        {
          projectId: string;
          name: string;
          rootPath: string;
          updatedAt: number;
          archivedAt: number | null;
        }
      >(
        "SELECT project_id as projectId, name, root_path as rootPath, updated_at as updatedAt, archived_at as archivedAt FROM projects WHERE project_id = ?",
      )
      .get(projectId);
    if (!row) {
      return ipcError("NOT_FOUND", "Project not found", { projectId });
    }
    return { ok: true, data: row };
  } catch (error) {
    return ipcError(
      "DB_ERROR",
      "Failed to load project",
      error instanceof Error ? { message: error.message } : { error },
    );
  }
}

/**
 * Copy `.creonow` metadata directory from source project to duplicate project.
 *
 * Why: duplicate should preserve authoring context when source metadata exists,
 * but metadata copy failures must not block duplicate core behavior.
 */
function copyCreonowDirBestEffort(args: {
  sourceRootPath: string;
  targetRootPath: string;
  logger: Logger;
}): void {
  const sourceCreonowPath = getCreonowRootPath(args.sourceRootPath);
  const targetCreonowPath = getCreonowRootPath(args.targetRootPath);

  if (!fs.existsSync(sourceCreonowPath)) {
    return;
  }

  try {
    fs.cpSync(sourceCreonowPath, targetCreonowPath, {
      recursive: true,
      force: true,
      errorOnExist: false,
    });
  } catch (error) {
    args.logger.error("project_duplicate_copy_creonow_failed", {
      code: "IO_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Create a project service backed by SQLite (SSOT).
 */
export function createProjectService(args: {
  db: Database.Database;
  userDataDir: string;
  logger: Logger;
}): ProjectService {
  return {
    create: ({ name }) => {
      const projectId = randomUUID();
      const rootPath = getProjectRootPath(args.userDataDir, projectId);

      const normalized = normalizeProjectName(name, "Untitled");
      if (!normalized.ok) {
        return normalized;
      }

      const ensured = ensureCreonowDirStructure(rootPath);
      if (!ensured.ok) {
        return ensured;
      }

      const ts = nowTs();

      try {
        args.db
          .prepare(
            "INSERT INTO projects (project_id, name, root_path, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, ?, NULL)",
          )
          .run(projectId, normalized.data, rootPath, ts, ts);

        args.logger.info("project_created", {
          project_id: projectId,
          root_path: redactUserDataPath(args.userDataDir, rootPath),
        });

        return { ok: true, data: { projectId, rootPath } };
      } catch (error) {
        args.logger.error("project_create_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to create project");
      }
    },

    list: ({ includeArchived = false } = {}) => {
      try {
        const whereClause = includeArchived ? "" : "WHERE archived_at IS NULL";
        const rows = args.db
          .prepare<
            [],
            ProjectListItem
          >(
            `SELECT project_id as projectId, name, root_path as rootPath, updated_at as updatedAt, archived_at as archivedAt FROM projects ${whereClause} ORDER BY updated_at DESC, project_id ASC`,
          )
          .all();
        return { ok: true, data: { items: rows } };
      } catch (error) {
        args.logger.error("project_list_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to list projects");
      }
    },

    getCurrent: () => {
      const currentId = readCurrentProjectId(args.db);
      if (!currentId.ok) {
        return currentId;
      }

      const project = getProjectById(args.db, currentId.data);
      if (!project.ok) {
        if (project.error.code === "NOT_FOUND") {
          void clearCurrentProjectId(args.db);
        }
        return project;
      }

      return {
        ok: true,
        data: {
          projectId: project.data.projectId,
          rootPath: project.data.rootPath,
        },
      };
    },

    setCurrent: ({ projectId }) => {
      if (projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }

      const project = getProjectById(args.db, projectId);
      if (!project.ok) {
        return project;
      }

      const persisted = writeCurrentProjectId(args.db, projectId);
      if (!persisted.ok) {
        return persisted;
      }

      try {
        args.db
          .prepare("UPDATE projects SET updated_at = ? WHERE project_id = ?")
          .run(nowTs(), projectId);
      } catch (error) {
        args.logger.error("project_touch_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
      }

      args.logger.info("project_set_current", { project_id: projectId });
      return {
        ok: true,
        data: {
          projectId: project.data.projectId,
          rootPath: project.data.rootPath,
        },
      };
    },

    delete: ({ projectId }) => {
      if (projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }

      const project = getProjectById(args.db, projectId);
      if (!project.ok) {
        return project;
      }

      try {
        args.db
          .prepare("DELETE FROM projects WHERE project_id = ?")
          .run(projectId);
      } catch (error) {
        args.logger.error("project_delete_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to delete project");
      }

      const currentId = readCurrentProjectId(args.db);
      if (currentId.ok && currentId.data === projectId) {
        void clearCurrentProjectId(args.db);
      }

      args.logger.info("project_deleted", { project_id: projectId });
      return { ok: true, data: { deleted: true } };
    },

    rename: ({ projectId, name }) => {
      if (projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }

      const normalized = normalizeProjectName(name, "");
      if (!normalized.ok) {
        return normalized;
      }

      const ts = nowTs();
      try {
        const res = args.db
          .prepare<
            [string, number, string]
          >("UPDATE projects SET name = ?, updated_at = ? WHERE project_id = ?")
          .run(normalized.data, ts, projectId);
        if (res.changes === 0) {
          return ipcError("NOT_FOUND", "Project not found", { projectId });
        }

        args.logger.info("project_renamed", {
          project_id: projectId,
        });
        return {
          ok: true,
          data: { projectId, name: normalized.data, updatedAt: ts },
        };
      } catch (error) {
        args.logger.error("project_rename_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to rename project");
      }
    },

    duplicate: ({ projectId }) => {
      if (projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }

      const sourceProject = getProjectById(args.db, projectId);
      if (!sourceProject.ok) {
        return sourceProject;
      }

      const duplicatedProjectId = randomUUID();
      const duplicatedRootPath = getProjectRootPath(
        args.userDataDir,
        duplicatedProjectId,
      );

      const duplicatedNameBase = sourceProject.data.name.trim().length
        ? sourceProject.data.name
        : "Untitled";
      const duplicatedNameRes = normalizeProjectName(
        `${duplicatedNameBase} (Copy)`,
        "Untitled (Copy)",
      );
      if (!duplicatedNameRes.ok) {
        return duplicatedNameRes;
      }

      const ensured = ensureCreonowDirStructure(duplicatedRootPath);
      if (!ensured.ok) {
        return ensured;
      }

      const ts = nowTs();
      let copiedDocuments = 0;

      try {
        args.db.transaction(() => {
          args.db
            .prepare(
              "INSERT INTO projects (project_id, name, root_path, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, ?, NULL)",
            )
            .run(
              duplicatedProjectId,
              duplicatedNameRes.data,
              duplicatedRootPath,
              ts,
              ts,
            );

          const sourceDocuments = args.db
            .prepare<
              [string],
              DuplicateDocumentRow
            >(
              "SELECT document_id as documentId, title, content_json as contentJson, content_text as contentText, content_md as contentMd, content_hash as contentHash FROM documents WHERE project_id = ? ORDER BY updated_at DESC, document_id ASC",
            )
            .all(projectId);

          const documentIdMap = new Map<string, string>();

          for (const sourceDocument of sourceDocuments) {
            const duplicatedDocumentId = randomUUID();
            documentIdMap.set(sourceDocument.documentId, duplicatedDocumentId);

            args.db
              .prepare(
                "INSERT INTO documents (document_id, project_id, title, content_json, content_text, content_md, content_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
              )
              .run(
                duplicatedDocumentId,
                duplicatedProjectId,
                sourceDocument.title,
                sourceDocument.contentJson,
                sourceDocument.contentText,
                sourceDocument.contentMd,
                sourceDocument.contentHash,
                ts,
                ts,
              );
          }

          copiedDocuments = sourceDocuments.length;

          const sourceCurrentDocument = args.db
            .prepare<
              [string, string],
              SettingsRow
            >("SELECT value_json as valueJson FROM settings WHERE scope = ? AND key = ?")
            .get(getProjectSettingsScope(projectId), CURRENT_DOCUMENT_ID_KEY);

          if (sourceCurrentDocument) {
            const parsedCurrent: unknown = JSON.parse(sourceCurrentDocument.valueJson);
            const sourceCurrentDocumentId =
              typeof parsedCurrent === "string" ? parsedCurrent : null;
            if (sourceCurrentDocumentId) {
              const duplicatedCurrentDocumentId = documentIdMap.get(
                sourceCurrentDocumentId,
              );
              if (duplicatedCurrentDocumentId) {
                args.db
                  .prepare(
                    "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
                  )
                  .run(
                    getProjectSettingsScope(duplicatedProjectId),
                    CURRENT_DOCUMENT_ID_KEY,
                    JSON.stringify(duplicatedCurrentDocumentId),
                    ts,
                  );
              }
            }
          }
        })();
      } catch (error) {
        args.logger.error("project_duplicate_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to duplicate project");
      }

      copyCreonowDirBestEffort({
        sourceRootPath: sourceProject.data.rootPath,
        targetRootPath: duplicatedRootPath,
        logger: args.logger,
      });

      args.logger.info("project_duplicated", {
        project_id: projectId,
        new_project_id: duplicatedProjectId,
        copied_documents: copiedDocuments,
      });

      return {
        ok: true,
        data: {
          projectId: duplicatedProjectId,
          rootPath: duplicatedRootPath,
          name: duplicatedNameRes.data,
        },
      };
    },

    archive: ({ projectId, archived }) => {
      if (projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }

      const project = getProjectById(args.db, projectId);
      if (!project.ok) {
        return project;
      }

      if (archived) {
        if (project.data.archivedAt !== null) {
          return {
            ok: true,
            data: {
              projectId,
              archived: true,
              archivedAt: project.data.archivedAt,
            },
          };
        }

        const ts = nowTs();
        try {
          args.db
            .prepare(
              "UPDATE projects SET archived_at = ?, updated_at = ? WHERE project_id = ?",
            )
            .run(ts, ts, projectId);
        } catch (error) {
          args.logger.error("project_archive_failed", {
            code: "DB_ERROR",
            message: error instanceof Error ? error.message : String(error),
          });
          return ipcError("DB_ERROR", "Failed to archive project");
        }

        args.logger.info("project_archived", {
          project_id: projectId,
        });
        return { ok: true, data: { projectId, archived: true, archivedAt: ts } };
      }

      if (project.data.archivedAt === null) {
        return {
          ok: true,
          data: { projectId, archived: false, archivedAt: null },
        };
      }

      const ts = nowTs();
      try {
        args.db
          .prepare(
            "UPDATE projects SET archived_at = NULL, updated_at = ? WHERE project_id = ?",
          )
          .run(ts, projectId);
      } catch (error) {
        args.logger.error("project_unarchive_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to unarchive project");
      }

      args.logger.info("project_unarchived", {
        project_id: projectId,
      });
      return {
        ok: true,
        data: {
          projectId,
          archived: false,
          archivedAt: null,
        },
      };
    },
  };
}
