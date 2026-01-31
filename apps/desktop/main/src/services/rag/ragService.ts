import type Database from "better-sqlite3";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../../logging/logger";
import { createFtsService } from "../search/ftsService";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type RagRetrieveItem = {
  sourceRef: string;
  snippet: string;
  score: number;
};

export type RagRetrieveDiagnostics = {
  budgetTokens: number;
  usedTokens: number;
  droppedCount: number;
  trimmedCount: number;
  mode: "fulltext";
  degradedFrom?: "semantic";
  reason?: string;
};

export type RagService = {
  retrieve: (args: {
    projectId: string;
    queryText: string;
    limit?: number;
    budgetTokens?: number;
  }) => ServiceResult<{ items: RagRetrieveItem[]; diagnostics: RagRetrieveDiagnostics }>;
};

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 50;

const DEFAULT_BUDGET_TOKENS = 800;
const MIN_BUDGET_TOKENS = 50;
const MAX_BUDGET_TOKENS = 8000;

/**
 * Build a stable IPC error object.
 *
 * Why: services must return deterministic error codes/messages for IPC tests.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

/**
 * Estimate token count from UTF-8 bytes.
 *
 * Why: V1 avoids tokenizer deps; byte-based estimate is stable and cheap.
 */
function estimateTokens(text: string): number {
  const bytes = Buffer.from(text, "utf8").byteLength;
  return Math.ceil(bytes / 4);
}

/**
 * Normalize and validate a limit.
 *
 * Why: rag retrieve must stay fast and predictable.
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
 * Normalize and validate a token budget.
 *
 * Why: budget must be deterministic and guard against pathological payloads.
 */
function normalizeBudgetTokens(budgetTokens?: number): ServiceResult<number> {
  if (typeof budgetTokens === "undefined") {
    return { ok: true, data: DEFAULT_BUDGET_TOKENS };
  }
  if (!Number.isFinite(budgetTokens) || !Number.isInteger(budgetTokens)) {
    return ipcError("INVALID_ARGUMENT", "budgetTokens must be an integer");
  }
  if (budgetTokens < MIN_BUDGET_TOKENS) {
    return ipcError("INVALID_ARGUMENT", "budgetTokens is too small", {
      min: MIN_BUDGET_TOKENS,
    });
  }
  if (budgetTokens > MAX_BUDGET_TOKENS) {
    return ipcError("INVALID_ARGUMENT", "budgetTokens is too large", {
      max: MAX_BUDGET_TOKENS,
    });
  }
  return { ok: true, data: budgetTokens };
}

/**
 * Build a portable source reference for retrieved items.
 *
 * Why: IPC must not leak absolute paths; references must be stable across machines.
 */
function buildSourceRef(args: { documentId: string; chunkId: string }): string {
  return `doc:${args.documentId}#chunk:${args.chunkId}`;
}

/**
 * Trim a snippet to fit in the remaining token budget.
 *
 * Why: keep rag responses bounded and stable without tokenizer deps.
 */
function trimToTokenBudget(args: { text: string; tokenBudget: number }): {
  text: string;
  usedTokens: number;
  trimmed: boolean;
} {
  const maxBytes = Math.max(0, Math.floor(args.tokenBudget * 4));
  const buf = Buffer.from(args.text, "utf8");
  if (buf.byteLength <= maxBytes) {
    const usedTokens = estimateTokens(args.text);
    return { text: args.text, usedTokens, trimmed: false };
  }

  const sliced = buf.subarray(0, maxBytes);
  const trimmedText = sliced.toString("utf8");
  const usedTokens = estimateTokens(trimmedText);
  return { text: trimmedText, usedTokens, trimmed: true };
}

/**
 * Create a minimal RAG retrieval service (FTS fallback).
 *
 * Why: CNWB-REQ-100 requires a best-effort retrieve path that can be visualized
 * in the retrieved layer even when semantic/vector store is not ready on Windows.
 */
export function createRagService(deps: {
  db: Database.Database;
  logger: Logger;
}): RagService {
  const fts = createFtsService({ db: deps.db, logger: deps.logger });

  return {
    retrieve: (args) => {
      const limitRes = normalizeLimit(args.limit);
      if (!limitRes.ok) {
        return limitRes;
      }
      const budgetRes = normalizeBudgetTokens(args.budgetTokens);
      if (!budgetRes.ok) {
        return budgetRes;
      }

      const fulltextRes = fts.searchFulltext({
        projectId: args.projectId,
        query: args.queryText,
        limit: limitRes.data,
      });
      if (!fulltextRes.ok) {
        return fulltextRes;
      }

      let remainingTokens = budgetRes.data;
      let usedTokens = 0;
      let droppedCount = 0;
      let trimmedCount = 0;

      const items: RagRetrieveItem[] = [];
      for (const hit of fulltextRes.data.items) {
        const sourceRef = buildSourceRef({
          documentId: hit.documentId,
          chunkId: "0",
        });
        const rawSnippet = `${hit.title}\n${hit.snippet}`.trimEnd();

        if (remainingTokens <= 0) {
          droppedCount += 1;
          continue;
        }

        const trimmed = trimToTokenBudget({
          text: rawSnippet,
          tokenBudget: remainingTokens,
        });
        if (trimmed.text.trim().length === 0) {
          droppedCount += 1;
          continue;
        }

        if (trimmed.trimmed) {
          trimmedCount += 1;
        }

        items.push({
          sourceRef,
          snippet: trimmed.text,
          score: hit.score,
        });

        usedTokens += trimmed.usedTokens;
        remainingTokens = Math.max(0, budgetRes.data - usedTokens);
      }

      return {
        ok: true,
        data: {
          items,
          diagnostics: {
            budgetTokens: budgetRes.data,
            usedTokens,
            droppedCount,
            trimmedCount,
            mode: "fulltext",
            degradedFrom: "semantic",
            reason: "semantic/embedding not ready; using FTS fallback",
          },
        },
      };
    },
  };
}

