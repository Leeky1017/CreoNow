import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type {
  IpcErrorCode,
  IpcResponse,
} from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import { createAiProxySettingsService } from "../services/ai/aiProxySettingsService";

type ProxySettingsPatch = Partial<{
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
}>;

/**
 * Register `ai:proxy:*` IPC handlers.
 *
 * Why: renderer must not access secrets; proxy config is persisted in main DB
 * and queried via typed IPC.
 */
export function registerAiProxyIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
}): void {
  deps.ipcMain.handle(
    "ai:proxy:settings:get",
    async (): Promise<
      IpcResponse<{ enabled: boolean; baseUrl: string; apiKeyConfigured: boolean }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createAiProxySettingsService({ db: deps.db, logger: deps.logger });
      const res = svc.get();
      return res.ok ? { ok: true, data: res.data } : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "ai:proxy:settings:update",
    async (
      _e,
      payload: { patch: ProxySettingsPatch },
    ): Promise<
      IpcResponse<{ enabled: boolean; baseUrl: string; apiKeyConfigured: boolean }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createAiProxySettingsService({ db: deps.db, logger: deps.logger });
      const res = svc.update({ patch: payload.patch });
      return res.ok ? { ok: true, data: res.data } : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "ai:proxy:test",
    async (): Promise<
      IpcResponse<{
        ok: boolean;
        latencyMs: number;
        error?: { code: IpcErrorCode; message: string };
      }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createAiProxySettingsService({ db: deps.db, logger: deps.logger });
      const res = await svc.test();
      return res.ok ? { ok: true, data: res.data } : { ok: false, error: res.error };
    },
  );
}
