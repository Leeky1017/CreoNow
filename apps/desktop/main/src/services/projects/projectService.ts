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
};

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type ProjectService = {
  create: (args: { name?: string }) => ServiceResult<ProjectInfo>;
  list: () => ServiceResult<{ items: ProjectListItem[] }>;
  getCurrent: () => ServiceResult<ProjectInfo>;
  setCurrent: (args: { projectId: string }) => ServiceResult<ProjectInfo>;
  delete: (args: { projectId: string }) => ServiceResult<{ deleted: true }>;
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
): ServiceResult<ProjectInfo & { name: string; updatedAt: number }> {
  try {
    const row = db
      .prepare<
        [string],
        { projectId: string; name: string; rootPath: string; updatedAt: number }
      >("SELECT project_id as projectId, name, root_path as rootPath, updated_at as updatedAt FROM projects WHERE project_id = ?")
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

    list: () => {
      try {
        const rows = args.db
          .prepare<
            [],
            ProjectListItem
          >("SELECT project_id as projectId, name, root_path as rootPath, updated_at as updatedAt FROM projects ORDER BY updated_at DESC, project_id ASC")
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
  };
}
