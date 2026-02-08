import { randomUUID } from "node:crypto";

import type Database from "better-sqlite3";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../../logging/logger";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_WRITE_ATTEMPTS = 3;
const MIN_RECALL_LIMIT = 3;
const MAX_RECALL_LIMIT = 5;

export const EPISODIC_ACTIVE_BUDGET = 1_000;
export const EPISODIC_COMPRESSED_BUDGET = 5_000;
export const SEMANTIC_RULE_BUDGET = 200;

const EPISODIC_TTL_DAYS = 180;
const COMPRESSED_TTL_DAYS = 365;

export type ImplicitSignal =
  | "DIRECT_ACCEPT"
  | "LIGHT_EDIT"
  | "HEAVY_REWRITE"
  | "FULL_REJECT"
  | "UNDO_AFTER_ACCEPT"
  | "REPEATED_SCENE_SKILL";

export const IMPLICIT_SIGNAL_WEIGHTS: Readonly<Record<ImplicitSignal, number>> =
  {
    DIRECT_ACCEPT: 1,
    LIGHT_EDIT: 0.45,
    HEAVY_REWRITE: -0.45,
    FULL_REJECT: -0.8,
    UNDO_AFTER_ACCEPT: -1,
    REPEATED_SCENE_SKILL: 0.15,
  };

export type WorkingMemoryLayerItem = {
  id: string;
  projectId: string;
  sessionId: string;
  kind: string;
  tokenCount: number;
  importance: number;
  createdAt: number;
  updatedAt: number;
  content: string;
};

export type EpisodeRecord = {
  id: string;
  projectId: string;
  scope: "project";
  version: 1;
  chapterId: string;
  sceneType: string;
  skillUsed: string;
  inputContext: string;
  candidates: string[];
  selectedIndex: number;
  finalText: string;
  explicit?: string;
  editDistance: number;
  implicitSignal: ImplicitSignal;
  implicitWeight: number;
  importance: number;
  recallCount: number;
  lastRecalledAt?: number;
  compressed: boolean;
  userConfirmed: boolean;
  createdAt: number;
  updatedAt: number;
};

export type SemanticMemoryRulePlaceholder = {
  id: string;
  projectId: string;
  scope: "project";
  version: 1;
  rule: string;
  confidence: number;
  createdAt: number;
  updatedAt: number;
};

export type MemoryLayerAssembly = {
  immediate: {
    projectId: string;
    sessionId: string;
    items: WorkingMemoryLayerItem[];
  };
  episodic: {
    items: EpisodeRecord[];
  };
  settings: {
    rules: SemanticMemoryRulePlaceholder[];
    memoryDegraded: boolean;
    fallbackRules: string[];
  };
};

export type EpisodeRecordInput = {
  projectId: string;
  chapterId: string;
  sceneType: string;
  skillUsed: string;
  inputContext: string;
  candidates: string[];
  selectedIndex: number;
  finalText: string;
  explicit?: string;
  editDistance: number;
  importance?: number;
  acceptedWithoutEdit?: boolean;
  undoAfterAccept?: boolean;
  repeatedSceneSkillCount?: number;
  userConfirmed?: boolean;
  targetEpisodeId?: string;
};

export type EpisodeQueryInput = {
  projectId: string;
  sceneType: string;
  queryText?: string;
  limit?: number;
};

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type EpisodeRepository = {
  insertEpisode: (episode: EpisodeRecord) => void;
  updateEpisodeSignal: (args: {
    episodeId: string;
    signal: ImplicitSignal;
    weight: number;
    updatedAt: number;
  }) => boolean;
  listEpisodesByScene: (args: {
    projectId: string;
    sceneType: string;
    includeCompressed: boolean;
  }) => EpisodeRecord[];
  markEpisodesRecalled: (args: { ids: string[]; recalledAt: number }) => void;
  countEpisodes: (args: { projectId: string; compressed: boolean }) => number;
  deleteExpiredEpisodes: (args: {
    projectId: string;
    compressed: boolean;
    beforeTs: number;
  }) => number;
  deleteLruEpisodes: (args: {
    projectId: string;
    compressed: boolean;
    overflow: number;
  }) => number;
  compressEpisodes: (args: { projectId: string; beforeTs: number }) => number;
  purgeCompressedEpisodes: (args: {
    projectId: string;
    beforeTs: number;
    overflow: number;
  }) => number;
  listSemanticPlaceholders: (args: {
    projectId: string;
    limit: number;
  }) => SemanticMemoryRulePlaceholder[];
};

