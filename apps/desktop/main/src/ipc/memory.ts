import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import {
  createMemoryService,
  type MemoryInjectionPreview,
  type MemoryScope,
  type MemorySettings,
  type MemoryType,
  type UserMemoryItem,
} from "../services/memory/memoryService";

type MemoryCreatePayload = {
  type: MemoryType;
  scope: MemoryScope;
  projectId?: string;
  content: string;
};

type MemoryListPayload = {
  projectId?: string;
  includeDeleted?: boolean;
};

type MemoryUpdatePayload = {
  memoryId: string;
  patch: Partial<
    Pick<UserMemoryItem, "type" | "scope" | "projectId" | "content">
  >;
};

type MemoryDeletePayload = { memoryId: string };

/**
 * Register `memory:*` IPC handlers.
 */
export function registerMemoryIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
}): void {
  deps.ipcMain.handle(
    "memory:create",
    async (
      _e,
      payload: MemoryCreatePayload,
    ): Promise<IpcResponse<UserMemoryItem>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createMemoryService({ db: deps.db, logger: deps.logger });
      const res = svc.create(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "memory:list",
    async (
      _e,
      payload: MemoryListPayload,
    ): Promise<IpcResponse<{ items: UserMemoryItem[] }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createMemoryService({ db: deps.db, logger: deps.logger });
      const res = svc.list(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "memory:update",
    async (
      _e,
      payload: MemoryUpdatePayload,
    ): Promise<IpcResponse<UserMemoryItem>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createMemoryService({ db: deps.db, logger: deps.logger });
      const res = svc.update({
        memoryId: payload.memoryId,
        patch: payload.patch,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "memory:delete",
    async (
      _e,
      payload: MemoryDeletePayload,
    ): Promise<IpcResponse<{ deleted: true }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createMemoryService({ db: deps.db, logger: deps.logger });
      const res = svc.delete({ memoryId: payload.memoryId });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "memory:settings:get",
    async (): Promise<IpcResponse<MemorySettings>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createMemoryService({ db: deps.db, logger: deps.logger });
      const res = svc.getSettings();
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "memory:settings:update",
    async (
      _e,
      payload: { patch: Partial<MemorySettings> },
    ): Promise<IpcResponse<MemorySettings>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createMemoryService({ db: deps.db, logger: deps.logger });
      const res = svc.updateSettings(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "memory:injection:preview",
    async (
      _e,
      payload: { projectId?: string; queryText?: string },
    ): Promise<IpcResponse<MemoryInjectionPreview>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createMemoryService({ db: deps.db, logger: deps.logger });
      const res = svc.previewInjection(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );
}
