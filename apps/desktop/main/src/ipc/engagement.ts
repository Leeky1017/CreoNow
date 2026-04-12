/**
 * IPC handler: engagement:storystatus:get
 *
 * ## 职责：将 StoryStatusService 暴露给 Renderer 进程
 * ## 不做什么：不含业务逻辑，仅转发；不直调 DB（通过 Service）
 * ## 依赖方向：IPC → Service Layer（INV-7 当前允许直调 Service）
 * ## 关键不变量：INV-4（无 LLM），INV-9（无 AI 成本）
 *
 * 文档变更失效：
 *   documents:* 写操作后，调用方负责触发 invalidateCache(projectId)。
 *   当前在同一 handler 文件中通过事件总线监听（EventBusLike）实现。
 */

import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import {
  createStoryStatusService,
  type StoryStatusSummary,
} from "../services/engagement/storyStatusService";
import { createProjectAccessHandler, isRecord, notReady } from "./helpers";
import type { EventBusLike } from "./helpers";
import type { ProjectSessionBindingRegistry } from "./projectSessionBinding";

export function registerEngagementIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  eventBus?: EventBusLike;
  projectSessionBinding?: ProjectSessionBindingRegistry;
}): void {
  const handleWithProjectAccess = createProjectAccessHandler({
    ipcMain: deps.ipcMain,
    projectSessionBinding: deps.projectSessionBinding,
  });

  // 惰性创建 service（db 可能在 app ready 后才就绪）
  let svc: ReturnType<typeof createStoryStatusService> | null = null;

  function getService() {
    if (!deps.db) {
      return null;
    }
    if (!svc) {
      svc = createStoryStatusService({ db: deps.db, logger: deps.logger });

      // 监听文档变更事件，触发缓存失效
      // Why: 文档更新时摘要可能过期，直接失效保证下次调用拿到新数据（<30s 内）
      if (deps.eventBus) {
        deps.eventBus.on(
          "document:updated",
          (payload: Record<string, unknown>) => {
            const projectId =
              typeof payload.projectId === "string" ? payload.projectId : null;
            if (projectId && svc) {
              svc.invalidateCache(projectId);
            }
          },
        );
        deps.eventBus.on(
          "document:deleted",
          (payload: Record<string, unknown>) => {
            const projectId =
              typeof payload.projectId === "string" ? payload.projectId : null;
            if (projectId && svc) {
              svc.invalidateCache(projectId);
            }
          },
        );
      }
    }
    return svc;
  }

  handleWithProjectAccess(
    "engagement:storystatus:get",
    async (
      _e,
      payload: unknown,
    ): Promise<IpcResponse<StoryStatusSummary>> => {
      if (!deps.db) {
        return notReady<StoryStatusSummary>();
      }

      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const projectId = payload.projectId;
      if (typeof projectId !== "string" || projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }

      const service = getService();
      if (!service) {
        return notReady<StoryStatusSummary>();
      }

      const result = service.getStoryStatus({ projectId });
      return result.ok
        ? { ok: true, data: result.data }
        : { ok: false, error: result.error };
    },
  );
}