export type EpisodicMemoryService = {
  recordEpisode: (args: EpisodeRecordInput) => ServiceResult<{
    accepted: true;
    episodeId: string;
    retryCount: number;
    implicitSignal: ImplicitSignal;
    implicitWeight: number;
  }>;
  queryEpisodes: (args: EpisodeQueryInput) => ServiceResult<{
    items: EpisodeRecord[];
    memoryDegraded: boolean;
    fallbackRules: string[];
    semanticRules: SemanticMemoryRulePlaceholder[];
  }>;
  realtimeEvictionTrigger: (args: { projectId: string }) => ServiceResult<{
    deleted: number;
  }>;
  dailyDecayRecomputeTrigger: () => ServiceResult<{ updated: number }>;
  weeklyCompressTrigger: (args: { projectId: string }) => ServiceResult<{
    compressed: number;
  }>;
  monthlyPurgeTrigger: (args: { projectId: string }) => ServiceResult<{
    deleted: number;
  }>;
  getRetryQueueSize: () => number;
};

export type InMemoryEpisodeRepository = EpisodeRepository & {
  seedEpisodes: (episodes: EpisodeRecord[]) => void;
  dump: () => {
    episodes: EpisodeRecord[];
    semanticRules: SemanticMemoryRulePlaceholder[];
  };
};

/**
 * Build deterministic IPC error objects for Memory System responses.
 *
 * Why: memory IPC handlers must return explicit, parseable failures.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

/**
 * Compute lexical overlap score for mixed recall ranking.
 *
 * Why: P0 only needs a deterministic semantic approximation without LLM/vector dependencies.
 */
function lexicalOverlapScore(queryText: string, sourceText: string): number {
  const queryTokens = queryText
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (queryTokens.length === 0) {
    return 0;
  }

  const sourceTokens = new Set(
    sourceText
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0),
  );

  let hit = 0;
  const sourceLower = sourceText.toLowerCase();
  for (const token of queryTokens) {
    if (sourceLower.includes(token) || sourceTokens.has(token)) {
      hit += 1;
    }
  }
  return hit / queryTokens.length;
}

/**
 * Clamp recall size to the Spec-defined 3-5 range.
 *
 * Why: callers should never accidentally over-fetch and break prompt token budgets.
 */
function normalizeRecallLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return MAX_RECALL_LIMIT;
  }
  const rounded = Math.trunc(limit);
  if (rounded < MIN_RECALL_LIMIT) {
    return MIN_RECALL_LIMIT;
  }
  if (rounded > MAX_RECALL_LIMIT) {
    return MAX_RECALL_LIMIT;
  }
  return rounded;
}

/**
 * Resolve implicit feedback into one of six fixed signals and testable weights.
 *
 * Why: P0 requires a pure function so feedback semantics stay deterministic across processes.
 */
export function resolveImplicitFeedback(args: {
  selectedIndex: number;
  candidateCount: number;
  editDistance: number;
  acceptedWithoutEdit?: boolean;
  undoAfterAccept?: boolean;
  repeatedSceneSkillCount?: number;
}): { signal: ImplicitSignal; weight: number } {
  if (args.undoAfterAccept) {
    return {
      signal: "UNDO_AFTER_ACCEPT",
      weight: IMPLICIT_SIGNAL_WEIGHTS.UNDO_AFTER_ACCEPT,
    };
  }

  if (args.selectedIndex < 0 || args.candidateCount <= 0) {
    return {
      signal: "FULL_REJECT",
      weight: IMPLICIT_SIGNAL_WEIGHTS.FULL_REJECT,
    };
  }

  const repeatedCount = Math.max(0, args.repeatedSceneSkillCount ?? 0);
  if (
    repeatedCount > 0 &&
    args.editDistance >= 0.2 &&
    args.editDistance <= 0.6
  ) {
    return {
      signal: "REPEATED_SCENE_SKILL",
      weight: IMPLICIT_SIGNAL_WEIGHTS.REPEATED_SCENE_SKILL * repeatedCount,
    };
  }

  if (args.acceptedWithoutEdit || args.editDistance === 0) {
    return {
      signal: "DIRECT_ACCEPT",
      weight: IMPLICIT_SIGNAL_WEIGHTS.DIRECT_ACCEPT,
    };
  }

  if (args.editDistance < 0.2) {
    return {
      signal: "LIGHT_EDIT",
      weight: IMPLICIT_SIGNAL_WEIGHTS.LIGHT_EDIT,
    };
  }

  if (args.editDistance > 0.6) {
    return {
      signal: "HEAVY_REWRITE",
      weight: IMPLICIT_SIGNAL_WEIGHTS.HEAVY_REWRITE,
    };
  }

  if (repeatedCount > 0) {
    return {
      signal: "REPEATED_SCENE_SKILL",
      weight: IMPLICIT_SIGNAL_WEIGHTS.REPEATED_SCENE_SKILL * repeatedCount,
    };
  }

  return {
    signal: "LIGHT_EDIT",
    weight: IMPLICIT_SIGNAL_WEIGHTS.LIGHT_EDIT,
  };
}

