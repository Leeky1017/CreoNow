import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import type { ProjectLifecycle } from "../services/projects/projectLifecycle";
import type { SemanticChunkIndexService } from "../services/embedding/semanticChunkIndexService";
import { createFtsService } from "../services/search/ftsService";
import {
  createHybridRankingService,
  createNoopSemanticRetriever,
  type HybridRankingService,
  type SemanticRetriever,
} from "../services/search/hybridRankingService";
import { createSearchReplaceService } from "../services/search/searchReplaceService";
import { createProjectAccessHandler } from "./helpers";
import type { ProjectSessionBindingRegistry } from "./projectSessionBinding";

type SearchReplaceService = ReturnType<typeof createSearchReplaceService>;
type FtsService = ReturnType<typeof createFtsService>;

type HandleWithProjectAccess = ReturnType<typeof createProjectAccessHandler>;

type SearchReplacePreviewData = Extract<
  ReturnType<SearchReplaceService["preview"]>,
  { ok: true }
>["data"];
type SearchReplaceExecuteData = Extract<
  ReturnType<SearchReplaceService["execute"]>,
  { ok: true }
>["data"];

type DocumentIndexRow = {
  documentId: string;
  contentText: string;
  updatedAt: number;
};

function listProjectDocuments(args: {
  db: Database.Database;
  projectId: string;
}): DocumentIndexRow[] {
  return args.db
    .prepare<
      [string],
      DocumentIndexRow
    >("SELECT document_id as documentId, content_text as contentText, updated_at as updatedAt FROM documents WHERE project_id = ? ORDER BY updated_at DESC, document_id ASC")
    .all(args.projectId);
}

/**
 * Create semantic retriever for hybrid ranking.
 *
 * Why: hybrid strategy must reuse semantic index data while keeping search IPC
 * isolated from embedding IPC channel orchestration.
 */
function createSearchSemanticRetriever(args: {
  db: Database.Database;
  semanticIndex?: SemanticChunkIndexService;
}): SemanticRetriever {
  const semanticIndex = args.semanticIndex;
  if (!semanticIndex) {
    return createNoopSemanticRetriever();
  }

  return {
    search: ({ projectId, query, limit }) => {
      const docs = listProjectDocuments({
        db: args.db,
        projectId,
      });
      for (const doc of docs) {
        const upserted = semanticIndex.upsertDocument({
          projectId,
          documentId: doc.documentId,
          contentText: doc.contentText,
          updatedAt: doc.updatedAt,
        });
        if (!upserted.ok) {
          return upserted;
        }
      }

      const semantic = semanticIndex.search({
        projectId,
        queryText: query,
        topK: limit,
        minScore: -1,
      });
      if (!semantic.ok) {
        return semantic;
      }

      return {
        ok: true,
        data: {
          items: semantic.data.chunks.map((chunk) => ({
            projectId: chunk.projectId,
            documentId: chunk.documentId,
            chunkId: chunk.chunkId,
            snippet: chunk.text,
            score: chunk.score,
            updatedAt: chunk.updatedAt,
          })),
        },
      };
    },
  };
}

function toInternalSearchError<T = never>(
  logger: Logger,
  event: string,
  error: unknown,
): IpcResponse<T> {
  logger.error(event, {
    message: error instanceof Error ? error.message : String(error),
  });
  return {
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal error",
    },
  };
}

function hasProjectId(payload: unknown): payload is { projectId: string } {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const projectId = (payload as { projectId?: unknown }).projectId;
  return typeof projectId === "string" && projectId.trim().length > 0;
}

function registerSearchReplaceHandlers(
  handleWithProjectAccess: HandleWithProjectAccess,
  db: Database.Database | null,
  logger: Logger,
  replaceService: SearchReplaceService | null,
): void {
  handleWithProjectAccess(
    "search:replace:preview",
    async (
      _e,
      payload: Parameters<SearchReplaceService["preview"]>[0],
    ): Promise<IpcResponse<SearchReplacePreviewData>> => {
      if (!db || !replaceService) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      try {
        const res = replaceService.preview(payload);
        if (!res.ok) {
          logger.error("search_replace_preview_failed", {
            code: res.error.code,
            message: res.error.message,
          });
          return { ok: false, error: res.error };
        }
        return { ok: true, data: res.data };
      } catch (error) {
        return toInternalSearchError(
          logger,
          "search_replace_preview_exception",
          error,
        );
      }
    },
  );

  handleWithProjectAccess(
    "search:replace:execute",
    async (
      _e,
      payload: Parameters<SearchReplaceService["execute"]>[0],
    ): Promise<IpcResponse<SearchReplaceExecuteData>> => {
      if (!db || !replaceService) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      try {
        const res = replaceService.execute(payload);
        if (!res.ok) {
          logger.error("search_replace_execute_failed", {
            code: res.error.code,
            message: res.error.message,
          });
          return { ok: false, error: res.error };
        }
        return { ok: true, data: res.data };
      } catch (error) {
        return toInternalSearchError(
          logger,
          "search_replace_execute_exception",
          error,
        );
      }
    },
  );
}

