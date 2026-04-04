/**
 * Diff IPC handlers — 文本差异计算
 */

import type { IpcMain } from "electron";

import type { IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import { computeTransaction } from "../services/diff/DiffEngine";
import type { DiffError } from "../services/diff/types";
import { ipcError } from "../services/shared/ipcResult";

export function registerDiffIpcHandlers(deps: {
  ipcMain: IpcMain;
  logger: Logger;
}): void {
  deps.ipcMain.handle(
    "version:diff:transaction",
    async (
      _e,
      payload: { before: string; after: string } | undefined,
    ): Promise<IpcResponse<unknown>> => {
      try {
        if (!payload || typeof payload.before !== "string" || typeof payload.after !== "string") {
          return ipcError("INVALID_ARGUMENT", "before and after must be strings");
        }
        const result = computeTransaction(payload.before, payload.after);
        return { ok: true, data: result };
      } catch (err) {
        const code = (err as DiffError).code;
        if (code === "DIFF_INPUT_TOO_LARGE") {
          return ipcError("DIFF_INPUT_TOO_LARGE", (err as Error).message);
        }
        deps.logger.error("version:diff:transaction failed", { reason: String(err) });
        return ipcError("DIFF_COMPUTE_FAILED", "Failed to compute diff");
      }
    },
  );
}
