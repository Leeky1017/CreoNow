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
    "search:fts:query",
    async (
      _e,
      payload: {
        projectId: string;
        query: string;
        limit?: number;
        offset?: number;
      },
    ): Promise<
      IpcResponse<{
        results: Array<{
          projectId: string;
          documentId: string;
          documentTitle: string;
          documentType: string;
          snippet: string;
          highlights: Array<{ start: number; end: number }>;
          anchor: { start: number; end: number };
          score: number;
          updatedAt: number;
        }>;
        total: number;
        hasMore: boolean;
        indexState: "ready" | "rebuilding";
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
      const res = svc.search({
        projectId: payload.projectId,
        query: payload.query,
        limit: payload.limit,
        offset: payload.offset,
      });

      if (!res.ok) {
        if (res.error.code === "INVALID_ARGUMENT") {
          deps.logger.info("search_fts_invalid_query", {
            queryLength: payload.query.trim().length,
          });
        } else {
          deps.logger.error("search_fts_failed", {
            code: res.error.code,
            message: res.error.message,
          });
        }
        return { ok: false, error: res.error };
      }

      deps.logger.info("search_fts_query", {
        queryLength: payload.query.trim().length,
        resultCount: res.data.results.length,
        indexState: res.data.indexState,
      });
      return { ok: true, data: res.data };
    },
  );

  deps.ipcMain.handle(
    "search:fts:reindex",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<
      IpcResponse<{
        indexState: "ready";
        reindexed: number;
      }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      const svc = createFtsService({ db: deps.db, logger: deps.logger });
      const res = svc.reindex({ projectId: payload.projectId });
      if (!res.ok) {
        deps.logger.error("search_fts_reindex_failed", {
          code: res.error.code,
          message: res.error.message,
        });
        return { ok: false, error: res.error };
      }

      deps.logger.info("search_fts_reindex", {
        reindexed: res.data.reindexed,
      });
      return { ok: true, data: res.data };
    },
  );
}