/**
 * Assemble three memory layers into a CE-consumable object.
 *
 * Why: Context Engine expects stable layer boundaries rather than ad-hoc payloads.
 */
export function assembleMemoryLayers(args: {
  projectId: string;
  sessionId: string;
  working: WorkingMemoryLayerItem[];
  episodes: EpisodeRecord[];
  semanticRules: SemanticMemoryRulePlaceholder[];
  memoryDegraded?: boolean;
  fallbackRules?: string[];
}): MemoryLayerAssembly {
  return {
    immediate: {
      projectId: args.projectId,
      sessionId: args.sessionId,
      items: [...args.working],
    },
    episodic: {
      items: [...args.episodes],
    },
    settings: {
      rules: [...args.semanticRules],
      memoryDegraded: args.memoryDegraded ?? false,
      fallbackRules: [...(args.fallbackRules ?? [])],
    },
  };
}

/**
 * Build an in-memory episode repository for deterministic unit/integration tests.
 *
 * Why: service logic should be testable without native SQLite dependencies.
 */
export function createInMemoryEpisodeRepository(args?: {
  failInsertAttempts?: number;
}): InMemoryEpisodeRepository {
  const episodes: EpisodeRecord[] = [];
  const semanticRules: SemanticMemoryRulePlaceholder[] = [];
  let failInsertAttempts = Math.max(0, args?.failInsertAttempts ?? 0);

  function sortLruCandidates(items: EpisodeRecord[]): EpisodeRecord[] {
    return [...items].sort((a, b) => {
      if (a.importance !== b.importance) {
        return a.importance - b.importance;
      }
      if (a.recallCount !== b.recallCount) {
        return a.recallCount - b.recallCount;
      }
      const aRecall = a.lastRecalledAt ?? 0;
      const bRecall = b.lastRecalledAt ?? 0;
      if (aRecall !== bRecall) {
        return aRecall - bRecall;
      }
      if (a.createdAt !== b.createdAt) {
        return a.createdAt - b.createdAt;
      }
      return a.id.localeCompare(b.id);
    });
  }

  return {
    insertEpisode: (episode) => {
      if (failInsertAttempts > 0) {
        failInsertAttempts -= 1;
        throw new Error("mock insert failed");
      }
      episodes.push({ ...episode, candidates: [...episode.candidates] });
    },
    updateEpisodeSignal: ({ episodeId, signal, weight, updatedAt }) => {
      const item = episodes.find((episode) => episode.id === episodeId);
      if (!item) {
        return false;
      }
      item.implicitSignal = signal;
      item.implicitWeight = weight;
      item.updatedAt = updatedAt;
      return true;
    },
    listEpisodesByScene: ({ projectId, sceneType, includeCompressed }) => {
      return episodes
        .filter((episode) => episode.projectId === projectId)
        .filter((episode) => episode.sceneType === sceneType)
        .filter((episode) => (includeCompressed ? true : !episode.compressed))
        .map((episode) => ({
          ...episode,
          candidates: [...episode.candidates],
        }));
    },
    markEpisodesRecalled: ({ ids, recalledAt }) => {
      const set = new Set(ids);
      for (const item of episodes) {
        if (!set.has(item.id)) {
          continue;
        }
        item.recallCount += 1;
        item.lastRecalledAt = recalledAt;
        item.updatedAt = recalledAt;
      }
    },
    countEpisodes: ({ projectId, compressed }) => {
      return episodes.filter(
        (episode) =>
          episode.projectId === projectId && episode.compressed === compressed,
      ).length;
    },
    deleteExpiredEpisodes: ({ projectId, compressed, beforeTs }) => {
      const beforeSize = episodes.length;
      const keep = episodes.filter((episode) => {
        if (episode.projectId !== projectId) {
          return true;
        }
        if (episode.compressed !== compressed) {
          return true;
        }
        if (episode.userConfirmed) {
          return true;
        }
        return episode.createdAt >= beforeTs;
      });
      episodes.splice(0, episodes.length, ...keep);
      return beforeSize - keep.length;
    },
    deleteLruEpisodes: ({ projectId, compressed, overflow }) => {
      if (overflow <= 0) {
        return 0;
      }
      const candidates = sortLruCandidates(
        episodes.filter(
          (episode) =>
            episode.projectId === projectId &&
            episode.compressed === compressed &&
            !episode.userConfirmed,
        ),
      );
      const toDelete = new Set(
        candidates.slice(0, overflow).map((item) => item.id),
      );
      if (toDelete.size === 0) {
        return 0;
      }
      const beforeSize = episodes.length;
      const keep = episodes.filter((episode) => !toDelete.has(episode.id));
      episodes.splice(0, episodes.length, ...keep);
      return beforeSize - keep.length;
    },
    compressEpisodes: ({ projectId, beforeTs }) => {
      let compressed = 0;
      for (const episode of episodes) {
        if (episode.projectId !== projectId) {
          continue;
        }
        if (episode.compressed) {
          continue;
        }
        if (episode.userConfirmed) {
          continue;
        }
        if (episode.createdAt >= beforeTs) {
          continue;
        }

        episode.compressed = true;
        episode.candidates = [];
        episode.inputContext = episode.inputContext.slice(0, 800);
        episode.finalText = episode.finalText.slice(0, 800);
        compressed += 1;
      }
      return compressed;
    },
    purgeCompressedEpisodes: ({ projectId, beforeTs, overflow }) => {
      const beforeSize = episodes.length;

      let keep = episodes.filter((episode) => {
        if (episode.projectId !== projectId) {
          return true;
        }
        if (!episode.compressed) {
          return true;
        }
        if (episode.userConfirmed) {
          return true;
        }
        return episode.createdAt >= beforeTs;
      });

      if (overflow > 0) {
        const candidates = sortLruCandidates(
          keep.filter(
            (episode) =>
              episode.projectId === projectId &&
              episode.compressed &&
              !episode.userConfirmed,
          ),
        );
        const overflowDelete = new Set(
          candidates.slice(0, overflow).map((item) => item.id),
        );
        keep = keep.filter((episode) => !overflowDelete.has(episode.id));
      }

      episodes.splice(0, episodes.length, ...keep);
      return beforeSize - keep.length;
    },
    listSemanticPlaceholders: ({ projectId, limit }) => {
      return semanticRules
        .filter((rule) => rule.projectId === projectId)
        .slice(0, limit)
        .map((rule) => ({ ...rule }));
    },
    seedEpisodes: (seed) => {
      episodes.splice(0, episodes.length, ...seed.map((item) => ({ ...item })));
    },
    dump: () => ({
      episodes: episodes.map((item) => ({
        ...item,
        candidates: [...item.candidates],
      })),
      semanticRules: semanticRules.map((rule) => ({ ...rule })),
    }),
  };
}

