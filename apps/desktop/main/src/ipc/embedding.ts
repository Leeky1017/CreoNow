import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";

const MAX_TEXTS = 64;
const MAX_TEXT_LENGTH = 8_000;

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
}): void {
  deps.ipcMain.handle(
    "embedding:encode",
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
      if (!Array.isArray(payload.texts) || payload.texts.length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "texts is required" },
        };
      }
      if (payload.texts.length > MAX_TEXTS) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "texts is too large" },
        };
      }
      for (const text of payload.texts) {
        if (typeof text !== "string" || text.trim().length === 0) {
          return {
            ok: false,
            error: {
              code: "INVALID_ARGUMENT",
              message: "texts must be non-empty strings",
            },
          };
        }
        if (text.length > MAX_TEXT_LENGTH) {
          return {
            ok: false,
            error: { code: "INVALID_ARGUMENT", message: "text is too long" },
          };
        }
      }

      deps.logger.info("embedding_model_not_ready", {
        textCount: payload.texts.length,
        model: payload.model ?? "default",
      });

      return {
        ok: false,
        error: { code: "MODEL_NOT_READY", message: "Embedding model not ready" },
      };
    },
  );

  deps.ipcMain.handle(
    "embedding:index",
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

