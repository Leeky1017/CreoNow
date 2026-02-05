import { randomUUID } from "node:crypto";
import path from "node:path";

import type Database from "better-sqlite3";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../../logging/logger";
import { redactUserDataPath } from "../../db/paths";
import { ensureCreonowDirStructure } from "../context/contextFs";

export type ProjectInfo = {
  projectId: string;
  rootPath: string;
};

export type ProjectListItem = {
  projectId: string;
  name: string;
  rootPath: string;
  updatedAt: number;
  archivedAt?: number;
};

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type ProjectRenameResult = {
  projectId: string;
  name: string;
  updatedAt: number;
};

export type ProjectArchiveResult = {
  projectId: string;
  archived: boolean;
  updatedAt: number;
};

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
  }) => ServiceResult<ProjectRenameResult>;
  duplicate: (args: {
    projectId: string;
    name?: string;
  }) => ServiceResult<ProjectInfo>;
  archive: (args: {
    projectId: string;
    archived: boolean;
  }) => ServiceResult<ProjectArchiveResult>;
};

const SETTINGS_SCOPE = "app" as const;
const CURRENT_PROJECT_ID_KEY = "creonow.project.currentId" as const;

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
): ServiceResult<
  ProjectInfo & { name: string; updatedAt: number; archivedAt: number | null }
