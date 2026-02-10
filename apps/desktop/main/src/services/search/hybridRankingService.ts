import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../../logging/logger";
import type { FtsService } from "./ftsService";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type SearchStrategy = "fts" | "semantic" | "hybrid";

export type SearchRankScoreBreakdown = {
  bm25: number;
  semantic: number;
  recency: number;
};

export type SearchRankedItem = {
  documentId: string;
  chunkId: string;
  snippet: string;
  finalScore: number;
  scoreBreakdown: SearchRankScoreBreakdown;
  updatedAt: number;
};

export type SearchRankBackpressure = {
  candidateLimit: number;
  candidateCount: number;
  truncated: boolean;
};

export type SearchQueryStrategyResponse = {
  strategy: SearchStrategy;
  results: SearchRankedItem[];
  total: number;
  hasMore: boolean;
  backpressure: SearchRankBackpressure;
};

export type SearchRankExplainResponse = {
  strategy: SearchStrategy;
  explanations: SearchRankedItem[];
  total: number;
  backpressure: SearchRankBackpressure;
};

export type SemanticRetrieveItem = {
  documentId: string;
  chunkId: string;
  snippet: string;
  score: number;
  updatedAt: number;
};

export type SemanticRetriever = {
  search: (args: {
    projectId: string;
    query: string;
    limit: number;
  }) => ServiceResult<{ items: SemanticRetrieveItem[] }>;
};

export type HybridRankingService = {
  queryByStrategy: (args: {
    projectId: string;
    query: string;
    strategy: SearchStrategy;
    limit?: number;
    offset?: number;
  }) => ServiceResult<SearchQueryStrategyResponse>;
  rankExplain: (args: {
    projectId: string;
    query: string;
    strategy: SearchStrategy;
    documentId?: string;
    chunkId?: string;
    limit?: number;
    offset?: number;
  }) => ServiceResult<SearchRankExplainResponse>;
};

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 50;
const DEFAULT_OFFSET = 0;
const FTS_RECALL_LIMIT = 200;
const FTS_PAGE_LIMIT = 100;
const SEMANTIC_RECALL_LIMIT = 200;
const SCORE_THRESHOLD = 0.25;
const CANDIDATE_LIMIT = 10_000;
const SCORE_ROUND_DIGITS = 6;
const EPSILON = 1e-12;

type WorkingCandidate = {
  key: string;
  documentId: string;
  chunkId: string;
  snippet: string;
  updatedAt: number;
  bm25Raw: number;
  semanticRaw: number;
};

