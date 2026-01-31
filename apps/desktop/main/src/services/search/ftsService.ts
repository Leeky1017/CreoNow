import type Database from "better-sqlite3";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../../logging/logger";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type FulltextSearchItem = {
  documentId: string;
  title: string;
  snippet: string;
  score: number;
};

export type FtsService = {
  searchFulltext: (args: {
    projectId: string;
    query: string;
    limit?: number;
  }) => ServiceResult<{ items: FulltextSearchItem[] }>;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_QUERY_LENGTH = 1024;

/**
 * Build a stable IPC error object.
 *
 * Why: services must return deterministic error codes/messages for IPC tests.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

/**
 * Normalize and validate a user query.
 *
 * Why: empty/overlong queries must fail deterministically with INVALID_ARGUMENT.
 */
function normalizeQuery(query: string): ServiceResult<string> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return ipcError("INVALID_ARGUMENT", "query is required");
  }
  if (trimmed.length > MAX_QUERY_LENGTH) {
    return ipcError("INVALID_ARGUMENT", "query is too long", {
      maxLength: MAX_QUERY_LENGTH,
    });
  }
  return { ok: true, data: trimmed };
}

/**
 * Normalize and validate a limit.
 *
 * Why: uncontrolled limits can cause slow queries and unstable UI.
 */
function normalizeLimit(limit?: number): ServiceResult<number> {
  if (typeof limit === "undefined") {
    return { ok: true, data: DEFAULT_LIMIT };
  }
  if (!Number.isFinite(limit) || !Number.isInteger(limit)) {
    return ipcError("INVALID_ARGUMENT", "limit must be an integer");
  }
  if (limit <= 0) {
    return ipcError("INVALID_ARGUMENT", "limit must be positive");
  }
  if (limit > MAX_LIMIT) {
    return ipcError("INVALID_ARGUMENT", "limit is too large", {
      maxLimit: MAX_LIMIT,
    });
  }
  return { ok: true, data: limit };
}

/**
 * Best-effort classify a full-text query error as a user input error.
 *
 * Why: invalid FTS syntax must map to INVALID_ARGUMENT (CNWB-REQ-100).
 */
function isFtsSyntaxError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("fts5:") ||
    m.includes("syntax error") ||
    m.includes("unterminated") ||
    m.includes("malformed") ||
    m.includes("parse error")
  );
}

type FulltextRow = {
  documentId: string;
  title: string;
  snippet: string;
  score: number;
};

/**
 * Create a minimal full-text search (FTS5) service.
 *
 * Why: keep DB details inside main process and expose deterministic errors over IPC.
 */
export function createFtsService(deps: {
  db: Database.Database;
  logger: Logger;
}): FtsService {
  return {
    searchFulltext: (args) => {
      const queryRes = normalizeQuery(args.query);
      if (!queryRes.ok) {
        return queryRes;
      }
      const limitRes = normalizeLimit(args.limit);
      if (!limitRes.ok) {
        return limitRes;
      }

      try {
        const rows = deps.db
          .prepare<
            [string, string, number],
            FulltextRow
          >(
            `SELECT
              document_id as documentId,
              title as title,
              snippet(documents_fts, -1, '', '', '…', 24) as snippet,
              (-bm25(documents_fts)) as score
            FROM documents_fts
            WHERE project_id = ? AND documents_fts MATCH ?
            ORDER BY bm25(documents_fts)
            LIMIT ?`,
          )
          .all(args.projectId, queryRes.data, limitRes.data);

        return { ok: true, data: { items: rows } };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isFtsSyntaxError(message)) {
          return ipcError("INVALID_ARGUMENT", "Invalid fulltext query syntax", {
            cause: message,
          });
        }

        deps.logger.error("fts_search_failed", {
          code: "DB_ERROR",
          message,
        });
        return ipcError("DB_ERROR", "Fulltext search failed");
      }
    },
  };
}
