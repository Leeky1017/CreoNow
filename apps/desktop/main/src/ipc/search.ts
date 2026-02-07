import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import { createFtsService } from "../services/search/ftsService";

/**
 * Register `search:*` IPC handlers.
 *
 * Why: search must be deterministic and must not leak SQLite errors across IPC.
 */
export function registerSearchIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
}): void {
  deps.ipcMain.handle(
    "search:fulltext:query",
    async (
      _e,
      payload: { projectId: string; query: string; limit?: number },
    ): Promise<
      IpcResponse<{
        items: Array<{
          documentId: string;
          title: string;
          snippet: string;
          score: number;
        }>;
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

      const svc = createFtsService({ db: deps.db, logger: deps.logger });
      const res = svc.searchFulltext({
        projectId: payload.projectId,
        query: payload.query,
        limit: payload.limit,
      });

      if (!res.ok) {
        if (res.error.code === "INVALID_ARGUMENT") {
          deps.logger.info("search_fulltext_invalid_query", {
            queryLength: payload.query.trim().length,
          });
        } else {
          deps.logger.error("search_fulltext_failed", {
            code: res.error.code,
            message: res.error.message,
          });
        }
        return { ok: false, error: res.error };
      }

      deps.logger.info("search_fulltext", {
        queryLength: payload.query.trim().length,
        resultCount: res.data.items.length,
      });
      return { ok: true, data: res.data };
    },
  );

  deps.ipcMain.handle(
    "search:semantic:query",
    async (
      _e,
      payload: { projectId: string; queryText: string; limit?: number },
    ): Promise<
      IpcResponse<{
        items: Array<{
          documentId: string;
          chunkId?: string;
          snippet: string;
          score: number;
        }>;
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

      deps.logger.info("semantic_disabled", {
        reason: "embedding/vector store not implemented (P0 fallback)",
        queryLength: payload.queryText.trim().length,
      });

      return {
        ok: false,
        error: {
          code: "MODEL_NOT_READY",
          message: "Semantic search not ready",
        },
      };
    },
  );
}