/**
 * Build a stable IPC error object.
 *
 * Why: ranking service must expose deterministic error envelopes for IPC.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

function roundScore(value: number): number {
  const factor = 10 ** SCORE_ROUND_DIGITS;
  return Math.round(value * factor) / factor;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function normalizeProjectId(projectId: string): ServiceResult<string> {
  const trimmed = projectId.trim();
  if (trimmed.length === 0) {
    return ipcError("INVALID_ARGUMENT", "projectId is required");
  }
  return { ok: true, data: trimmed };
}

function normalizeQuery(query: string): ServiceResult<string> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return ipcError("INVALID_ARGUMENT", "query is required");
  }
  return { ok: true, data: trimmed };
}

function normalizeStrategy(
  strategy: SearchStrategy,
): ServiceResult<SearchStrategy> {
  if (strategy === "fts" || strategy === "semantic" || strategy === "hybrid") {
    return { ok: true, data: strategy };
  }
  return ipcError(
    "INVALID_ARGUMENT",
    "strategy must be fts | semantic | hybrid",
  );
}

function normalizeLimit(limit?: number): ServiceResult<number> {
  if (typeof limit === "undefined") {
    return { ok: true, data: DEFAULT_PAGE_SIZE };
  }
  if (!Number.isFinite(limit) || !Number.isInteger(limit)) {
    return ipcError("INVALID_ARGUMENT", "limit must be an integer");
  }
  if (limit <= 0) {
    return ipcError("INVALID_ARGUMENT", "limit must be positive");
  }
  if (limit > MAX_PAGE_SIZE) {
    return ipcError("INVALID_ARGUMENT", "limit is too large", {
      maxLimit: MAX_PAGE_SIZE,
    });
  }
  return { ok: true, data: limit };
}

function normalizeOffset(offset?: number): ServiceResult<number> {
  if (typeof offset === "undefined") {
    return { ok: true, data: DEFAULT_OFFSET };
  }
  if (!Number.isFinite(offset) || !Number.isInteger(offset)) {
    return ipcError("INVALID_ARGUMENT", "offset must be an integer");
  }
  if (offset < 0) {
    return ipcError("INVALID_ARGUMENT", "offset must be non-negative");
  }
  return { ok: true, data: offset };
}

function normalizeBm25(candidates: WorkingCandidate[]): Map<string, number> {
  const values = candidates
    .map((candidate) => candidate.bm25Raw)
    .filter((value) => Number.isFinite(value) && value > 0);
  const normalized = new Map<string, number>();
  if (values.length === 0) {
    return normalized;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const span = max - min;
  for (const candidate of candidates) {
    if (candidate.bm25Raw <= 0 || !Number.isFinite(candidate.bm25Raw)) {
      normalized.set(candidate.key, 0);
      continue;
    }
    if (span < EPSILON) {
      normalized.set(candidate.key, 1);
      continue;
    }
    normalized.set(candidate.key, clamp01((candidate.bm25Raw - min) / span));
  }
  return normalized;
}

function normalizeRecency(candidates: WorkingCandidate[]): Map<string, number> {
  const normalized = new Map<string, number>();
  if (candidates.length === 0) {
    return normalized;
  }
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const candidate of candidates) {
    min = Math.min(min, candidate.updatedAt);
    max = Math.max(max, candidate.updatedAt);
  }
  const span = max - min;
  for (const candidate of candidates) {
    if (span < EPSILON) {
      normalized.set(candidate.key, 1);
      continue;
    }
    normalized.set(candidate.key, clamp01((candidate.updatedAt - min) / span));
  }
  return normalized;
}

/**
 * Create an empty semantic retriever.
 *
 * Why: strategy service must keep working when semantic infrastructure is absent.
 */
export function createNoopSemanticRetriever(): SemanticRetriever {
  return {
    search: () => ({ ok: true, data: { items: [] } }),
  };
}

function upsertCandidate(
  map: Map<string, WorkingCandidate>,
  candidate: WorkingCandidate,
): void {
  const existing = map.get(candidate.key);
  if (!existing) {
    map.set(candidate.key, candidate);
    return;
  }

  map.set(candidate.key, {
    ...existing,
    snippet:
      candidate.snippet.length > existing.snippet.length
        ? candidate.snippet
        : existing.snippet,
    updatedAt: Math.max(existing.updatedAt, candidate.updatedAt),
    bm25Raw: Math.max(existing.bm25Raw, candidate.bm25Raw),
    semanticRaw: Math.max(existing.semanticRaw, candidate.semanticRaw),
  });
}

