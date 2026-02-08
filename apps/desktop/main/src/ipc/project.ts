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
    "project:project:create",
    async (
      _e,
      payload: { name?: string; type?: "novel" | "screenplay" | "media"; description?: string },
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
      const res = svc.create({
        name: payload.name,
        type: payload.type,
        description: payload.description,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:project:createaiassist",
    async (
      _e,
      payload: { prompt: string },
    ): Promise<
      IpcResponse<{
        name: string;
        type: "novel" | "screenplay" | "media";
        description: string;
        chapterOutlines: string[];
        characters: string[];
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
      const res = svc.createAiAssistDraft({ prompt: payload.prompt });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:project:list",
    async (
      _e,
      payload: { includeArchived?: boolean },
    ): Promise<
      IpcResponse<{
        items: Array<{
          projectId: string;
          name: string;
          rootPath: string;
          type: "novel" | "screenplay" | "media";
          stage: "outline" | "draft" | "revision" | "final";
          updatedAt: number;
          archivedAt?: number;
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
      const res = svc.list({ includeArchived: payload.includeArchived });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:project:update",
    async (
      _e,
      payload: {
        projectId: string;
        patch: {
          type?: "novel" | "screenplay" | "media";
          description?: string;
          stage?: "outline" | "draft" | "revision" | "final";
          targetWordCount?: number | null;
          targetChapterCount?: number | null;
          narrativePerson?: "first" | "third-limited" | "third-omniscient";
          languageStyle?: string;
          targetAudience?: string;
          defaultSkillSetId?: string | null;
          knowledgeGraphId?: string | null;
        };
      },
    ): Promise<IpcResponse<{ updated: true }>> => {
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
      const res = svc.update({
        projectId: payload.projectId,
        patch: payload.patch,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:project:stats",
    async (): Promise<
      IpcResponse<{ total: number; active: number; archived: number }>
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
      const res = svc.stats();
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:project:rename",
    async (
      _e,
      payload: { projectId: string; name: string },
    ): Promise<
      IpcResponse<{ projectId: string; name: string; updatedAt: number }>
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
      const res = svc.rename({
        projectId: payload.projectId,
        name: payload.name,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:project:duplicate",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<
      IpcResponse<{ projectId: string; rootPath: string; name: string }>
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
      const res = svc.duplicate({ projectId: payload.projectId });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:project:archive",
    async (
      _e,
      payload: { projectId: string; archived: boolean },
    ): Promise<
      IpcResponse<{ projectId: string; archived: boolean; archivedAt?: number }>
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
      const res = svc.archive({
        projectId: payload.projectId,
        archived: payload.archived,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:project:getcurrent",
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
    "project:project:setcurrent",
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
    "project:project:delete",
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
