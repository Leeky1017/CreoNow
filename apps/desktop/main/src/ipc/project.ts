import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import { createProjectService } from "../services/projects/projectService";

/**
 * Register `project:*` IPC handlers.
 *
 * Why: project lifecycle is the stable V1 entry point for documents/context.
 */
export function registerProjectIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  userDataDir: string;
  logger: Logger;
}): void {
  deps.ipcMain.handle(
    "project:create",
    async (
      _e,
      payload: { name?: string },
    ): Promise<IpcResponse<{ projectId: string; rootPath: string }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createProjectService({
        db: deps.db,
        userDataDir: deps.userDataDir,
        logger: deps.logger,
      });
      const res = svc.create({ name: payload.name });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:list",
    async (): Promise<
      IpcResponse<{
        items: Array<{
          projectId: string;
          name: string;
          rootPath: string;
          updatedAt: number;
        }>;
      }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createProjectService({
        db: deps.db,
        userDataDir: deps.userDataDir,
        logger: deps.logger,
      });
      const res = svc.list();
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:getCurrent",
    async (): Promise<IpcResponse<{ projectId: string; rootPath: string }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createProjectService({
        db: deps.db,
        userDataDir: deps.userDataDir,
        logger: deps.logger,
      });
      const res = svc.getCurrent();
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:setCurrent",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<IpcResponse<{ projectId: string; rootPath: string }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createProjectService({
        db: deps.db,
        userDataDir: deps.userDataDir,
        logger: deps.logger,
      });
      const res = svc.setCurrent({ projectId: payload.projectId });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:delete",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<IpcResponse<{ deleted: true }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      const svc = createProjectService({
        db: deps.db,
        userDataDir: deps.userDataDir,
        logger: deps.logger,
      });
      const res = svc.delete({ projectId: payload.projectId });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );
}
