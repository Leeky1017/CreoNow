import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import {
  createSkillService,
  type SkillListItem,
} from "../services/skills/skillService";

/**
 * Register `skill:*` IPC handlers.
 *
 * Why: skills are loaded/validated in the main process (filesystem + DB + logs),
 * while the renderer only consumes typed, deterministic results.
 */
export function registerSkillIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  userDataDir: string;
  builtinSkillsDir: string;
  logger: Logger;
}): void {
  deps.ipcMain.handle(
    "skill:list",
    async (
      _e,
      payload: { includeDisabled?: boolean },
    ): Promise<IpcResponse<{ items: SkillListItem[] }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      const svc = createSkillService({
        db: deps.db,
        userDataDir: deps.userDataDir,
        builtinSkillsDir: deps.builtinSkillsDir,
        logger: deps.logger,
      });
      const res = svc.list({ includeDisabled: payload.includeDisabled });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "skill:read",
    async (
      _e,
      payload: { id: string },
    ): Promise<IpcResponse<{ id: string; content: string }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      const svc = createSkillService({
        db: deps.db,
        userDataDir: deps.userDataDir,
        builtinSkillsDir: deps.builtinSkillsDir,
        logger: deps.logger,
      });
      const res = svc.read({ id: payload.id });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "skill:write",
    async (
      _e,
      payload: { id: string; content: string },
    ): Promise<
      IpcResponse<{
        id: string;
        scope: "builtin" | "global" | "project";
        written: true;
      }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      const svc = createSkillService({
        db: deps.db,
        userDataDir: deps.userDataDir,
        builtinSkillsDir: deps.builtinSkillsDir,
        logger: deps.logger,
      });
      const res = svc.write({ id: payload.id, content: payload.content });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "skill:toggle",
    async (
      _e,
      payload: { id: string; enabled: boolean },
    ): Promise<IpcResponse<{ id: string; enabled: boolean }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }

      const svc = createSkillService({
        db: deps.db,
        userDataDir: deps.userDataDir,
        builtinSkillsDir: deps.builtinSkillsDir,
        logger: deps.logger,
      });
      const res = svc.toggle({ id: payload.id, enabled: payload.enabled });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );
}
