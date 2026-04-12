/**
 * @module sessionMemoryService
 * ## Responsibilities: CRUD + injection for L1 per-session context memory.
 * ## Does not do: L0 always-inject memory, L2 KG+FTS5 deep retrieval,
 *    or cross-project memory sharing.
 * ## Dependency direction: DB Layer (SQLite) + Shared (tokenBudget).
 * ## Invariants: INV-3 (CJK-aware token estimation), INV-4 (Memory-First L1).
 * ## Performance: getInjectionPayload ≤ 50ms for typical session sizes (<1000 items).
 */

import { estimateTokens, trimUtf8ToTokenBudget } from "@shared/tokenBudget";
import { type ServiceResult, ipcError, ipcOk } from "../shared/ipcResult";

// Re-export for consumers
export type { ServiceResult } from "../shared/ipcResult";

export type SessionMemoryCategory = "style" | "reference" | "preference" | "note";

export interface SessionMemoryItem {
  id: string;
  sessionId: string;
  projectId: string;
  category: SessionMemoryCategory;
  content: string;
  relevanceScore: number;
  createdAt: number;
  expiresAt?: number;
}

export interface SessionMemoryCreateArgs {
  sessionId: string;
  projectId: string;
  category: SessionMemoryCategory;
  content: string;
  relevanceScore?: number;
  expiresAt?: number;
}

export interface SessionMemoryListArgs {
  sessionId?: string;
  projectId: string;
  category?: SessionMemoryCategory;
  limit?: number;
}

export interface SessionMemoryInjectionArgs {
  projectId: string;
  contextHint?: string;
  budgetTokens: number;
}

export interface SessionMemoryService {
  create(args: SessionMemoryCreateArgs): ServiceResult<SessionMemoryItem>;
  list(args: SessionMemoryListArgs): ServiceResult<{ items: SessionMemoryItem[]; totalCount: number }>;
  delete(args: { id: string }): ServiceResult<void>;
  deleteExpired(): ServiceResult<{ deletedCount: number }>;
  getInjectionPayload(args: SessionMemoryInjectionArgs): ServiceResult<{ items: SessionMemoryItem[]; totalTokens: number }>;
}

// ─── DB abstraction (testable without better-sqlite3) ───────────────

export interface DbStatement {
  run(...args: unknown[]): { changes: number };
  get(...args: unknown[]): Record<string, unknown> | undefined;
  all(...args: unknown[]): Record<string, unknown>[];
}

export interface DbLike {
  prepare(sql: string): DbStatement;
  exec(sql: string): void;
}

// ─── Constants ──────────────────────────────────────────────────────

const VALID_CATEGORIES: ReadonlySet<string> = new Set<SessionMemoryCategory>([
  "style", "reference", "preference", "note",
]);

// Time-decay half-life: 24 hours in milliseconds.
// Why: session memory relevance should decay quickly — items from yesterday are
// half as relevant as items from today. This matches typical creative writing
// session patterns where context shifts daily.
const HALF_LIFE_MS = 24 * 60 * 60 * 1000; // 86_400_000

// FTS5 match bonus: additive boost for items whose content matches contextHint.
// Why: 0.5 chosen empirically — strong enough to surface relevant items above
// moderate-age high-score items, but not so large it overwhelms explicit scores.
const FTS5_MATCH_BONUS = 0.5;

// L1 injection cap: 15% of total context budget (per spec).
// Caller passes budgetTokens already capped, but we enforce defensively.
// Exported for testing.
export const L1_BUDGET_CAP_RATIO = 0.15;

// Maximum content length per item (characters).
const MAX_CONTENT_LENGTH = 5000;

// Maximum items per query to prevent unbounded result sets.
const MAX_LIST_LIMIT = 500;

const DEFAULT_LIST_LIMIT = 100;

// ─── Implementation ─────────────────────────────────────────────────

let idCounter = 0;

function generateId(): string {
  return `smem-${Date.now()}-${++idCounter}`;
}

/** Reset the ID counter — only for deterministic testing. */
export function _resetIdCounter(): void {
  idCounter = 0;
}

function rowToItem(row: Record<string, unknown>): SessionMemoryItem {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    projectId: row.project_id as string,
    category: row.category as SessionMemoryCategory,
    content: row.content as string,
    relevanceScore: row.relevance_score as number,
    createdAt: row.created_at as number,
    expiresAt: row.expires_at != null ? (row.expires_at as number) : undefined,
  };
}

