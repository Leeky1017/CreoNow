import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import type { EmbeddingService } from "../services/embedding/embeddingService";

/**
 * Register `embedding:*` IPC handlers.
 *
 * Why: CN V1 must have a deterministic, testable fallback path on Windows where
 * native/onnx models and sqlite-vec are not yet ready.
 */
export function registerEmbeddingIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  embedding: EmbeddingService;
}): void {
  deps.ipcMain.handle(
    "embedding:text:encode",
    async (
      _e,
      payload: { texts: string[]; model?: string },
    ): Promise<IpcResponse<{ vectors: number[][]; dimension: number }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      const res = deps.embedding.encode({
        texts: payload.texts,
        model: payload.model,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "embedding:index:build",
    async (
      _e,
      payload: { documentId: string; contentHash: string },
    ): Promise<IpcResponse<{ accepted: true }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (payload.documentId.trim().length === 0) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "documentId is required",
          },
        };
      }
      if (payload.contentHash.trim().length === 0) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "contentHash is required",
          },
        };
      }

      deps.logger.info("embedding_index_not_ready", {
        documentId: payload.documentId,
      });

      return {
        ok: false,
        error: {
          code: "MODEL_NOT_READY",
          message: "Embedding index not ready",
        },
      };
    },
  );
}
