import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import {
  createProjectSearch,
  type ProjectSearch,
  type ProjectSearchResponse,
} from "../services/search/projectSearch";
import {
  type EventBusLike,
  createProjectAccessHandler,
  isRecord,
  notReady,
  validateNonEmptyString,
  NOOP_EVENT_BUS,
} from "./helpers";
import type { ProjectSessionBindingRegistry } from "./projectSessionBinding";

// ─── Payload types ──────────────────────────────────────────────────

type SearchQueryPayload = {
  projectId: string;
  query: string;
  offset?: number;
  limit?: number;
};

type ReindexPayload = {
  projectId: string;
};

type IndexStatusPayload = {
  projectId: string;
};

// ─── Constants ──────────────────────────────────────────────────────

const MAX_QUERY_LENGTH = 500;

/**
 * Register `search:project:*` IPC handlers (project-scoped full-text search).
 *
 * Why: P3 需要项目范围的全文搜索能力，区别于通用 search:fts:* 通道。
 * 项目搜索在 projectSearch 服务层完成索引管理和查询。
 */
export function registerProjectSearchIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  projectSessionBinding?: ProjectSessionBindingRegistry;
  eventBus?: EventBusLike;
}): void {
  let search: ProjectSearch | null = null;

  const handleWithProjectAccess = createProjectAccessHandler({
    ipcMain: deps.ipcMain,
    projectSessionBinding: deps.projectSessionBinding,
  });

  function getSearch(): ProjectSearch | null {
    if (!deps.db) return null;
    if (!search) {
      search = createProjectSearch({
        db: deps.db,
        eventBus: deps.eventBus ?? NOOP_EVENT_BUS,
      });
    }
    return search;
  }

  // ── search:project:query ──

  handleWithProjectAccess(
    "search:project:query",
    async (
      _event,
      payload: SearchQueryPayload,
    ): Promise<IpcResponse<ProjectSearchResponse>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getSearch();
      if (!svc) return notReady<ProjectSearchResponse>();

      const queryErr = validateNonEmptyString(payload.query, "query");
      if (queryErr) {
        return {
          ok: false,
          error: { code: "SEARCH_QUERY_EMPTY", message: queryErr },
        };
      }

      if (payload.query.length > MAX_QUERY_LENGTH) {
        return {
          ok: false,
          error: { code: "SEARCH_QUERY_TOO_LONG", message: `query exceeds ${MAX_QUERY_LENGTH} characters` },
        };
      }

      try {
        const res = await svc.search({
          projectId: payload.projectId,
          query: payload.query,
          offset: payload.offset,
          limit: payload.limit,
        });

        if (res.ok) {
          return { ok: true, data: res.data };
        }
        return {
          ok: false,
          error: {
            code: (res.error?.code ?? "INTERNAL_ERROR") as "SEARCH_QUERY_EMPTY",
            message: res.error?.message ?? "Search failed",
          },
        };
      } catch (error) {
        deps.logger.error("ipc_search_unexpected_error", {
          channel: "search:project:query",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected search error" },
        };
      }
    },
  );

  // ── search:project:reindex ──

  handleWithProjectAccess(
    "search:project:reindex",
    async (
      _event,
      payload: ReindexPayload,
    ): Promise<IpcResponse<{ rebuilt: true }>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getSearch();
      if (!svc) return notReady<{ rebuilt: true }>();

      try {
        const res = await svc.rebuildIndex(payload.projectId);
        if (res.ok) {
          return { ok: true, data: { rebuilt: true } };
        }
        return {
          ok: false,
          error: {
            code: (res.error?.code ?? "INTERNAL_ERROR") as "INTERNAL_ERROR",
            message: res.error?.message ?? "Reindex failed",
          },
        };
      } catch (error) {
        deps.logger.error("ipc_search_unexpected_error", {
          channel: "search:project:reindex",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected reindex error" },
        };
      }
    },
  );

  // ── search:project:indexstatus ──
  // NOTE: Spec 中使用 kebab-case (index-status)，但合约生成器要求 [a-z0-9] only。

  handleWithProjectAccess(
    "search:project:indexstatus",
    async (
      _event,
      payload: IndexStatusPayload,
    ): Promise<IpcResponse<{ status: string }>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getSearch();
      if (!svc) return notReady<{ status: string }>();

      try {
        const res = await svc.getIndexStatus(payload.projectId);
        if (res.ok) {
          return { ok: true, data: res.data };
        }
        return {
          ok: false,
          error: {
            code: (res.error?.code ?? "SEARCH_INDEX_NOT_FOUND") as "SEARCH_INDEX_NOT_FOUND",
            message: res.error?.message ?? "Index status unavailable",
          },
        };
      } catch (error) {
        deps.logger.error("ipc_search_unexpected_error", {
          channel: "search:project:indexstatus",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected index status error" },
        };
      }
    },
  );
}