function buildRankedItems(args: {
  ftsService: FtsService;
  semanticRetriever: SemanticRetriever;
  logger: Logger;
  projectId: string;
  query: string;
  strategy: SearchStrategy;
}): ServiceResult<{
  ranked: SearchRankedItem[];
  backpressure: SearchRankBackpressure;
}> {
  const merged = new Map<string, WorkingCandidate>();

  if (args.strategy === "fts" || args.strategy === "hybrid") {
    const firstPage = args.ftsService.search({
      projectId: args.projectId,
      query: args.query,
      limit: Math.min(FTS_PAGE_LIMIT, FTS_RECALL_LIMIT),
      offset: 0,
    });
    if (!firstPage.ok) {
      return firstPage;
    }

    const ftsItems = [...firstPage.data.results];
    if (ftsItems.length < FTS_RECALL_LIMIT && firstPage.data.hasMore) {
      const nextLimit = Math.min(
        FTS_PAGE_LIMIT,
        FTS_RECALL_LIMIT - ftsItems.length,
      );
      const secondPage = args.ftsService.search({
        projectId: args.projectId,
        query: args.query,
        limit: nextLimit,
        offset: ftsItems.length,
      });
      if (!secondPage.ok) {
        return secondPage;
      }
      ftsItems.push(...secondPage.data.results);
    }

    for (const item of ftsItems) {
      const chunkId = `fts:${item.documentId}:0`;
      const key = `${item.documentId}::${chunkId}`;
      upsertCandidate(merged, {
        key,
        documentId: item.documentId,
        chunkId,
        snippet: item.snippet,
        updatedAt: item.updatedAt,
        bm25Raw: item.score,
        semanticRaw: 0,
      });
    }
  }

  if (args.strategy === "semantic" || args.strategy === "hybrid") {
    const semantic = args.semanticRetriever.search({
      projectId: args.projectId,
      query: args.query,
      limit: SEMANTIC_RECALL_LIMIT,
    });
    if (!semantic.ok) {
      if (args.strategy === "hybrid") {
        args.logger.info("search_hybrid_semantic_degraded", {
          projectId: args.projectId,
          reason: semantic.error.code,
        });
      } else {
        return semantic;
      }
    } else {
      for (const item of semantic.data.items) {
        const key = `${item.documentId}::${item.chunkId}`;
        upsertCandidate(merged, {
          key,
          documentId: item.documentId,
          chunkId: item.chunkId,
          snippet: item.snippet,
          updatedAt: item.updatedAt,
          bm25Raw: 0,
          semanticRaw: item.score,
        });
      }
    }
  }

  const mergedCandidates = [...merged.values()];
  const backpressure: SearchRankBackpressure = {
    candidateLimit: CANDIDATE_LIMIT,
    candidateCount: mergedCandidates.length,
    truncated: mergedCandidates.length > CANDIDATE_LIMIT,
  };
  const candidates = backpressure.truncated
    ? mergedCandidates.slice(0, CANDIDATE_LIMIT)
    : mergedCandidates;

  const bm25ByKey = normalizeBm25(candidates);
  const recencyByKey = normalizeRecency(candidates);

  const ranked = candidates
    .map((candidate) => {
      const bm25 = clamp01(bm25ByKey.get(candidate.key) ?? 0);
      const semantic = clamp01(candidate.semanticRaw);
      const recency = clamp01(recencyByKey.get(candidate.key) ?? 0);
      const finalScore = roundScore(
        0.55 * bm25 + 0.35 * semantic + 0.1 * recency,
      );

      return {
        documentId: candidate.documentId,
        chunkId: candidate.chunkId,
        snippet: candidate.snippet,
        finalScore,
        scoreBreakdown: {
          bm25: roundScore(bm25),
          semantic: roundScore(semantic),
          recency: roundScore(recency),
        },
        updatedAt: candidate.updatedAt,
      } satisfies SearchRankedItem;
    })
    .filter((item) => item.finalScore >= SCORE_THRESHOLD)
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      if (b.updatedAt !== a.updatedAt) {
        return b.updatedAt - a.updatedAt;
      }
      const docOrder = a.documentId.localeCompare(b.documentId);
      if (docOrder !== 0) {
        return docOrder;
      }
      return a.chunkId.localeCompare(b.chunkId);
    });

  return { ok: true, data: { ranked, backpressure } };
}

function validateExplainTarget(args: {
  documentId?: string;
  chunkId?: string;
}): ServiceResult<{
  documentId?: string;
  chunkId?: string;
}> {
  const documentId = args.documentId?.trim();
  const chunkId = args.chunkId?.trim();
  if (
    (typeof documentId === "string" && documentId.length > 0) !==
    (typeof chunkId === "string" && chunkId.length > 0)
  ) {
    return ipcError(
      "INVALID_ARGUMENT",
      "documentId and chunkId must be provided together",
    );
  }
  return {
    ok: true,
    data: {
      documentId: documentId && documentId.length > 0 ? documentId : undefined,
      chunkId: chunkId && chunkId.length > 0 ? chunkId : undefined,
    },
  };
}

