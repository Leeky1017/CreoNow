import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import type { EmbeddingService } from "../services/embedding/embeddingService";
import { createRagService } from "../services/rag/ragService";
import { LruCache } from "../services/rag/lruCache";

/**
 * Register `rag:*` IPC handlers.
 *
 * Why: RAG retrieve must be best-effort and must not leak DB errors across IPC.
 */
export function registerRagIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  embedding: EmbeddingService;
  ragRerank: { enabled: boolean; model?: string };
}): void {
  const embeddingCache = new LruCache<string, number[]>({ maxEntries: 256 });

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
          mode: "fulltext" | "fulltext_reranked";
          planner: {
            queries: string[];
            perQueryHits: number[];
            selectedQuery: string;
            selectedCount: number;
          };
          rerank: { enabled: boolean; reason?: string; model?: string };
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

      const svc = createRagService({
        db: deps.db,
        logger: deps.logger,
        embedding: deps.embedding,
        embeddingCache,
        rerank: deps.ragRerank,
      });
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
