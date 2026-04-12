/**
 * @module sessionMemory
 * ## Responsibilities: L1 session-aware context memory — CRUD, FTS5 keyword
 *   retrieval, time-decay relevance scoring, and 15% context-budget injection.
 * ## Does not do: vector/semantic search (prohibited by INV-4), cross-session
 *   aggregation, or distillation (P4+).
 * ## Dependency direction: DB Layer + Shared. No Renderer imports.
 * ## Invariants: INV-3 (CJK token estimation), INV-4 (Memory-First, FTS5 only).
 * ## Performance: all queries hit indexed columns; FTS5 match is sub-10ms on
 *   typical session size (~200 rows). Injection cap enforced before token
 *   estimation to keep context assembly within 250ms SLO.
 */

import { randomUUID } from "node:crypto";

import type Database from "better-sqlite3";
import { estimateTokens } from "@shared/tokenBudget";

import type { Logger } from "../../logging/logger";
import { ipcError, type ServiceResult } from "../shared/ipcResult";

export type { ServiceResult };

// ─── Public types ────────────────────────────────────────────────────────────

export type SessionMemoryCategory = "style" | "reference" | "preference" | "note";

export type SessionMemoryEntry = {
  id: string;
  sessionId: string;
  projectId: string;
  category: SessionMemoryCategory;
  content: string;
  /** 0..1 relevance hint; stored but overridden at query time by FTS5 + decay. */
  relevanceScore: number;
  createdAt: string;
  expiresAt: string | null;
};

export type CreateSessionMemoryArgs = {
  sessionId: string;
  projectId: string;
  category: SessionMemoryCategory;
  content: string;
  /** Override initial relevance (default: 0.5). */
  relevanceScore?: number;
  /** ISO-8601 datetime after which this entry is excluded from injection. */
  expiresAt?: string;
};

export type UpdateSessionMemoryArgs = {
  id: string;
  content?: string;
  relevanceScore?: number;
  expiresAt?: string | null;
};

export type SessionMemoryQueryArgs = {
  sessionId?: string;
  projectId?: string;
  category?: SessionMemoryCategory;
  /** If supplied, FTS5 keyword search narrows results before decay-sort. */
  queryText?: string;
  limit?: number;
};

export type SessionMemoryInjectionArgs = {
  sessionId: string;
  projectId: string;
  queryText?: string;
  /**
   * Hard cap: L1 content must not exceed 15% of total context budget.
   *
   * Why: spec requirement — session memory is supplemental, not primary.
   * Exceeding 15% crowds out KG (rules) and immediate layers which directly
   * affect writing quality. Value comes from task spec P3-04 §Injection Strategy.
   */
  totalContextBudgetTokens: number;
};

export type SessionMemoryInjection = {
  entries: SessionMemoryEntry[];
  injectedText: string;
  tokenCount: number;
  /** True when budget cap truncated the full result set. */
  truncated: boolean;
};

export type SessionMemoryService = {
  create: (args: CreateSessionMemoryArgs) => ServiceResult<SessionMemoryEntry>;
  read: (id: string) => ServiceResult<SessionMemoryEntry>;
  update: (args: UpdateSessionMemoryArgs) => ServiceResult<SessionMemoryEntry>;
  remove: (id: string) => ServiceResult<void>;
  list: (args: SessionMemoryQueryArgs) => ServiceResult<SessionMemoryEntry[]>;
  /** Build an injection-ready text block respecting the 15% budget cap. */
  injectForContext: (args: SessionMemoryInjectionArgs) => ServiceResult<SessionMemoryInjection>;
  /** Remove expired entries for the given project. */
  purgeExpired: (projectId: string) => ServiceResult<{ removed: number }>;
};

// ─── Internal row type ───────────────────────────────────────────────────────

type SessionMemoryRow = {
  id: string;
  session_id: string;
  project_id: string;
  category: string;
  content: string;
  relevance_score: number;
  created_at: string;
  expires_at: string | null;
  fts_rank?: number;
};

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * L1 injection cap: 15% of total context budget.
 *
 * Why: spec §Injection Strategy — "L1 content must not exceed 15% of total
 * context budget". Keeps primary layers (KG rules, document immediate) dominant.
 */
