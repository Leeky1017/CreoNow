import fs from "node:fs";
import path from "node:path";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

/**
 * Build a stable IPC error object.
 *
 * Why: `.creonow` operations must return deterministic error codes/messages for
 * E2E and must not leak raw stacks across IPC.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

export type CreonowDirStatus = {
  exists: boolean;
  creonowRootPath: string;
};

/**
 * Compute the `.creonow` root path for a project root.
 */
export function getCreonowRootPath(projectRootPath: string): string {
  return path.join(projectRootPath, ".creonow");
}

/**
 * Ensure the `.creonow/` directory structure exists for a project.
 *
 * Why: downstream P0 features require a stable, project-relative metadata
 * directory even when documents are stored in DB.
 */
export function ensureCreonowDirStructure(
  projectRootPath: string,
): ServiceResult<true> {
  try {
    const base = getCreonowRootPath(projectRootPath);
    const dirs = [
      base,
      path.join(base, "rules"),
      path.join(base, "settings"),
      path.join(base, "skills"),
      path.join(base, "characters"),
      path.join(base, "conversations"),
      path.join(base, "cache"),
    ];
    for (const d of dirs) {
      fs.mkdirSync(d, { recursive: true });
    }

    const defaultFiles: Array<{ p: string; content: string }> = [
      {
        p: path.join(base, "rules", "style.md"),
        content: "# Style\n\n",
      },
      {
        p: path.join(base, "rules", "terminology.json"),
        content: JSON.stringify({ terms: [] }, null, 2) + "\n",
      },
      {
        p: path.join(base, "rules", "constraints.json"),
        content: JSON.stringify({ version: 1, items: [] }, null, 2) + "\n",
      },
    ];
    for (const f of defaultFiles) {
      if (!fs.existsSync(f.p)) {
        fs.writeFileSync(f.p, f.content, "utf8");
      }
    }

    return { ok: true, data: true };
  } catch (error) {
    return ipcError(
      "IO_ERROR",
      "Failed to initialize .creonow directory",
      error instanceof Error ? { message: error.message } : { error },
    );
  }
}

/**
 * Read `.creonow` filesystem status for a project.
 *
 * Why: E2E must be able to assert `.creonow` existence deterministically.
 */
export function getCreonowDirStatus(
  projectRootPath: string,
): ServiceResult<CreonowDirStatus> {
  const creonowRootPath = getCreonowRootPath(projectRootPath);
  try {
    const stat = fs.statSync(creonowRootPath);
    return { ok: true, data: { exists: stat.isDirectory(), creonowRootPath } };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { ok: true, data: { exists: false, creonowRootPath } };
    }
    return ipcError(
      "IO_ERROR",
      "Failed to read .creonow status",
      error instanceof Error ? { message: error.message } : { error },
    );
  }
}
