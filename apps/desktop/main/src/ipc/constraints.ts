import fs from "node:fs/promises";
import path from "node:path";

import type Database from "better-sqlite3";
import type { IpcMain } from "electron";

import type {
  IpcError,
  IpcResponse,
} from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import { ensureCreonowDirStructure } from "../services/context/contextFs";

type ConstraintsConfig = {
  version: 1;
  items: string[];
};

type ProjectRow = {
  rootPath: string;
};

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
type ServiceResult<T> = Ok<T> | Err;

/**
 * Return a new default constraints config.
 *
 * Why: callers must never share/mutate a singleton default across IPC requests.
 */
function getDefaultConstraints(): ConstraintsConfig {
  return { version: 1, items: [] };
}

/**
 * Narrow unknown to a record.
 */
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/**
 * Validate the constraints JSON shape.
 *
 * Why: constraints are part of prompt rules; invalid state must be rejected with
 * a stable `INVALID_ARGUMENT` error for E2E and recovery.
 */
function isConstraintsConfig(x: unknown): x is ConstraintsConfig {
  if (!isRecord(x)) {
    return false;
  }
  if (x.version !== 1) {
    return false;
  }
  if (!Array.isArray(x.items)) {
    return false;
  }
  return x.items.every((v) => typeof v === "string");
}

/**
 * Build a stable IPC error object.
 *
 * Why: filesystem errors must not leak raw stacks across IPC.
 */
function ipcError(code: IpcError["code"], message: string): Err {
  return { ok: false, error: { code, message } };
}

/**
 * Compute the constraints SSOT absolute path.
 */
function getConstraintsPath(projectRootPath: string): string {
  return path.join(projectRootPath, ".creonow", "rules", "constraints.json");
}

/**
 * Read and validate constraints from disk.
 */
async function readConstraintsFile(
  constraintsPath: string,
): Promise<ServiceResult<ConstraintsConfig>> {
  try {
    const raw = await fs.readFile(constraintsPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isConstraintsConfig(parsed)) {
      return ipcError(
        "INVALID_ARGUMENT",
        "constraints.json has invalid schema",
      );
    }
    return { ok: true, data: parsed };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { ok: true, data: getDefaultConstraints() };
    }
    if (error instanceof Error && error.name === "SyntaxError") {
      return ipcError("INVALID_ARGUMENT", "constraints.json is not valid JSON");
    }
    return ipcError("IO_ERROR", "Failed to read constraints");
  }
}

/**
 * Write constraints SSOT to disk (overwriting any previous content).
 */
async function writeConstraintsFile(args: {
  constraintsPath: string;
  constraints: ConstraintsConfig;
}): Promise<ServiceResult<true>> {
  try {
    const json = JSON.stringify(args.constraints, null, 2) + "\n";
    await fs.writeFile(args.constraintsPath, json, "utf8");
    return { ok: true, data: true };
  } catch {
    return ipcError("IO_ERROR", "Failed to write constraints");
  }
}

/**
 * Register `constraints:*` IPC handlers.
 *
 * Why: constraints are project-scoped rules with SSOT at
 * `.creonow/rules/constraints.json` (no DB dual-write).
 */
export function registerConstraintsIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
}): void {
  deps.ipcMain.handle(
    "constraints:policy:get",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<IpcResponse<{ constraints: ConstraintsConfig }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (payload.projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }

      try {
        const row = deps.db
          .prepare<
            [string],
            ProjectRow
          >("SELECT root_path as rootPath FROM projects WHERE project_id = ?")
          .get(payload.projectId);
        if (!row) {
          return {
            ok: false,
            error: { code: "NOT_FOUND", message: "Project not found" },
          };
        }

        const constraintsPath = getConstraintsPath(row.rootPath);
        const res = await readConstraintsFile(constraintsPath);
        if (!res.ok) {
          deps.logger.error("constraints_read_failed", {
            projectId: payload.projectId,
            code: res.error.code,
          });
          return { ok: false, error: res.error };
        }

        return { ok: true, data: { constraints: res.data } };
      } catch (error) {
        deps.logger.error("constraints_get_failed", {
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "IO_ERROR", message: "Failed to get constraints" },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "constraints:policy:set",
    async (
      _e,
      payload: { projectId: string; constraints: ConstraintsConfig },
    ): Promise<IpcResponse<{ constraints: ConstraintsConfig }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (payload.projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }
      if (!isConstraintsConfig(payload.constraints)) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "constraints must match schema",
          },
        };
      }

      try {
        const row = deps.db
          .prepare<
            [string],
            ProjectRow
          >("SELECT root_path as rootPath FROM projects WHERE project_id = ?")
          .get(payload.projectId);
        if (!row) {
          return {
            ok: false,
            error: { code: "NOT_FOUND", message: "Project not found" },
          };
        }

        const ensured = ensureCreonowDirStructure(row.rootPath);
        if (!ensured.ok) {
          deps.logger.error("constraints_ensure_creonow_failed", {
            projectId: payload.projectId,
            code: ensured.error.code,
          });
          return { ok: false, error: ensured.error };
        }

        const constraintsPath = getConstraintsPath(row.rootPath);
        const wrote = await writeConstraintsFile({
          constraintsPath,
          constraints: payload.constraints,
        });
        if (!wrote.ok) {
          deps.logger.error("constraints_write_failed", {
            projectId: payload.projectId,
            code: wrote.error.code,
          });
          return { ok: false, error: wrote.error };
        }

        deps.logger.info("constraints_updated", {
          projectId: payload.projectId,
          items_count: payload.constraints.items.length,
        });
        return { ok: true, data: { constraints: payload.constraints } };
      } catch (error) {
        deps.logger.error("constraints_set_failed", {
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "IO_ERROR", message: "Failed to set constraints" },
        };
      }
    },
  );
}