const L1_BUDGET_CAP_RATIO = 0.15;

/**
 * Time-decay half-life: 24 hours in seconds.
 *
 * Why: sessions within the same day should have near-full weight; entries from
 * several days ago should be de-prioritised but not silently dropped. A 24h
 * half-life achieves gradual fading without a hard expiry cliff.
 */
const DECAY_HALF_LIFE_SECONDS = 24 * 60 * 60;

/**
 * Maximum entries returned by list/injection before budget truncation.
 *
 * Why: prevents O(n) token estimation on very large session caches.
 * 100 entries × ~50 tokens avg = ~5000 tokens max before cap applies.
 */
const MAX_ENTRIES_PER_QUERY = 100;

const INJECTION_HEADER = "[会话记忆 — L1 自动注入]";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rowToEntry(row: SessionMemoryRow): SessionMemoryEntry {
  return {
    id: row.id,
    sessionId: row.session_id,
    projectId: row.project_id,
    category: row.category as SessionMemoryCategory,
    content: row.content,
    relevanceScore: row.relevance_score,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Compute time-decay multiplier for an entry.
 *
 * Uses exponential decay: score = base * 0.5^(age_seconds / half_life)
 *
 * Why exponential decay over linear: avoids sudden relevance cliff at expiry;
 * very recent entries maintain near-full weight; week-old entries fade to ~1%.
 */
function decayScore(baseScore: number, createdAtIso: string): number {
  const nowMs = Date.now();
  const createdMs = new Date(createdAtIso).getTime();
  if (Number.isNaN(createdMs)) {
    return baseScore;
  }
  const ageSeconds = Math.max(0, (nowMs - createdMs) / 1000);
  const decayFactor = Math.pow(0.5, ageSeconds / DECAY_HALF_LIFE_SECONDS);
  return baseScore * decayFactor;
}

function buildInjectionText(entries: SessionMemoryEntry[]): string {
  if (entries.length === 0) {
    return "";
  }
  const lines = entries.map((e) => `[${e.category}] ${e.content}`);
  return `${INJECTION_HEADER}\n${lines.join("\n")}`;
}

function isExpired(entry: SessionMemoryEntry): boolean {
  if (!entry.expiresAt) {
    return false;
  }
  return new Date(entry.expiresAt).getTime() <= Date.now();
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createSessionMemoryService(deps: {
  db: Database.Database;
  logger: Logger;
}): SessionMemoryService {
  const { db, logger } = deps;

  function ensureSchema(): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS session_memory (
        id               TEXT PRIMARY KEY,
        session_id       TEXT NOT NULL,
        project_id       TEXT NOT NULL,
        category         TEXT NOT NULL CHECK(category IN ('style', 'reference', 'preference', 'note')),
        content          TEXT NOT NULL,
        relevance_score  REAL NOT NULL DEFAULT 0.5,
        created_at       TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at       TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_session_memory_session_id ON session_memory (session_id);
      CREATE INDEX IF NOT EXISTS idx_session_memory_project_id ON session_memory (project_id);
      CREATE INDEX IF NOT EXISTS idx_session_memory_category   ON session_memory (category);
      CREATE INDEX IF NOT EXISTS idx_session_memory_created_at ON session_memory (created_at DESC);
      CREATE VIRTUAL TABLE IF NOT EXISTS session_memory_fts
        USING fts5(content, content=session_memory, content_rowid=rowid);
      CREATE TRIGGER IF NOT EXISTS session_memory_fts_ai
        AFTER INSERT ON session_memory BEGIN
          INSERT INTO session_memory_fts(rowid, content) VALUES (new.rowid, new.content);
        END;
      CREATE TRIGGER IF NOT EXISTS session_memory_fts_au
        AFTER UPDATE ON session_memory BEGIN
          INSERT INTO session_memory_fts(session_memory_fts, rowid, content)
            VALUES ('delete', old.rowid, old.content);
          INSERT INTO session_memory_fts(rowid, content) VALUES (new.rowid, new.content);
        END;
      CREATE TRIGGER IF NOT EXISTS session_memory_fts_ad
        AFTER DELETE ON session_memory BEGIN
          INSERT INTO session_memory_fts(session_memory_fts, rowid, content)
            VALUES ('delete', old.rowid, old.content);
        END;
    `);
  }

  // Idempotent schema bootstrap — runs once per factory call.
  // Why: allows the service to function in test environments that do not run
  // the full SQL migration chain (init.ts).
  try {
    ensureSchema();
  } catch (err) {
    // Any error here is a real bootstrap failure; CREATE IF NOT EXISTS should
    // not throw for pre-existing schema objects.
    logger.error("session_memory_schema_bootstrap", {
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  // ── Prepared statements (lazy init to avoid schema-not-ready race) ─────────

  const stmtInsert = db.prepare<[string, string, string, string, string, number, string, string | null]>(`
    INSERT INTO session_memory
      (id, session_id, project_id, category, content, relevance_score, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const stmtSelectById = db.prepare<[string], SessionMemoryRow>(`
    SELECT id, session_id, project_id, category, content, relevance_score, created_at, expires_at
    FROM session_memory WHERE id = ?
  `);

  const stmtUpdateFull = db.prepare<[string, number, string | null, string]>(`
    UPDATE session_memory
    SET content = ?, relevance_score = ?, expires_at = ?
    WHERE id = ?
  `);

  const stmtDeleteById = db.prepare<[string]>(`DELETE FROM session_memory WHERE id = ?`);

  const stmtListBySession = db.prepare<[string, number], SessionMemoryRow>(`
    SELECT id, session_id, project_id, category, content, relevance_score, created_at, expires_at
    FROM session_memory
    WHERE session_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const stmtListByProject = db.prepare<[string, number], SessionMemoryRow>(`
    SELECT id, session_id, project_id, category, content, relevance_score, created_at, expires_at
    FROM session_memory
    WHERE project_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const stmtListBySessionAndCategory = db.prepare<[string, string, number], SessionMemoryRow>(`
    SELECT id, session_id, project_id, category, content, relevance_score, created_at, expires_at
    FROM session_memory
    WHERE session_id = ? AND category = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const stmtListByProjectAndCategory = db.prepare<[string, string, number], SessionMemoryRow>(`
    SELECT id, session_id, project_id, category, content, relevance_score, created_at, expires_at
    FROM session_memory
    WHERE project_id = ? AND category = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const stmtPurgeExpired = db.prepare<[string, string]>(`
    DELETE FROM session_memory
    WHERE project_id = ? AND expires_at IS NOT NULL AND expires_at <= ?
  `);

  const stmtListBySessionAndProject = db.prepare<[string, string, number], SessionMemoryRow>(`
    SELECT id, session_id, project_id, category, content, relevance_score, created_at, expires_at
    FROM session_memory
    WHERE session_id = ? AND project_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const stmtListBySessionAndProjectAndCategory = db.prepare<[string, string, string, number], SessionMemoryRow>(`
    SELECT id, session_id, project_id, category, content, relevance_score, created_at, expires_at
    FROM session_memory
    WHERE session_id = ? AND project_id = ? AND category = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  // ── FTS5 search helper ────────────────────────────────────────────────────

  /**
   * Escape a raw user string for FTS5 literal matching.
   *
   * FTS5 treats *, ", AND, OR, NOT, NEAR, ^, and parentheses as operators.
   * Wrapping the entire input in double-quotes forces literal interpretation;
   * internal double-quotes must be escaped by doubling them.
   *
   * Without this, inputs like `style OR note` would activate FTS5 boolean
   * operators, and unmatched `"` or lone `*` would throw a parse error.
   */
  function escapeFts5(raw: string): string {
    return '"' + raw.replace(/"/g, '""') + '"';
  }

  /**
   * FTS5 keyword search with mandatory session/project scoping.
   *
   * @returns ServiceResult — errors are propagated to the caller, never
   *   silently swallowed (INV-10: errors must not lose context; §七 ban on
   *   silent catch returning default values).
   */
  function ftsSearch(args: {
    sessionId?: string;
    projectId?: string;
    queryText: string;
    limit: number;
  }): ServiceResult<SessionMemoryRow[]> {
    try {
      // FTS5 match via content-rowid join. The base table join restores all
      // columns (fts only stores content).
      // Session/project filters are pushed into SQL to avoid LIMIT truncating
      // results before the filter — the indexes on session_id and project_id
      // make this efficient.
      const rows = db.prepare<[string, string | null, string | null, string | null, string | null, number], SessionMemoryRow>(`
        SELECT sm.id, sm.session_id, sm.project_id, sm.category, sm.content,
               sm.relevance_score, sm.created_at, sm.expires_at,
               rank AS fts_rank
        FROM session_memory sm
        JOIN session_memory_fts fts ON sm.rowid = fts.rowid
        WHERE session_memory_fts MATCH ?
          AND (? IS NULL OR sm.session_id = ?)
          AND (? IS NULL OR sm.project_id = ?)
        ORDER BY fts_rank
        LIMIT ?
      `).all(
        escapeFts5(args.queryText),
        args.sessionId ?? null, args.sessionId ?? null,
        args.projectId ?? null, args.projectId ?? null,
        args.limit,
      );

      return { ok: true, data: rows };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("session_memory_fts_error", {
        message,
        queryText: args.queryText,
      });
      return ipcError("DB_ERROR", `FTS5 search failed: ${message}`);
    }
  }

  // ── Service implementation ────────────────────────────────────────────────

  function create(args: CreateSessionMemoryArgs): ServiceResult<SessionMemoryEntry> {
    if (!args.sessionId || !args.projectId) {
      return ipcError("INVALID_ARGUMENT", "sessionId and projectId are required");
    }
    if (!args.content || args.content.trim() === "") {
      return ipcError("INVALID_ARGUMENT", "content must not be empty");
    }

    const id = randomUUID();
    const createdAt = nowIso();
    const score = Math.max(0, Math.min(1, args.relevanceScore ?? 0.5));

    try {
      stmtInsert.run(
        id,
        args.sessionId,
        args.projectId,
        args.category,
        args.content.trim(),
        score,
        createdAt,
        args.expiresAt ?? null,
      );
    } catch (err) {
      logger.error("session_memory_create_failed", {
        message: err instanceof Error ? err.message : String(err),
        sessionId: args.sessionId,
      });
      return ipcError("DB_ERROR", "Failed to create session memory entry");
    }

    return {
      ok: true,
      data: {
        id,
        sessionId: args.sessionId,
        projectId: args.projectId,
        category: args.category,
        content: args.content.trim(),
        relevanceScore: score,
        createdAt,
        expiresAt: args.expiresAt ?? null,
      },
    };
  }

  function read(id: string): ServiceResult<SessionMemoryEntry> {
    const row = stmtSelectById.get(id);
    if (!row) {
      return ipcError("NOT_FOUND", `session memory entry not found: ${id}`);
    }
    return { ok: true, data: rowToEntry(row) };
  }

  function update(args: UpdateSessionMemoryArgs): ServiceResult<SessionMemoryEntry> {
    const existing = stmtSelectById.get(args.id);
    if (!existing) {
      return ipcError("NOT_FOUND", `session memory entry not found: ${args.id}`);
    }

    const newContent = args.content !== undefined ? args.content.trim() : existing.content;
    if (!newContent) {
      return ipcError("INVALID_ARGUMENT", "content must not be empty");
    }
    const newScore =
      args.relevanceScore !== undefined
        ? Math.max(0, Math.min(1, args.relevanceScore))
        : existing.relevance_score;
    const newExpires =
      "expiresAt" in args ? (args.expiresAt ?? null) : existing.expires_at;

    try {
      stmtUpdateFull.run(newContent, newScore, newExpires, args.id);
    } catch (err) {
      logger.error("session_memory_update_failed", {
        message: err instanceof Error ? err.message : String(err),
        id: args.id,
      });
      return ipcError("DB_ERROR", "Failed to update session memory entry");
    }

    const updated = stmtSelectById.get(args.id);
    if (!updated) {
      return ipcError("DB_ERROR", "Entry disappeared after update");
    }
    return { ok: true, data: rowToEntry(updated) };
  }

  function remove(id: string): ServiceResult<void> {
    const existing = stmtSelectById.get(id);
    if (!existing) {
      return ipcError("NOT_FOUND", `session memory entry not found: ${id}`);
    }
    try {
      stmtDeleteById.run(id);
    } catch (err) {
      logger.error("session_memory_delete_failed", {
        message: err instanceof Error ? err.message : String(err),
        id,
      });
      return ipcError("DB_ERROR", "Failed to delete session memory entry");
    }
    return { ok: true, data: undefined };
  }

  function list(args: SessionMemoryQueryArgs): ServiceResult<SessionMemoryEntry[]> {
    const limit = Math.max(1, Math.min(MAX_ENTRIES_PER_QUERY, args.limit ?? MAX_ENTRIES_PER_QUERY));
    const hasQueryText =
      typeof args.queryText === "string" && args.queryText.trim().length > 0;

    try {
      let rows: SessionMemoryRow[];

      if (hasQueryText) {
        // FTS5 path: keyword matching (INV-4 compliant).
        // Scope guard: at least one of sessionId/projectId must be provided to
        // prevent cross-session/cross-project data leakage (F2 audit finding).
        if (!args.sessionId && !args.projectId) {
          return ipcError("INVALID_ARGUMENT", "at least sessionId or projectId is required for FTS queries");
        }
        const ftsResult = ftsSearch({
          sessionId: args.sessionId,
          projectId: args.projectId,
          queryText: args.queryText!.trim(),
          limit,
        });
        // Propagate FTS errors (INV-10: errors must not lose context)
        if (!ftsResult.ok) {
          return ftsResult;
        }
        rows = ftsResult.data;
      } else if (args.sessionId && args.projectId && args.category) {
        rows = stmtListBySessionAndProjectAndCategory.all(
          args.sessionId,
          args.projectId,
          args.category,
          limit,
        );
      } else if (args.sessionId && args.projectId) {
        rows = stmtListBySessionAndProject.all(args.sessionId, args.projectId, limit);
      } else if (args.sessionId && args.category) {
        rows = stmtListBySessionAndCategory.all(args.sessionId, args.category, limit);
      } else if (args.projectId && args.category) {
        rows = stmtListByProjectAndCategory.all(args.projectId, args.category, limit);
      } else if (args.sessionId) {
        rows = stmtListBySession.all(args.sessionId, limit);
      } else if (args.projectId) {
        rows = stmtListByProject.all(args.projectId, limit);
      } else {
        return ipcError("INVALID_ARGUMENT", "at least sessionId or projectId is required");
      }

      // Filter expired entries at read time (belt-and-suspenders alongside purgeExpired)
      const rankedEntries = rows
        .map((row) => ({
          entry: rowToEntry(row),
          ftsRank: row.fts_rank,
        }))
        .filter(({ entry }) => !isExpired(entry));

      if (hasQueryText) {
        // FTS relevance remains primary; time decay is a secondary tiebreaker
        // to satisfy spec-level "指数时间衰减" ordering requirements.
        rankedEntries.sort((a, b) => {
          const rankA = Number.isFinite(a.ftsRank) ? (a.ftsRank as number) : Number.POSITIVE_INFINITY;
          const rankB = Number.isFinite(b.ftsRank) ? (b.ftsRank as number) : Number.POSITIVE_INFINITY;
          if (rankA !== rankB) {
            return rankA - rankB;
          }
          const scoreA = decayScore(a.entry.relevanceScore, a.entry.createdAt);
          const scoreB = decayScore(b.entry.relevanceScore, b.entry.createdAt);
          return scoreB - scoreA;
        });
      } else {
        rankedEntries.sort((a, b) => {
          const scoreA = decayScore(a.entry.relevanceScore, a.entry.createdAt);
          const scoreB = decayScore(b.entry.relevanceScore, b.entry.createdAt);
          return scoreB - scoreA;
        });
      }

      return { ok: true, data: rankedEntries.map(({ entry }) => entry) };
    } catch (err) {
      logger.error("session_memory_list_failed", {
        message: err instanceof Error ? err.message : String(err),
      });
      return ipcError("DB_ERROR", "Failed to list session memory entries");
    }
  }

  function injectForContext(args: SessionMemoryInjectionArgs): ServiceResult<SessionMemoryInjection> {
    if (!args.sessionId || !args.projectId) {
      return ipcError("INVALID_ARGUMENT", "sessionId and projectId are required");
    }
    if (!Number.isFinite(args.totalContextBudgetTokens) || args.totalContextBudgetTokens <= 0) {
      return ipcError("INVALID_ARGUMENT", "totalContextBudgetTokens must be a positive finite number");
    }

    /**
     * 15% cap: prevents L1 from crowding rules/KG/immediate layers.
     *
     * Why: spec §Injection Strategy — "L1 content must not exceed 15% of
     * total context budget". The cap is applied in tokens (not characters)
     * using INV-3 CJK-aware estimation so CJK-heavy sessions are treated fairly.
     */
    const maxTokens = Math.floor(args.totalContextBudgetTokens * L1_BUDGET_CAP_RATIO);

    const listResult = list({
      sessionId: args.sessionId,
      projectId: args.projectId,
      queryText: args.queryText,
      limit: MAX_ENTRIES_PER_QUERY,
    });

    if (!listResult.ok) {
      return listResult;
    }

    const candidateEntries = listResult.data;
    const selectedEntries: SessionMemoryEntry[] = [];
    let usedTokens = 0;
    let truncated = false;

    const headerTokens = estimateTokens(INJECTION_HEADER);

    for (const entry of candidateEntries) {
      const lineText = `[${entry.category}] ${entry.content}`;
      const lineTokens = estimateTokens(lineText);
      const wouldUse = usedTokens === 0 ? headerTokens + lineTokens : usedTokens + lineTokens;

      if (wouldUse > maxTokens) {
        truncated = true;
        break;
      }

      selectedEntries.push(entry);
      usedTokens = wouldUse;
    }

    const injectedText = buildInjectionText(selectedEntries);
    const tokenCount = selectedEntries.length > 0 ? estimateTokens(injectedText) : 0;

    logger.info("session_memory_inject", {
      sessionId: args.sessionId,
      projectId: args.projectId,
      candidateCount: candidateEntries.length,
      selectedCount: selectedEntries.length,
      tokenCount,
      maxTokens,
      truncated,
    });

    return {
      ok: true,
      data: {
        entries: selectedEntries,
        injectedText,
        tokenCount,
        truncated,
      },
    };
  }

  function purgeExpired(projectId: string): ServiceResult<{ removed: number }> {
    if (!projectId) {
      return ipcError("INVALID_ARGUMENT", "projectId is required");
    }
    try {
      const result = stmtPurgeExpired.run(projectId, nowIso()) as { changes: number };
      logger.info("session_memory_purge_expired", {
        projectId,
        removed: result.changes,
      });
      return { ok: true, data: { removed: result.changes } };
    } catch (err) {
      logger.error("session_memory_purge_failed", {
        message: err instanceof Error ? err.message : String(err),
        projectId,
      });
      return ipcError("DB_ERROR", "Failed to purge expired session memory entries");
    }
  }

  return { create, read, update, remove, list, injectForContext, purgeExpired };
}

// Re-export decayScore for unit-test access (white-box testing of scoring logic).
export { decayScore, L1_BUDGET_CAP_RATIO, DECAY_HALF_LIFE_SECONDS };
