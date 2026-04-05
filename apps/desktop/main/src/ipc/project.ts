import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import { createProjectService } from "../services/projects/projectService";
import type { ProjectLifecycle } from "../services/projects/projectLifecycle";
import {
  createProjectManager,
  type ProjectConfig,
  type ProjectDocument,
  type ProjectManager,
  type ProjectOverview,
  type ProjectStyleConfig,
} from "../services/project/projectManager";
import { guardAndNormalizeProjectAccess } from "./projectAccessGuard";
import type { ProjectSessionBindingRegistry } from "./projectSessionBinding";

type ProjectHandlerDeps = {
  ipcMain: IpcMain;
  db: Database.Database | null;
  userDataDir: string;
  logger: Logger;
  projectSessionBinding?: ProjectSessionBindingRegistry;
  projectLifecycle?: ProjectLifecycle;
};

function registerProjectCrudHandlers(deps: ProjectHandlerDeps): void {
  deps.ipcMain.handle(
    "project:project:create",
    async (
      _e,
      payload: {
        name?: string;
        type?: "novel" | "screenplay" | "media";
        description?: string;
        template?:
          | {
              kind: "builtin";
              id: string;
            }
          | {
              kind: "custom";
              structure: {
                folders: string[];
                files: Array<{ path: string; content?: string }>;
              };
            };
      },
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
        template: payload.template,
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
}

function registerProjectSessionAndLifecycleHandlers(
  deps: ProjectHandlerDeps,
): void {
  deps.ipcMain.handle(
    "project:project:getcurrent",
    async (
      event,
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
      const res = svc.getCurrent();
      if (res.ok) {
        deps.projectSessionBinding?.bind({
          webContentsId: event.sender.id,
          projectId: res.data.projectId,
        });
      }
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:project:setcurrent",
    async (
      event,
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
      if (res.ok) {
        deps.projectSessionBinding?.bind({
          webContentsId: event.sender.id,
          projectId: res.data.projectId,
        });
      }
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:project:switch",
    async (
      event,
      payload: {
        projectId: string;
        fromProjectId: string;
        operatorId: string;
        traceId: string;
      },
    ): Promise<
      IpcResponse<{
        currentProjectId: string;
        switchedAt: string;
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

      const traceId = payload.traceId;
      const lifecycle = deps.projectLifecycle;
      const res = lifecycle
        ? await lifecycle.switchProject({
            fromProjectId: payload.fromProjectId,
            toProjectId: payload.projectId,
            traceId,
            persist: async () => {
              return svc.switchProject({
                projectId: payload.projectId,
                fromProjectId: payload.fromProjectId,
                operatorId: payload.operatorId,
                traceId,
              });
            },
            resolveBindProjectId: ({ fromProjectId, toProjectId, result }) => {
              return result.ok ? toProjectId : fromProjectId;
            },
          })
        : svc.switchProject({
            projectId: payload.projectId,
            fromProjectId: payload.fromProjectId,
            operatorId: payload.operatorId,
            traceId,
          });
      if (res.ok) {
        deps.projectSessionBinding?.bind({
          webContentsId: event.sender.id,
          projectId: res.data.currentProjectId,
        });
      }
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

  deps.ipcMain.handle(
    "project:lifecycle:archive",
    async (
      _e,
      payload: { projectId: string; traceId?: string },
    ): Promise<
      IpcResponse<{
        projectId: string;
        state: "active" | "archived" | "deleted";
        archivedAt?: number;
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
      const res = svc.lifecycleArchive({
        projectId: payload.projectId,
        traceId: payload.traceId,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:lifecycle:restore",
    async (
      _e,
      payload: { projectId: string; traceId?: string },
    ): Promise<
      IpcResponse<{
        projectId: string;
        state: "active" | "archived" | "deleted";
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
      const res = svc.lifecycleRestore({
        projectId: payload.projectId,
        traceId: payload.traceId,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:lifecycle:purge",
    async (
      _e,
      payload: { projectId: string; traceId?: string },
    ): Promise<
      IpcResponse<{
        projectId: string;
        state: "active" | "archived" | "deleted";
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
      const res = svc.lifecyclePurge({
        projectId: payload.projectId,
        traceId: payload.traceId,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "project:lifecycle:get",
    async (
      _e,
      payload: { projectId: string; traceId?: string },
    ): Promise<
      IpcResponse<{
        projectId: string;
        state: "active" | "archived" | "deleted";
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
      const res = svc.lifecycleGet({
        projectId: payload.projectId,
        traceId: payload.traceId,
      });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );
}

// ─── P3: Project Config IPC types ──

type ProjectConfigResponse = {
  id: string;
  name: string;
  type: string;
  description: string;
  stage: string;
  genre: string;
  wordCountGoal?: number;
  autoSave: boolean;
  narrativePerson: string;
  languageStyle: string;
  targetAudience: string;
  updatedAt: number;
};

type ConfigUpdatePatch = {
  genre?: string;
  wordCountGoal?: number;
  autoSave?: boolean;
  narrativePerson?: string;
  languageStyle?: string;
  targetAudience?: string;
};

// ─── Helpers ──

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

function notReady<T>(): IpcResponse<T> {
  return {
    ok: false,
    error: { code: "DB_ERROR", message: "Database not ready" },
  };
}

interface EventBusLike {
  emit(event: Record<string, unknown>): void;
  on(event: string, handler: (payload: Record<string, unknown>) => void): void;
  off(event: string, handler: (payload: Record<string, unknown>) => void): void;
}

function projectConfigFromManager(config: ProjectConfig): ProjectConfigResponse {
  return {
    id: config.id,
    name: config.name,
    type: config.type,
    description: config.description,
    stage: config.stage,
    genre: config.style.genre,
    wordCountGoal: config.goals.targetWordCount,
    autoSave: true,
    narrativePerson: config.style.narrativePerson,
    languageStyle: config.style.languageStyle,
    targetAudience: config.style.targetAudience,
    updatedAt: config.updatedAt,
  };
}

function registerProjectConfigHandlers(deps: ProjectHandlerDeps): void {
  let manager: ProjectManager | null = null;

  const noopEventBus: EventBusLike = {
    emit: () => {},
    on: () => {},
    off: () => {},
  };

  function getManager(): ProjectManager | null {
    if (!deps.db) return null;
    if (!manager) {
      manager = createProjectManager({
        db: deps.db as never,
        eventBus: noopEventBus,
      });
    }
    return manager;
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

  // ── project:config:get ──

  handleWithProjectAccess(
    "project:config:get",
    async (
      _event,
      payload: { projectId: string },
    ): Promise<IpcResponse<ProjectConfigResponse>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const mgr = getManager();
      if (!mgr) return notReady<ProjectConfigResponse>();

      const res = await mgr.getProject(payload.projectId);
      if (res.success && res.data) {
        return { ok: true, data: projectConfigFromManager(res.data) };
      }
      return {
        ok: false,
        error: {
          code: (res.error?.code ?? "PROJECT_NOT_FOUND") as "PROJECT_NOT_FOUND",
          message: res.error?.message ?? "Project not found",
        },
      };
    },
  );

  // ── project:config:update ──

  handleWithProjectAccess(
    "project:config:update",
    async (
      _event,
      payload: { projectId: string; patch: ConfigUpdatePatch },
    ): Promise<IpcResponse<ProjectConfigResponse>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const mgr = getManager();
      if (!mgr) return notReady<ProjectConfigResponse>();

      if (!isRecord(payload.patch)) {
        return {
          ok: false,
          error: { code: "PROJECT_CONFIG_INVALID", message: "patch must be an object" },
        };
      }

      const updates: Partial<ProjectConfig> = {};
      if (payload.patch.genre !== undefined) {
        updates.style = { ...updates.style } as ProjectStyleConfig;
        updates.style.genre = payload.patch.genre;
      }
      if (payload.patch.narrativePerson !== undefined) {
        updates.style = { ...(updates.style ?? {}) } as ProjectStyleConfig;
        updates.style.narrativePerson = payload.patch.narrativePerson as ProjectStyleConfig["narrativePerson"];
      }
      if (payload.patch.languageStyle !== undefined) {
        updates.style = { ...(updates.style ?? {}) } as ProjectStyleConfig;
        updates.style.languageStyle = payload.patch.languageStyle;
      }
      if (payload.patch.targetAudience !== undefined) {
        updates.style = { ...(updates.style ?? {}) } as ProjectStyleConfig;
        updates.style.targetAudience = payload.patch.targetAudience;
      }
      if (payload.patch.wordCountGoal !== undefined) {
        updates.goals = { ...(updates.goals ?? {}) } as ProjectConfig["goals"];
        updates.goals.targetWordCount = payload.patch.wordCountGoal;
      }

      const res = await mgr.updateProject(payload.projectId, updates);
      if (res.success && res.data) {
        return { ok: true, data: projectConfigFromManager(res.data) };
      }
      return {
        ok: false,
        error: {
          code: (res.error?.code ?? "PROJECT_NOT_FOUND") as "PROJECT_NOT_FOUND",
          message: res.error?.message ?? "Update failed",
        },
      };
    },
  );

  // ── project:style:get ──

  handleWithProjectAccess(
    "project:style:get",
    async (
      _event,
      payload: { projectId: string },
    ): Promise<IpcResponse<ProjectStyleConfig>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const mgr = getManager();
      if (!mgr) return notReady<ProjectStyleConfig>();

      const res = await mgr.getStyleConfig(payload.projectId);
      if (res.success && res.data) {
        return { ok: true, data: res.data };
      }
      return {
        ok: false,
        error: {
          code: (res.error?.code ?? "PROJECT_NOT_FOUND") as "PROJECT_NOT_FOUND",
          message: res.error?.message ?? "Style config not found",
        },
      };
    },
  );

  // ── project:documents:list ──

  handleWithProjectAccess(
    "project:documents:list",
    async (
      _event,
      payload: { projectId: string; type?: string },
    ): Promise<IpcResponse<{ items: ProjectDocument[] }>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const mgr = getManager();
      if (!mgr) return notReady<{ items: ProjectDocument[] }>();

      const res = await mgr.listDocuments(payload.projectId, {
        type: payload.type,
      });
      if (res.success) {
        return { ok: true, data: { items: res.data ?? [] } };
      }
      return {
        ok: false,
        error: {
          code: (res.error?.code ?? "PROJECT_NOT_FOUND") as "PROJECT_NOT_FOUND",
          message: res.error?.message ?? "List failed",
        },
      };
    },
  );

  // ── project:overview:get ──

  handleWithProjectAccess(
    "project:overview:get",
    async (
      _event,
      payload: { projectId: string },
    ): Promise<IpcResponse<ProjectOverview>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const mgr = getManager();
      if (!mgr) return notReady<ProjectOverview>();

      const pidErr = validateNonEmptyString(payload.projectId, "projectId");
      if (pidErr) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: pidErr },
        };
      }

      const res = await mgr.getOverview(payload.projectId);
      if (res.success && res.data) {
        return { ok: true, data: res.data };
      }
      return {
        ok: false,
        error: {
          code: (res.error?.code ?? "PROJECT_NOT_FOUND") as "PROJECT_NOT_FOUND",
          message: res.error?.message ?? "Overview unavailable",
        },
      };
    },
  );
}

/**
 * Register `project:*` IPC handlers.
 *
 * Why: project lifecycle is the stable V1 entry point for documents/context.
 */
export function registerProjectIpcHandlers(deps: ProjectHandlerDeps): void {
  registerProjectCrudHandlers(deps);
  registerProjectSessionAndLifecycleHandlers(deps);
  registerProjectConfigHandlers(deps);
}