/**
 * Create the hybrid ranking service.
 *
 * Why: search must share one deterministic ranking pipeline for strategy query
 * and explain output to keep scoring/debug semantics stable.
 */
export function createHybridRankingService(deps: {
  ftsService: FtsService;
  semanticRetriever: SemanticRetriever;
  logger: Logger;
}): HybridRankingService {
  return {
    queryByStrategy: (args) => {
      const projectIdRes = normalizeProjectId(args.projectId);
      if (!projectIdRes.ok) {
        return projectIdRes;
      }
      const queryRes = normalizeQuery(args.query);
      if (!queryRes.ok) {
        return queryRes;
      }
      const strategyRes = normalizeStrategy(args.strategy);
      if (!strategyRes.ok) {
        return strategyRes;
      }
      const limitRes = normalizeLimit(args.limit);
      if (!limitRes.ok) {
        return limitRes;
      }
      const offsetRes = normalizeOffset(args.offset);
      if (!offsetRes.ok) {
        return offsetRes;
      }

      const rankedRes = buildRankedItems({
        ftsService: deps.ftsService,
        semanticRetriever: deps.semanticRetriever,
        logger: deps.logger,
        projectId: projectIdRes.data,
        query: queryRes.data,
        strategy: strategyRes.data,
      });
      if (!rankedRes.ok) {
        return rankedRes;
      }

      const total = rankedRes.data.ranked.length;
      const start = Math.min(offsetRes.data, total);
      const end = Math.min(start + limitRes.data, total);

      return {
        ok: true,
        data: {
          strategy: strategyRes.data,
          results: rankedRes.data.ranked.slice(start, end),
          total,
          hasMore: end < total,
          backpressure: rankedRes.data.backpressure,
        },
      };
    },

    rankExplain: (args) => {
      const projectIdRes = normalizeProjectId(args.projectId);
      if (!projectIdRes.ok) {
        return projectIdRes;
      }
      const queryRes = normalizeQuery(args.query);
      if (!queryRes.ok) {
        return queryRes;
      }
      const strategyRes = normalizeStrategy(args.strategy);
      if (!strategyRes.ok) {
        return strategyRes;
      }
      const limitRes = normalizeLimit(args.limit);
      if (!limitRes.ok) {
        return limitRes;
      }
      const offsetRes = normalizeOffset(args.offset);
      if (!offsetRes.ok) {
        return offsetRes;
      }
      const targetRes = validateExplainTarget({
        documentId: args.documentId,
        chunkId: args.chunkId,
      });
      if (!targetRes.ok) {
        return targetRes;
      }

      const rankedRes = buildRankedItems({
        ftsService: deps.ftsService,
        semanticRetriever: deps.semanticRetriever,
        logger: deps.logger,
        projectId: projectIdRes.data,
        query: queryRes.data,
        strategy: strategyRes.data,
      });
      if (!rankedRes.ok) {
        return rankedRes;
      }

      const total = rankedRes.data.ranked.length;
      const explanations =
        targetRes.data.documentId && targetRes.data.chunkId
          ? rankedRes.data.ranked.filter(
              (item) =>
                item.documentId === targetRes.data.documentId &&
                item.chunkId === targetRes.data.chunkId,
            )
          : (() => {
              const start = Math.min(offsetRes.data, total);
              const end = Math.min(start + limitRes.data, total);
              return rankedRes.data.ranked.slice(start, end);
            })();

      return {
        ok: true,
        data: {
          strategy: strategyRes.data,
          explanations,
          total,
          backpressure: rankedRes.data.backpressure,
        },
      };
    },
  };
}