function registerFtsHandlers(args: {
  handleWithProjectAccess: HandleWithProjectAccess;
  db: Database.Database | null;
  logger: Logger;
  ftsService: FtsService | null;
  readyIndexProjects: Set<string>;
}): void {
  const { handleWithProjectAccess, db, logger, ftsService, readyIndexProjects } = args;
  handleWithProjectAccess(
    "search:fts:query",
    async (
      _e,
      payload: unknown,
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
          documentOffset: number;
          score: number;
          updatedAt: number;
        }>;
        total: number;
        hasMore: boolean;
        indexState: "ready" | "rebuilding";
      }>
    > => {
      if (!db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (!hasProjectId(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }

      const safePayload = payload as {
        projectId: string;
        query: string;
        limit?: number;
        offset?: number;
      };
      if (payload && typeof payload === "object" && "scope" in payload) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message:
              "scope is not supported; search is limited to the current project",
          },
        };
      }
      const queryLength =
        typeof safePayload.query === "string"
          ? safePayload.query.trim().length
          : 0;

      try {
        const res = ftsService?.search({
          projectId: safePayload.projectId,
          query: safePayload.query,
          limit: safePayload.limit,
          offset: safePayload.offset,
        });
        if (!res) {
          return {
            ok: false,
            error: { code: "DB_ERROR", message: "Database not ready" },
          };
        }

        if (!res.ok) {
          if (res.error.code === "INVALID_ARGUMENT") {
            logger.info("search_fts_invalid_query", {
              queryLength: queryLength,
            });
          } else {
            logger.error("search_fts_failed", {
              code: res.error.code,
              message: res.error.message,
            });
          }
          return { ok: false, error: res.error };
        }

        logger.info("search_fts_query", {
          queryLength: queryLength,
          resultCount: res.data.results.length,
          indexState: res.data.indexState,
        });
        return { ok: true, data: res.data };
      } catch (error) {
        return toInternalSearchError(
          logger,
          "search_fts_query_exception",
          error,
        );
      }
    },
  );

  handleWithProjectAccess(
    "search:fts:reindex",
    async (
      _e,
      payload: unknown,
    ): Promise<
      IpcResponse<{
        indexState: "ready";
        reindexed: number;
      }>
    > => {
      if (!db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      if (!hasProjectId(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }

      const safePayload = payload as { projectId: string };

      try {
        const res = ftsService?.reindex({ projectId: safePayload.projectId });
        if (!res) {
          return {
            ok: false,
            error: { code: "DB_ERROR", message: "Database not ready" },
          };
        }
        if (!res.ok) {
          logger.error("search_fts_reindex_failed", {
            code: res.error.code,
            message: res.error.message,
          });
          return { ok: false, error: res.error };
        }

        logger.info("search_fts_reindex", {
          reindexed: res.data.reindexed,
        });
        readyIndexProjects.add(safePayload.projectId.trim());
        return { ok: true, data: res.data };
      } catch (error) {
        return toInternalSearchError(
          logger,
          "search_fts_reindex_exception",
          error,
        );
      }
    },
  );

  handleWithProjectAccess(
    "search:fts:indexstatus",
    async (
      _e,
      payload: unknown,
    ): Promise<IpcResponse<{ status: "ready" }>> => {
      if (!db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (!hasProjectId(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }

      const projectId = payload.projectId.trim();
      if (!readyIndexProjects.has(projectId)) {
        return {
          ok: false,
          error: {
            code: "SEARCH_INDEX_NOT_FOUND",
            message: "Index status unavailable",
          },
        };
      }

      return { ok: true, data: { status: "ready" } };
    },
  );
}

function registerRankingHandlers(args: {
  handleWithProjectAccess: HandleWithProjectAccess;
  db: Database.Database | null;
  logger: Logger;
  hybridRankingService: HybridRankingService | null;
}): void {
  const { handleWithProjectAccess, db, logger, hybridRankingService } = args;
  handleWithProjectAccess(
    "search:query:strategy",
    async (
      _e,
      payload: {
        projectId: string;
        query: string;
        strategy: "fts" | "semantic" | "hybrid";
        limit?: number;
        offset?: number;
      },
    ): Promise<
      IpcResponse<{
        traceId: string;
        costMs: number;
        strategy: "fts" | "semantic" | "hybrid";
        fallback: "fts" | "none";
        notice?: string;
        results: Array<{
          documentId: string;
          chunkId: string;
          snippet: string;
          finalScore: number;
          scoreBreakdown: {
            bm25: number;
            semantic: number;
            recency: number;
          };
          updatedAt: number;
        }>;
        total: number;
        hasMore: boolean;
        backpressure: {
          candidateLimit: number;
          candidateCount: number;
          truncated: boolean;
        };
      }>
    > => {
      if (!db || !hybridRankingService) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      try {
        const res = hybridRankingService.queryByStrategy(payload);
        if (!res.ok) {
          logger.error("search_query_strategy_failed", {
            code: res.error.code,
            message: res.error.message,
            strategy: payload.strategy,
          });
          return { ok: false, error: res.error };
        }
        logger.info("search_query_strategy", {
          strategy: payload.strategy,
          resultCount: res.data.results.length,
          total: res.data.total,
        });
        return { ok: true, data: res.data };
      } catch (error) {
        return toInternalSearchError(
          logger,
          "search_query_strategy_exception",
          error,
        );
      }
    },
  );

  handleWithProjectAccess(
    "search:rank:explain",
    async (
      _e,
      payload: {
        projectId: string;
        query: string;
        strategy: "fts" | "semantic" | "hybrid";
        documentId?: string;
        chunkId?: string;
        limit?: number;
        offset?: number;
      },
    ): Promise<
      IpcResponse<{
        strategy: "fts" | "semantic" | "hybrid";
        explanations: Array<{
          documentId: string;
          chunkId: string;
          snippet: string;
          finalScore: number;
          scoreBreakdown: {
            bm25: number;
            semantic: number;
            recency: number;
          };
          updatedAt: number;
        }>;
        total: number;
        backpressure: {
          candidateLimit: number;
          candidateCount: number;
          truncated: boolean;
        };
      }>
    > => {
      if (!db || !hybridRankingService) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      try {
        const res = hybridRankingService.rankExplain(payload);
        if (!res.ok) {
          logger.error("search_rank_explain_failed", {
            code: res.error.code,
            message: res.error.message,
            strategy: payload.strategy,
          });
          return { ok: false, error: res.error };
        }
        logger.info("search_rank_explain", {
          strategy: payload.strategy,
          explanationCount: res.data.explanations.length,
        });
        return { ok: true, data: res.data };
      } catch (error) {
        return toInternalSearchError(
          logger,
          "search_rank_explain_exception",
          error,
        );
      }
    },
  );
}

/**
 * Register `search:*` IPC handlers.
 *
 * Why: search must be deterministic and must not leak SQLite errors across IPC.
 */
export function registerSearchIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  semanticIndex?: SemanticChunkIndexService;
  semanticRetriever?: SemanticRetriever;
  hybridRankingService?: HybridRankingService;
  projectLifecycle?: ProjectLifecycle;
  projectSessionBinding?: ProjectSessionBindingRegistry;
}): void {
  const readyIndexProjects = new Set<string>();
  const ftsService = deps.db
    ? createFtsService({ db: deps.db, logger: deps.logger })
    : null;
  const replaceService = deps.db
    ? createSearchReplaceService({ db: deps.db, logger: deps.logger })
    : null;
  const semanticRetriever = deps.db
    ? (deps.semanticRetriever ??
      createSearchSemanticRetriever({
        db: deps.db,
        semanticIndex: deps.semanticIndex,
      }))
    : (deps.semanticRetriever ?? createNoopSemanticRetriever());
  const hybridRankingService =
    deps.hybridRankingService ??
    (ftsService
      ? createHybridRankingService({
          ftsService,
          semanticRetriever,
          logger: deps.logger,
        })
      : null);

  const handleWithProjectAccess = createProjectAccessHandler({
    ipcMain: deps.ipcMain,
    projectSessionBinding: deps.projectSessionBinding,
  });

  registerFtsHandlers({
    handleWithProjectAccess,
    db: deps.db,
    logger: deps.logger,
    ftsService,
    readyIndexProjects,
  });
  registerRankingHandlers({
    handleWithProjectAccess,
    db: deps.db,
    logger: deps.logger,
    hybridRankingService,
  });
  registerSearchReplaceHandlers(
    handleWithProjectAccess,
    deps.db,
    deps.logger,
    replaceService,
  );

  deps.projectLifecycle?.register({
    id: "search",
    unbind: ({ projectId }) => {
      readyIndexProjects.delete(projectId);
    },
    bind: ({ projectId }) => {
      // Warm the FTS index for the newly bound project so that
      // `search:fts:indexstatus` returns "ready" without requiring an
      // explicit `search:fts:reindex` call from the renderer.
      if (ftsService) {
        const res = ftsService.reindex({ projectId });
        if (res?.ok) {
          readyIndexProjects.add(projectId);
          deps.logger.info("search_fts_bind_reindex", {
            projectId,
            reindexed: res.data.reindexed,
          });
        }
      }
    },
  });
}
