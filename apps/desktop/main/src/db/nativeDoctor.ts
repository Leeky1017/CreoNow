import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../packages/shared/types/ipc-generated";

export const REBUILD_NATIVE_COMMAND = "pnpm -C apps/desktop rebuild:native";

export type DbInitFailureCategory =
  | "native_module_abi_mismatch"
  | "native_module_missing_binding"
  | "db_init_failed";

export type DbInitFailureDetails = {
  category: DbInitFailureCategory;
  reason: string;
  remediation: {
    command: string;
    restartRequired: true;
  };
};

/**
 * Normalize unknown error values into a deterministic message.
 *
 * Why: DB startup failures can come from native loaders and must remain parseable.
 */
export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Classify DB startup failures into stable categories for renderer remediation UX.
 *
 * Why: AI panel must show actionable next steps instead of generic DB errors.
 */
export function diagnoseDbInitFailure(error: unknown): DbInitFailureDetails {
  const reason = toErrorMessage(error);
  const lower = reason.toLowerCase();

  const isAbiMismatch =
    lower.includes("compiled against a different node.js version") ||
    (lower.includes("node_module_version") && lower.includes("requires"));

  if (isAbiMismatch) {
    return {
      category: "native_module_abi_mismatch",
      reason,
      remediation: {
        command: REBUILD_NATIVE_COMMAND,
        restartRequired: true,
      },
    };
  }

  const isMissingBinding =
    lower.includes("could not locate the bindings file") ||
    lower.includes("better_sqlite3.node") ||
    (lower.includes("cannot find module") && lower.includes("better-sqlite3"));

  if (isMissingBinding) {
    return {
      category: "native_module_missing_binding",
      reason,
      remediation: {
        command: REBUILD_NATIVE_COMMAND,
        restartRequired: true,
      },
    };
  }

  return {
    category: "db_init_failed",
    reason,
    remediation: {
      command: REBUILD_NATIVE_COMMAND,
      restartRequired: true,
    },
  };
}

/**
 * Build an IPC-safe DB init error with deterministic remediation details.
 *
 * Why: downstream IPC handlers reuse this payload when DB is unavailable.
 */
export function createDbInitIpcError(error: unknown): IpcError {
  const details = diagnoseDbInitFailure(error);
  const code: IpcErrorCode = "DB_ERROR";

  if (details.category === "native_module_abi_mismatch") {
    return {
      code,
      message:
        "Database native module ABI mismatch. Run pnpm -C apps/desktop rebuild:native and restart app.",
      details,
    };
  }

  if (details.category === "native_module_missing_binding") {
    return {
      code,
      message:
        "Database native binding is missing. Run pnpm -C apps/desktop rebuild:native and restart app.",
      details,
    };
  }

  return {
    code,
    message: "Failed to initialize database",
    details,
  };
}