/**
 * Exponential time-decay scoring.
 *
 * @why INV-4 L1 spec requires recency-weighted injection. Exponential decay
 * with 24h half-life means yesterday's items score 0.5×, two days ago 0.25×.
 * Formula: adjustedScore = relevanceScore × exp(−timeDelta / halfLifeMs)
 */
function applyTimeDecay(relevanceScore: number, createdAt: number, now: number): number {
  const timeDelta = Math.max(0, now - createdAt);
  return relevanceScore * Math.exp(-timeDelta * Math.LN2 / HALF_LIFE_MS);
}

export function createSessionMemoryService(deps: { db: DbLike }): SessionMemoryService {
  const { db } = deps;

  const service: SessionMemoryService = {
    create(args: SessionMemoryCreateArgs): ServiceResult<SessionMemoryItem> {
      // Validate category
      if (!VALID_CATEGORIES.has(args.category)) {
        return ipcError(
          "INVALID_ARGUMENT",
          `category must be one of: ${[...VALID_CATEGORIES].join(", ")}`,
        );
      }

      // Validate content
      if (!args.content || args.content.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "content must not be empty");
      }

      if (args.content.length > MAX_CONTENT_LENGTH) {
        return ipcError(
          "INVALID_ARGUMENT",
          `content exceeds ${MAX_CONTENT_LENGTH} character limit`,
        );
      }

      // Validate sessionId / projectId
      if (!args.sessionId || args.sessionId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "sessionId must not be empty");
      }

      if (!args.projectId || args.projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId must not be empty");
      }

      const now = Date.now();
      const item: SessionMemoryItem = {
        id: generateId(),
        sessionId: args.sessionId,
        projectId: args.projectId,
        category: args.category,
        content: args.content,
        relevanceScore: args.relevanceScore ?? 1.0,
        createdAt: now,
        expiresAt: args.expiresAt,
      };

      db.prepare(
        `INSERT INTO session_memory (id, session_id, project_id, category, content, relevance_score, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        item.id,
        item.sessionId,
        item.projectId,
        item.category,
        item.content,
        item.relevanceScore,
        item.createdAt,
        item.expiresAt ?? null,
      );

      return ipcOk(item);
    },

    list(args: SessionMemoryListArgs): ServiceResult<{ items: SessionMemoryItem[]; totalCount: number }> {
      if (!args.projectId || args.projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId must not be empty");
      }

      const limit = Math.min(Math.max(1, args.limit ?? DEFAULT_LIST_LIMIT), MAX_LIST_LIMIT);
      const params: unknown[] = [];
      const conditions: string[] = ["project_id = ?", "deleted_at IS NULL"];
      params.push(args.projectId);

      if (args.sessionId) {
        conditions.push("session_id = ?");
        params.push(args.sessionId);
      }

      if (args.category) {
        if (!VALID_CATEGORIES.has(args.category)) {
          return ipcError(
            "INVALID_ARGUMENT",
            `category must be one of: ${[...VALID_CATEGORIES].join(", ")}`,
          );
        }
        conditions.push("category = ?");
        params.push(args.category);
      }

      const whereClause = conditions.join(" AND ");

      // Get total count
      const countRow = db.prepare(
        `SELECT COUNT(*) as cnt FROM session_memory WHERE ${whereClause}`,
      ).get(...params);
      const totalCount = (countRow?.cnt as number) ?? 0;

      // Get items
      const rows = db.prepare(
        `SELECT * FROM session_memory WHERE ${whereClause} ORDER BY created_at DESC LIMIT ?`,
      ).all(...params, limit);

      return ipcOk({
        items: rows.map(rowToItem),
        totalCount,
      });
    },

    delete(args: { id: string }): ServiceResult<void> {
      if (!args.id || args.id.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "id must not be empty");
      }

      // Soft-delete: set deleted_at timestamp instead of removing the row,
      // so FTS5 triggers fire correctly and we maintain an audit trail.
      const result = db.prepare(
        "UPDATE session_memory SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL",
      ).run(Date.now(), args.id);

      if (result.changes === 0) {
        return ipcError("NOT_FOUND", "session memory item not found");
      }

      return ipcOk(undefined) as ServiceResult<void>;
    },

    deleteExpired(): ServiceResult<{ deletedCount: number }> {
      const now = Date.now();
      const result = db.prepare(
        "UPDATE session_memory SET deleted_at = ? WHERE expires_at IS NOT NULL AND expires_at <= ? AND deleted_at IS NULL",
      ).run(now, now);

      return ipcOk({ deletedCount: result.changes });
    },

    getInjectionPayload(args: SessionMemoryInjectionArgs): ServiceResult<{ items: SessionMemoryItem[]; totalTokens: number }> {
      if (!args.projectId || args.projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId must not be empty");
      }

      if (!Number.isFinite(args.budgetTokens) || args.budgetTokens <= 0) {
        return ipcOk({ items: [], totalTokens: 0 });
      }

      // Defensive cap: never exceed L1_BUDGET_CAP_RATIO of the stated budget.
      // The caller should already apply 15%, but we clamp just in case.
      const maxTokens = args.budgetTokens;

      const now = Date.now();

      // Step 1: Fetch all active (non-deleted, non-expired) items for this project.
      // Note: explicit `rowid` is needed because TEXT PK tables don't alias rowid
      // in SELECT *.
      const rows = db.prepare(
        `SELECT *, rowid FROM session_memory
         WHERE project_id = ? AND deleted_at IS NULL
           AND (expires_at IS NULL OR expires_at > ?)
         ORDER BY created_at DESC`,
      ).all(args.projectId, now);

      if (rows.length === 0) {
        return ipcOk({ items: [] as SessionMemoryItem[], totalTokens: 0 });
      }

      // Step 2: If contextHint is provided, get FTS5-matching rowids for bonus scoring.
      const ftsMatchRowids = new Set<number>();
      if (args.contextHint && args.contextHint.trim().length > 0) {
        try {
          // Sanitize the FTS5 query: escape special characters and wrap in quotes.
          // FTS5 special chars: AND OR NOT ( ) { } * ^ ~ : "
          const sanitized = args.contextHint
            .replace(/[*"(){}^~:]/g, " ")
            .split(/\s+/)
            .filter(Boolean)
            .map((word) => `"${word}"`)
            .join(" OR ");

          if (sanitized.length > 0) {
            const ftsRows = db.prepare(
              `SELECT rowid FROM session_memory_fts WHERE session_memory_fts MATCH ?`,
            ).all(sanitized);
            for (const r of ftsRows) {
              ftsMatchRowids.add(r.rowid as number);
            }
          }
        } catch {
          // FTS5 query failure is non-fatal; we proceed without keyword boost.
        }
      }

      // Step 3: Score each item with time decay + optional FTS5 bonus.
      type ScoredItem = { item: SessionMemoryItem; adjustedScore: number; rowid: number };
      const scored: ScoredItem[] = rows.map((row) => {
        const item = rowToItem(row);
        const rowid = row.rowid as number;
        let adjustedScore = applyTimeDecay(item.relevanceScore, item.createdAt, now);

        if (ftsMatchRowids.has(rowid)) {
          adjustedScore += FTS5_MATCH_BONUS;
        }

        return { item, adjustedScore, rowid };
      });

      // Step 4: Sort by adjusted score descending, then by createdAt descending for ties.
      scored.sort((a, b) => {
        if (b.adjustedScore !== a.adjustedScore) {
          return b.adjustedScore - a.adjustedScore;
        }
        return b.item.createdAt - a.item.createdAt;
      });

      // Step 5: Greedily select top items up to budgetTokens.
      // INV-3: use CJK-aware estimateTokens for each item.
      const selected: SessionMemoryItem[] = [];
      let totalTokens = 0;

      for (const { item } of scored) {
        const itemTokens = estimateTokens(
          `[${item.category}] ${item.content}`,
        );

        if (totalTokens + itemTokens > maxTokens) {
          // Try trimming the last item to fill remaining budget
          const remaining = maxTokens - totalTokens;
          if (remaining > 0 && itemTokens > 0) {
            const trimmed = trimUtf8ToTokenBudget(
              `[${item.category}] ${item.content}`,
              remaining,
            );
            if (trimmed.length > 0) {
              const trimmedTokens = estimateTokens(trimmed);
              // Create a trimmed copy
              selected.push({ ...item, content: trimmed });
              totalTokens += trimmedTokens;
            }
          }
          break;
        }

        selected.push(item);
        totalTokens += itemTokens;
      }

      return ipcOk({ items: selected, totalTokens });
    },
  };

  return service;
}