type EpisodeRow = {
  id: string;
  projectId: string;
  scope: string;
  version: number;
  chapterId: string;
  sceneType: string;
  skillUsed: string;
  inputContext: string;
  candidatesJson: string;
  selectedIndex: number;
  finalText: string;
  explicit: string | null;
  editDistance: number;
  implicitSignal: string;
  implicitWeight: number;
  importance: number;
  recallCount: number;
  lastRecalledAt: number | null;
  compressed: number;
  userConfirmed: number;
  createdAt: number;
  updatedAt: number;
};

type SemanticPlaceholderRow = {
  id: string;
  projectId: string;
  scope: string;
  version: number;
  rule: string;
  confidence: number;
  createdAt: number;
  updatedAt: number;
};

/**
 * Map database rows into typed episode records.
 *
 * Why: DB payload validation must happen at boundaries before IPC exposure.
 */
function rowToEpisode(row: EpisodeRow): EpisodeRecord | null {
  const signal = row.implicitSignal as ImplicitSignal;
  if (!(signal in IMPLICIT_SIGNAL_WEIGHTS)) {
    return null;
  }
  if (row.scope !== "project") {
    return null;
  }
  if (row.version !== 1) {
    return null;
  }

  let candidates: string[] = [];
  try {
    const parsed = JSON.parse(row.candidatesJson) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
    ) {
      candidates = parsed;
    }
  } catch {
    candidates = [];
  }

  return {
    id: row.id,
    projectId: row.projectId,
    scope: "project",
    version: 1,
    chapterId: row.chapterId,
    sceneType: row.sceneType,
    skillUsed: row.skillUsed,
    inputContext: row.inputContext,
    candidates,
    selectedIndex: row.selectedIndex,
    finalText: row.finalText,
    explicit: row.explicit ?? undefined,
    editDistance: row.editDistance,
    implicitSignal: signal,
    implicitWeight: row.implicitWeight,
    importance: row.importance,
    recallCount: row.recallCount,
    lastRecalledAt: row.lastRecalledAt ?? undefined,
    compressed: row.compressed === 1,
    userConfirmed: row.userConfirmed === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Build a SQLite-backed episode repository.
 *
 * Why: production P0 requires persistent episodic storage and indexed recall paths.
 */
export function createSqliteEpisodeRepository(args: {
  db: Database.Database;
  logger: Logger;
}): EpisodeRepository {
  return {
    insertEpisode: (episode) => {
      args.db
        .prepare(
          "INSERT INTO memory_episodes (episode_id, project_id, scope, version, chapter_id, scene_type, skill_used, input_context, candidates_json, selected_index, final_text, explicit_feedback, edit_distance, implicit_signal, implicit_weight, importance, recall_count, last_recalled_at, compressed, user_confirmed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          episode.id,
          episode.projectId,
          episode.scope,
          episode.version,
          episode.chapterId,
          episode.sceneType,
          episode.skillUsed,
          episode.inputContext,
          JSON.stringify(episode.candidates),
          episode.selectedIndex,
          episode.finalText,
          episode.explicit ?? null,
          episode.editDistance,
          episode.implicitSignal,
          episode.implicitWeight,
          episode.importance,
          episode.recallCount,
          episode.lastRecalledAt ?? null,
          episode.compressed ? 1 : 0,
          episode.userConfirmed ? 1 : 0,
          episode.createdAt,
          episode.updatedAt,
        );
    },
    updateEpisodeSignal: ({ episodeId, signal, weight, updatedAt }) => {
      const result = args.db
        .prepare(
          "UPDATE memory_episodes SET implicit_signal = ?, implicit_weight = ?, updated_at = ? WHERE episode_id = ?",
        )
        .run(signal, weight, updatedAt, episodeId);
      return result.changes > 0;
    },
    listEpisodesByScene: ({ projectId, sceneType, includeCompressed }) => {
      const rows = args.db
        .prepare<
          [string, string, number],
          EpisodeRow
        >("SELECT episode_id as id, project_id as projectId, scope, version, chapter_id as chapterId, scene_type as sceneType, skill_used as skillUsed, input_context as inputContext, candidates_json as candidatesJson, selected_index as selectedIndex, final_text as finalText, explicit_feedback as explicit, edit_distance as editDistance, implicit_signal as implicitSignal, implicit_weight as implicitWeight, importance, recall_count as recallCount, last_recalled_at as lastRecalledAt, compressed, user_confirmed as userConfirmed, created_at as createdAt, updated_at as updatedAt FROM memory_episodes WHERE project_id = ? AND scene_type = ? AND (? = 1 OR compressed = 0)")
        .all(projectId, sceneType, includeCompressed ? 1 : 0);

      const parsed: EpisodeRecord[] = [];
      for (const row of rows) {
        const episode = rowToEpisode(row);
        if (episode) {
          parsed.push(episode);
        }
      }
      return parsed;
    },
    markEpisodesRecalled: ({ ids, recalledAt }) => {
      if (ids.length === 0) {
        return;
      }
      const stmt = args.db.prepare(
        "UPDATE memory_episodes SET recall_count = recall_count + 1, last_recalled_at = ?, updated_at = ? WHERE episode_id = ?",
      );
      const tx = args.db.transaction((episodeIds: string[]) => {
        for (const episodeId of episodeIds) {
          stmt.run(recalledAt, recalledAt, episodeId);
        }
      });
      tx(ids);
    },
    countEpisodes: ({ projectId, compressed }) => {
      const row = args.db
        .prepare<
          [string, number],
          { count: number }
        >("SELECT COUNT(*) as count FROM memory_episodes WHERE project_id = ? AND compressed = ?")
        .get(projectId, compressed ? 1 : 0);
      return row?.count ?? 0;
    },
    deleteExpiredEpisodes: ({ projectId, compressed, beforeTs }) => {
      const result = args.db
        .prepare(
          "DELETE FROM memory_episodes WHERE project_id = ? AND compressed = ? AND created_at < ? AND user_confirmed = 0",
        )
        .run(projectId, compressed ? 1 : 0, beforeTs);
      return result.changes;
    },
    deleteLruEpisodes: ({ projectId, compressed, overflow }) => {
      if (overflow <= 0) {
        return 0;
      }
      const ids = args.db
        .prepare<[string, number, number], { id: string }>(
          "SELECT episode_id as id FROM memory_episodes WHERE project_id = ? AND compressed = ? AND user_confirmed = 0 ORDER BY importance ASC, recall_count ASC, COALESCE(last_recalled_at, 0) ASC, created_at ASC LIMIT ?",
        )
        .all(projectId, compressed ? 1 : 0, overflow)
        .map((row) => row.id);
      if (ids.length === 0) {
        return 0;
      }
      const stmt = args.db.prepare(
        "DELETE FROM memory_episodes WHERE episode_id = ?",
      );
      const tx = args.db.transaction((episodeIds: string[]) => {
        let deleted = 0;
        for (const episodeId of episodeIds) {
          const result = stmt.run(episodeId);
          deleted += result.changes;
        }
        return deleted;
      });
      return tx(ids);
    },
    compressEpisodes: ({ projectId, beforeTs }) => {
      const result = args.db
        .prepare(
          "UPDATE memory_episodes SET compressed = 1, candidates_json = '[]', input_context = SUBSTR(input_context, 1, 800), final_text = SUBSTR(final_text, 1, 800) WHERE project_id = ? AND compressed = 0 AND user_confirmed = 0 AND created_at < ?",
        )
        .run(projectId, beforeTs);
      return result.changes;
    },
    purgeCompressedEpisodes: ({ projectId, beforeTs, overflow }) => {
      let deleted = 0;
      deleted += args.db
        .prepare(
          "DELETE FROM memory_episodes WHERE project_id = ? AND compressed = 1 AND user_confirmed = 0 AND created_at < ?",
        )
        .run(projectId, beforeTs).changes;

      if (overflow > 0) {
        const ids = args.db
          .prepare<[string, number], { id: string }>(
            "SELECT episode_id as id FROM memory_episodes WHERE project_id = ? AND compressed = 1 AND user_confirmed = 0 ORDER BY created_at ASC LIMIT ?",
          )
          .all(projectId, overflow)
          .map((row) => row.id);
        if (ids.length > 0) {
          const stmt = args.db.prepare(
            "DELETE FROM memory_episodes WHERE episode_id = ?",
          );
          const tx = args.db.transaction((episodeIds: string[]) => {
            let purged = 0;
            for (const episodeId of episodeIds) {
              purged += stmt.run(episodeId).changes;
            }
            return purged;
          });
          deleted += tx(ids);
        }
      }

      return deleted;
    },
    listSemanticPlaceholders: ({ projectId, limit }) => {
      const rows = args.db
        .prepare<
          [string, number],
          SemanticPlaceholderRow
        >("SELECT rule_id as id, project_id as projectId, scope, version, rule_text as rule, confidence, created_at as createdAt, updated_at as updatedAt FROM memory_semantic_placeholders WHERE project_id = ? ORDER BY updated_at DESC LIMIT ?")
        .all(projectId, limit);

      return rows
        .filter((row) => row.scope === "project" && row.version === 1)
        .map((row) => ({
          id: row.id,
          projectId: row.projectId,
          scope: "project" as const,
          version: 1 as const,
          rule: row.rule,
          confidence: row.confidence,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }));
    },
  };
}

/**
 * Create episodic memory service with explicit repository injection.
 *
 * Why: P0 logic must be independently testable while keeping SQLite as production SSOT.
 */
export function createEpisodicMemoryService(args: {
  repository: EpisodeRepository;
  logger: Logger;
  now?: () => number;
}): EpisodicMemoryService {
  const now = args.now ?? (() => Date.now());
  const retryQueue: EpisodeRecordInput[] = [];

  function fallbackRules(): string[] {
    return [
      "Use concise, coherent narration.",
      "Preserve established character voice.",
      "Prefer scene-consistent pacing.",
    ];
  }

  function validateRecordInput(input: EpisodeRecordInput): Err | null {
    if (input.projectId.trim().length === 0) {
      return ipcError("INVALID_ARGUMENT", "projectId is required");
    }
    if (input.chapterId.trim().length === 0) {
      return ipcError("INVALID_ARGUMENT", "chapterId is required");
    }
    if (input.sceneType.trim().length === 0) {
      return ipcError("INVALID_ARGUMENT", "sceneType is required");
    }
    if (input.skillUsed.trim().length === 0) {
      return ipcError("INVALID_ARGUMENT", "skillUsed is required");
    }
    if (!Number.isFinite(input.editDistance) || input.editDistance < 0) {
      return ipcError("INVALID_ARGUMENT", "editDistance is invalid");
    }
    return null;
  }

  function scoreEpisode(args2: {
    episode: EpisodeRecord;
    queryText: string;
    targetSceneType: string;
    currentTs: number;
  }): number {
    const sceneScore =
      args2.episode.sceneType === args2.targetSceneType ? 1 : 0;
    const semanticScore = lexicalOverlapScore(
      args2.queryText,
      `${args2.episode.inputContext} ${args2.episode.finalText}`,
    );
    const age = Math.max(0, args2.currentTs - args2.episode.createdAt);
    const recencyScore = 1 / (1 + age / DAY_MS);
    return (
      sceneScore * 1.2 +
      semanticScore * 1.3 +
      args2.episode.importance * 0.4 +
      recencyScore * 0.1
    );
  }

  function ensureCapacity(projectId: string): ServiceResult<void> {
    const eviction = service.realtimeEvictionTrigger({ projectId });
    if (!eviction.ok) {
      return eviction;
    }

    const activeCount = args.repository.countEpisodes({
      projectId,
      compressed: false,
    });

    if (activeCount >= EPISODIC_ACTIVE_BUDGET) {
      const overflow = activeCount - EPISODIC_ACTIVE_BUDGET + 1;
      const deleted = args.repository.deleteLruEpisodes({
        projectId,
        compressed: false,
        overflow,
      });
      const afterDelete = activeCount - deleted;
      if (afterDelete >= EPISODIC_ACTIVE_BUDGET) {
        return ipcError(
          "MEMORY_CAPACITY_EXCEEDED",
          "Active episodic memory budget exceeded",
          {
            projectId,
            activeCount: afterDelete,
            budget: EPISODIC_ACTIVE_BUDGET,
          },
        );
      }
    }

    const compressedCount = args.repository.countEpisodes({
      projectId,
      compressed: true,
    });
    if (compressedCount > EPISODIC_COMPRESSED_BUDGET) {
      const purge = service.monthlyPurgeTrigger({ projectId });
      if (!purge.ok) {
        return purge;
      }
      const afterPurge = args.repository.countEpisodes({
        projectId,
        compressed: true,
      });
      if (afterPurge > EPISODIC_COMPRESSED_BUDGET) {
        return ipcError(
          "MEMORY_CAPACITY_EXCEEDED",
          "Compressed episodic memory budget exceeded",
          {
            projectId,
            compressedCount: afterPurge,
            budget: EPISODIC_COMPRESSED_BUDGET,
          },
        );
      }
    }

    return { ok: true, data: undefined };
  }

  const service: EpisodicMemoryService = {
    recordEpisode: (input) => {
      const invalid = validateRecordInput(input);
      if (invalid) {
        return invalid;
      }

      const implicit = resolveImplicitFeedback({
        selectedIndex: input.selectedIndex,
        candidateCount: input.candidates.length,
        editDistance: input.editDistance,
        acceptedWithoutEdit: input.acceptedWithoutEdit,
        undoAfterAccept: input.undoAfterAccept,
        repeatedSceneSkillCount: input.repeatedSceneSkillCount,
      });

      const ts = now();

      if (input.undoAfterAccept && input.targetEpisodeId) {
        const updated = args.repository.updateEpisodeSignal({
          episodeId: input.targetEpisodeId,
          signal: implicit.signal,
          weight: implicit.weight,
          updatedAt: ts,
        });
        if (!updated) {
          return ipcError("NOT_FOUND", "Episode not found", {
            episodeId: input.targetEpisodeId,
          });
        }
        return {
          ok: true,
          data: {
            accepted: true,
            episodeId: input.targetEpisodeId,
            retryCount: 0,
            implicitSignal: implicit.signal,
            implicitWeight: implicit.weight,
          },
        };
      }

      const capacity = ensureCapacity(input.projectId);
      if (!capacity.ok) {
        return capacity;
      }

      const episode: EpisodeRecord = {
        id: randomUUID(),
        projectId: input.projectId,
        scope: "project",
        version: 1,
        chapterId: input.chapterId,
        sceneType: input.sceneType,
        skillUsed: input.skillUsed,
        inputContext: input.inputContext,
        candidates: [...input.candidates],
        selectedIndex: input.selectedIndex,
        finalText: input.finalText,
        explicit: input.explicit,
        editDistance: input.editDistance,
        implicitSignal: implicit.signal,
        implicitWeight: implicit.weight,
        importance: Math.max(0, Math.min(1, input.importance ?? 0.5)),
        recallCount: 0,
        compressed: false,
        userConfirmed: input.userConfirmed ?? false,
        createdAt: ts,
        updatedAt: ts,
      };

      let lastError: unknown = null;
      for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt += 1) {
        try {
          args.repository.insertEpisode(episode);
          return {
            ok: true,
            data: {
              accepted: true,
              episodeId: episode.id,
              retryCount: attempt - 1,
              implicitSignal: implicit.signal,
              implicitWeight: implicit.weight,
            },
          };
        } catch (error) {
          lastError = error;
          args.logger.error("memory_episode_write_retry", {
            attempt,
            message: error instanceof Error ? error.message : String(error),
            project_id: input.projectId,
          });
        }
      }

      retryQueue.push(input);
      return ipcError(
        "MEMORY_EPISODE_WRITE_FAILED",
        "Failed to record episode after retries",
        {
          attempts: MAX_WRITE_ATTEMPTS,
          message:
            lastError instanceof Error ? lastError.message : String(lastError),
        },
      );
    },

    queryEpisodes: (input) => {
      if (input.projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }
      if (input.sceneType.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "sceneType is required");
      }

      try {
        const rows = args.repository.listEpisodesByScene({
          projectId: input.projectId,
          sceneType: input.sceneType,
          includeCompressed: false,
        });

        const limit = normalizeRecallLimit(input.limit);
        const trimmedQuery = (input.queryText ?? "").trim();
        const currentTs = now();

        const ranked = [...rows].sort((a, b) => {
          if (trimmedQuery.length === 0) {
            if (a.createdAt !== b.createdAt) {
              return b.createdAt - a.createdAt;
            }
            return a.id.localeCompare(b.id);
          }

          const scoreA = scoreEpisode({
            episode: a,
            queryText: trimmedQuery,
            targetSceneType: input.sceneType,
            currentTs,
          });
          const scoreB = scoreEpisode({
            episode: b,
            queryText: trimmedQuery,
            targetSceneType: input.sceneType,
            currentTs,
          });

          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          return a.id.localeCompare(b.id);
        });

        const items = ranked.slice(0, limit);
        args.repository.markEpisodesRecalled({
          ids: items.map((item) => item.id),
          recalledAt: currentTs,
        });

        const semanticRules = args.repository
          .listSemanticPlaceholders({
            projectId: input.projectId,
            limit: SEMANTIC_RULE_BUDGET,
          })
          .slice(0, SEMANTIC_RULE_BUDGET);

        return {
          ok: true,
          data: {
            items,
            memoryDegraded: false,
            fallbackRules: [],
            semanticRules,
          },
        };
      } catch (error) {
        args.logger.error("memory_episode_query_failed", {
          message: error instanceof Error ? error.message : String(error),
          project_id: input.projectId,
        });
        return {
          ok: true,
          data: {
            items: [],
            memoryDegraded: true,
            fallbackRules: fallbackRules(),
            semanticRules: [],
          },
        };
      }
    },

    realtimeEvictionTrigger: ({ projectId }) => {
      if (projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }

      try {
        const currentTs = now();
        const expireBefore = currentTs - EPISODIC_TTL_DAYS * DAY_MS;
        let deleted = args.repository.deleteExpiredEpisodes({
          projectId,
          compressed: false,
          beforeTs: expireBefore,
        });

        const activeCount = args.repository.countEpisodes({
          projectId,
          compressed: false,
        });
        if (activeCount > EPISODIC_ACTIVE_BUDGET) {
          deleted += args.repository.deleteLruEpisodes({
            projectId,
            compressed: false,
            overflow: activeCount - EPISODIC_ACTIVE_BUDGET,
          });
        }

        return { ok: true, data: { deleted } };
      } catch (error) {
        args.logger.error("memory_realtime_eviction_failed", {
          project_id: projectId,
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed realtime eviction");
      }
    },

    dailyDecayRecomputeTrigger: () => {
      return { ok: true, data: { updated: 0 } };
    },

    weeklyCompressTrigger: ({ projectId }) => {
      if (projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }

      try {
        const currentTs = now();
        const compressBefore = currentTs - EPISODIC_TTL_DAYS * DAY_MS;
        const compressed = args.repository.compressEpisodes({
          projectId,
          beforeTs: compressBefore,
        });

        const compressedCount = args.repository.countEpisodes({
          projectId,
          compressed: true,
        });
        if (compressedCount > EPISODIC_COMPRESSED_BUDGET) {
          args.repository.purgeCompressedEpisodes({
            projectId,
            beforeTs: currentTs - COMPRESSED_TTL_DAYS * DAY_MS,
            overflow: compressedCount - EPISODIC_COMPRESSED_BUDGET,
          });
        }

        return { ok: true, data: { compressed } };
      } catch (error) {
        args.logger.error("memory_weekly_compress_failed", {
          project_id: projectId,
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed weekly compress trigger");
      }
    },

    monthlyPurgeTrigger: ({ projectId }) => {
      if (projectId.trim().length === 0) {
        return ipcError("INVALID_ARGUMENT", "projectId is required");
      }

      try {
        const currentTs = now();
        const beforeTs = currentTs - COMPRESSED_TTL_DAYS * DAY_MS;
        const compressedCount = args.repository.countEpisodes({
          projectId,
          compressed: true,
        });
        const overflow = Math.max(
          0,
          compressedCount - EPISODIC_COMPRESSED_BUDGET,
        );
        const deleted = args.repository.purgeCompressedEpisodes({
          projectId,
          beforeTs,
          overflow,
        });
        return { ok: true, data: { deleted } };
      } catch (error) {
        args.logger.error("memory_monthly_purge_failed", {
          project_id: projectId,
          message: error instanceof Error ? error.message : String(error),
        });
        return ipcError("DB_ERROR", "Failed monthly purge trigger");
      }
    },

    getRetryQueueSize: () => retryQueue.length,
  };

  return service;
}
