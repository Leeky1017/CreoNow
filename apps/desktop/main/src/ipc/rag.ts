import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import { createRagService } from "../services/rag/ragService";

/**
 * Register `rag:*` IPC handlers.
 *
 * Why: RAG retrieve must be best-effort and must not leak DB errors across IPC.
 */
export function registerRagIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
}): void {
  deps.ipcMain.handle(
    "rag:retrieve",
    async (
      _e,
      payload: {
        projectId: string;
        queryText: string;
        limit?: number;
        budgetTokens?: number;
      },
    ): Promise<
      IpcResponse<{
        items: Array<{ sourceRef: string; snippet: string; score: number }>;
        diagnostics: {
          budgetTokens: number;
          usedTokens: number;
          droppedCount: number;
          trimmedCount: number;
          mode: "fulltext";
          degradedFrom?: "semantic";
          reason?: string;
        };
      }>
    > => {
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

      const svc = createRagService({ db: deps.db, logger: deps.logger });
      const res = svc.retrieve({
        projectId: payload.projectId,
        queryText: payload.queryText,
        limit: payload.limit,
        budgetTokens: payload.budgetTokens,
      });

      if (!res.ok) {
        deps.logger.error("rag_retrieve_failed", {
          code: res.error.code,
          message: res.error.message,
        });
        return { ok: false, error: res.error };
      }

      deps.logger.info("rag_retrieve", {
        queryLength: payload.queryText.trim().length,
        resultCount: res.data.items.length,
        budgetTokens: res.data.diagnostics.budgetTokens,
        usedTokens: res.data.diagnostics.usedTokens,
      });

      return { ok: true, data: res.data };
    },
  );
}

