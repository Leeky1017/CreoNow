/**
 * IPC handler: engagement:storystatus:get
 *
 * ## 职责：将 StoryStatusService 暴露给 Renderer 进程
 * ## 不做什么：不含业务逻辑，仅转发；不直调 DB（通过 Service）
 * ## 依赖方向：IPC → Service Layer（INV-7 当前允许直调 Service）
 * ## 关键不变量：INV-4（无 LLM），INV-9（无 AI 成本）
 *
 * 缓存失效机制：
 *   StoryStatusService 使用 30s TTL + 文档/KG 双时间戳校验自动失效（stamp-based）。
 *   本 handler 不维护额外事件订阅，避免监听器与事件源漂移。
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
import type { ProjectSessionBindingRegistry } from "./projectSessionBinding";

export function registerEngagementIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
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

      const service = getService()!;

      const result = service.getStoryStatus({ projectId });
      return result.ok
        ? { ok: true, data: result.data }
        : { ok: false, error: result.error };
    },
  );
}
