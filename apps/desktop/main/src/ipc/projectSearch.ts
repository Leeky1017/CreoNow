import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import {
  createProjectSearch,
  type ProjectSearch,
  type ProjectSearchResponse,
} from "../services/search/projectSearch";
import { guardAndNormalizeProjectAccess } from "./projectAccessGuard";
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

// ─── Helpers ────────────────────────────────────────────────────────

const MAX_QUERY_LENGTH = 500;

function notReady<T>(): IpcResponse<T> {
  return {
    ok: false,
    error: { code: "DB_ERROR", message: "Database not ready" },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateNonEmptyString(
  value: unknown,
  fieldName: string,
): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  return null;
}

interface EventBusLike {
  emit(event: Record<string, unknown>): void;
  on(event: string, handler: (payload: Record<string, unknown>) => void): void;
  off(
    event: string,
    handler: (payload: Record<string, unknown>) => void,
  ): void;
}

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

  const noopEventBus: EventBusLike = {
    emit: () => {},
    on: () => {},
    off: () => {},
  };

  function getSearch(): ProjectSearch | null {
    if (!deps.db) return null;
    if (!search) {
      search = createProjectSearch({
        db: deps.db as never,
        eventBus: deps.eventBus ?? noopEventBus,
      });
    }
    return search;
  }

  function handleWithProjectAccess<TPayload, TResponse>(
    channel: string,
    listener: (
      event: unknown,
      payload: TPayload,
    ) => Promise<IpcResponse<TResponse>>,
  ): void {
    deps.ipcMain.handle(channel, async (event, payload) => {
      const guarded = guardAndNormalizeProjectAccess({
        event,
        payload,
        projectSessionBinding: deps.projectSessionBinding,
      });
      if (!guarded.ok) {
        return guarded.response as IpcResponse<TResponse>;
      }
      return listener(event, payload as TPayload);
    });
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
    },
  );

  // ── search:project:indexstatus ──

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
    },
  );
}