> {
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

      const ensured = ensureCreonowDirStructure(rootPath);
      if (!ensured.ok) {
        return ensured;
      }

      const ts = nowTs();
      const safeName = name?.trim().length ? name.trim() : "Untitled";

      try {
        args.db
          .prepare(
            "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
          )
          .run(projectId, safeName, rootPath, ts, ts);

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

    list: (listArgs) => {
      const includeArchived = listArgs?.includeArchived ?? false;
      try {
        type DbRow = {
          projectId: string;
          name: string;
          rootPath: string;
          updatedAt: number;
          archivedAt: number | null;
        };
        const query = includeArchived
          ? "SELECT project_id as projectId, name, root_path as rootPath, updated_at as updatedAt, archived_at as archivedAt FROM projects ORDER BY updated_at DESC, project_id ASC"
          : "SELECT project_id as projectId, name, root_path as rootPath, updated_at as updatedAt, archived_at as archivedAt FROM projects WHERE archived_at IS NULL ORDER BY updated_at DESC, project_id ASC";
        const rows = args.db.prepare<[], DbRow>(query).all();
        const items: ProjectListItem[] = rows.map((row) => ({
          projectId: row.projectId,
          name: row.name,
          rootPath: row.rootPath,
          updatedAt: row.updatedAt,
          archivedAt: row.archivedAt ?? undefined,
        }));
        return { ok: true, data: { items } };
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
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        return ipcError("INVALID_ARGUMENT", "name is required");
      }
      if (trimmedName.length > 80) {
        return ipcError(
          "INVALID_ARGUMENT",
          "name must be 80 characters or less",
        );
      }

      const project = getProjectById(args.db, projectId);
      if (!project.ok) {
        return project;
      }

      const ts = nowTs();
      try {
        args.db
          .prepare(
            "UPDATE projects SET name = ?, updated_at = ? WHERE project_id = ?",
          )
          .run(trimmedName, ts, projectId);

        args.logger.info("project_renamed", {
          project_id: projectId,
          name: trimmedName,
        });

        return {
          ok: true,
          data: { projectId, name: trimmedName, updatedAt: ts },
        };
      } catch (error) {
        args.logger.error("project_rename_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to rename project");
      }
    },

    duplicate: ({ projectId, name }) => {
      if (projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }

      const sourceProject = getProjectById(args.db, projectId);
      if (!sourceProject.ok) {
        return sourceProject;
      }

      // Compute new name: "<old> (copy)" or provided name
      let newName = name?.trim();
      if (!newName || newName.length === 0) {
        const baseName = sourceProject.data.name;
        newName = `${baseName} (copy)`;

        // Check for existing copies and append number if needed
        try {
          const existingCopies = args.db
            .prepare<
              [string],
              { name: string }
            >("SELECT name FROM projects WHERE name LIKE ? ORDER BY name")
            .all(`${baseName} (copy%`);

          if (existingCopies.length > 0) {
            // Find the highest copy number
            let maxNum = 1;
            for (const row of existingCopies) {
              if (row.name === `${baseName} (copy)`) {
                maxNum = Math.max(maxNum, 1);
              } else {
                const match = row.name.match(/\(copy (\d+)\)$/);
                if (match) {
                  maxNum = Math.max(maxNum, parseInt(match[1], 10));
                }
              }
            }
            newName = `${baseName} (copy ${maxNum + 1})`;
          }
        } catch {
          // If query fails, just use the simple copy name
        }
      }

      // Create new project
      const newProjectId = randomUUID();
      const newRootPath = getProjectRootPath(args.userDataDir, newProjectId);

      const ensured = ensureCreonowDirStructure(newRootPath);
      if (!ensured.ok) {
        return ensured;
      }

      const ts = nowTs();
      try {
        // Create the new project entry
        args.db
          .prepare(
            "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
          )
          .run(newProjectId, newName, newRootPath, ts, ts);

        // Copy documents
        args.db
          .prepare(
            `INSERT INTO documents (document_id, project_id, title, content_json, content_text, content_md, created_at, updated_at)
             SELECT lower(hex(randomblob(16))), ?, title, content_json, content_text, content_md, ?, ?
             FROM documents WHERE project_id = ?`,
          )
          .run(newProjectId, ts, ts, projectId);

        // Copy KG entities
        const entityIdMap = new Map<string, string>();
        const oldEntities = args.db
          .prepare<
            [string],
            {
              entityId: string;
              name: string;
              entityType: string | null;
              description: string | null;
              metadataJson: string;
            }
          >(
            "SELECT entity_id as entityId, name, entity_type as entityType, description, metadata_json as metadataJson FROM kg_entities WHERE project_id = ?",
          )
          .all(projectId);

        for (const entity of oldEntities) {
          const newEntityId = randomUUID();
          entityIdMap.set(entity.entityId, newEntityId);
          args.db
            .prepare(
              "INSERT INTO kg_entities (entity_id, project_id, name, entity_type, description, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .run(
              newEntityId,
              newProjectId,
              entity.name,
              entity.entityType,
              entity.description,
              entity.metadataJson,
              ts,
              ts,
            );
        }

        // Copy KG relations (with updated entity IDs)
        const oldRelations = args.db
          .prepare<
            [string],
            {
              fromEntityId: string;
              toEntityId: string;
              relationType: string;
              metadataJson: string;
              evidenceJson: string;
            }
          >(
            "SELECT from_entity_id as fromEntityId, to_entity_id as toEntityId, relation_type as relationType, metadata_json as metadataJson, evidence_json as evidenceJson FROM kg_relations WHERE project_id = ?",
          )
          .all(projectId);

        for (const relation of oldRelations) {
          const newFromId = entityIdMap.get(relation.fromEntityId);
          const newToId = entityIdMap.get(relation.toEntityId);
          if (newFromId && newToId) {
            args.db
              .prepare(
                "INSERT INTO kg_relations (relation_id, project_id, from_entity_id, to_entity_id, relation_type, metadata_json, evidence_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
              )
              .run(
                randomUUID(),
                newProjectId,
                newFromId,
                newToId,
                relation.relationType,
                relation.metadataJson,
                relation.evidenceJson,
                ts,
                ts,
              );
          }
        }

        args.logger.info("project_duplicated", {
          source_project_id: projectId,
          new_project_id: newProjectId,
          root_path: redactUserDataPath(args.userDataDir, newRootPath),
        });

        return { ok: true, data: { projectId: newProjectId, rootPath: newRootPath } };
      } catch (error) {
        args.logger.error("project_duplicate_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to duplicate project");
      }
    },

    archive: ({ projectId, archived }) => {
      if (projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }

      const project = getProjectById(args.db, projectId);
      if (!project.ok) {
        return project;
      }

      const ts = nowTs();
      const archivedAt = archived ? ts : null;

      try {
        args.db
          .prepare(
            "UPDATE projects SET archived_at = ?, updated_at = ? WHERE project_id = ?",
          )
          .run(archivedAt, ts, projectId);

        args.logger.info("project_archived", {
          project_id: projectId,
          archived,
        });

        return { ok: true, data: { projectId, archived, updatedAt: ts } };
      } catch (error) {
        args.logger.error("project_archive_failed", {
          code: "DB_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed to archive project");
      }
    },
  };
}
