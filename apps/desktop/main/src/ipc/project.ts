import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import { trieCacheInvalidate, trieCachePrime, type MatchableEntity } from "../services/kg/entityMatcher";
import { createKnowledgeGraphService } from "../services/kg/kgService";
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
import type { ProjectSessionBindingRegistry } from "./projectSessionBinding";
import {
  createProjectAccessHandler,
  isRecord,
  notReady,
  validateNonEmptyString,
  type EventBusLike,
  NOOP_EVENT_BUS,
} from "./helpers";

type ProjectHandlerDeps = {
  ipcMain: IpcMain;
  db: Database.Database | null;
  userDataDir: string;
  logger: Logger;
  projectSessionBinding?: ProjectSessionBindingRegistry;
  projectLifecycle?: ProjectLifecycle;
  eventBus?: EventBusLike;
};

function primeTrieCacheForProject(args: {
  db: Database.Database;
  logger: Logger;
  projectId: string;
}): void {
  try {
    const kgService = createKnowledgeGraphService({
      db: args.db,
      logger: args.logger,
    });
    const listed = kgService.entityList({
      projectId: args.projectId,
      filter: { aiContextLevel: "when_detected" },
    });
    if (!listed.ok) {
      return;
    }

    const entities: MatchableEntity[] = listed.data.items.map((entity) => ({
      id: entity.id,
      name: entity.name,
      aliases: entity.aliases,
      aiContextLevel: entity.aiContextLevel,
    }));
    trieCachePrime({
      cacheKey: args.projectId,
      entities,
    });
  } catch (error) {
    // Best effort warmup only: project switch/getCurrent must not fail due cache.
    // INV-10: errors must still be logged, never silently swallowed (§七).
    args.logger.info("trie_cache_warmup_failed", { projectId: args.projectId, error: String(error) });
  }
}

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
    "project:project:stats",
    async (): Promise<
      IpcResponse<{
        total: number;
        active: number;
        archived: number;
        totalWordCount: number;
        overallProgressPercent: number;
        perProject: Array<{
          projectId: string;
          wordCount: number;
          targetWordCount: number | null;
          progressPercent: number;
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
        primeTrieCacheForProject({
          db: deps.db,
          logger: deps.logger,
          projectId: res.data.projectId,
        });
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
        primeTrieCacheForProject({
          db: deps.db,
          logger: deps.logger,
          projectId: res.data.projectId,
        });
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
        primeTrieCacheForProject({
          db: deps.db,
          logger: deps.logger,
          projectId: res.data.currentProjectId,
        });
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
      if (res.ok) {
        trieCacheInvalidate(payload.projectId);
      }
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
  type: "novel" | "screenplay" | "media";
  description: string;
  stage: "outline" | "draft" | "revision" | "final";
  lifecycleStatus: "active" | "archived" | "deleted";
  style: ProjectStyleConfig;
  goals: {
    targetWordCount: number | null;
    targetChapterCount: number | null;
  };
  defaultSkillSetId: string | null;
  knowledgeGraphId: string | null;
  createdAt: number;
  updatedAt: number;
};

type ConfigUpdatePatch = {
  name?: string;
  type?: "novel" | "screenplay" | "media";
  description?: string;
  stage?: "outline" | "draft" | "revision" | "final";
  lifecycleStatus?: "active" | "archived" | "deleted";
  style?: Partial<ProjectStyleConfig>;
  goals?: Partial<{
    targetWordCount: number | null;
    targetChapterCount: number | null;
  }>;
  defaultSkillSetId?: string | null;
  knowledgeGraphId?: string | null;
};

function projectConfigFromManager(config: ProjectConfig): ProjectConfigResponse {
  return {
    id: config.id,
    name: config.name,
    type: config.type as ProjectConfigResponse["type"],
    description: config.description,
    stage: config.stage as ProjectConfigResponse["stage"],
    lifecycleStatus: config.lifecycleStatus,
    style: { ...config.style },
    goals: { ...config.goals },
    defaultSkillSetId: config.defaultSkillSetId,
    knowledgeGraphId: config.knowledgeGraphId,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

function registerProjectConfigHandlers(deps: ProjectHandlerDeps): void {
  let manager: ProjectManager | null = null;

  const handleWithProjectAccess = createProjectAccessHandler({
    ipcMain: deps.ipcMain,
    projectSessionBinding: deps.projectSessionBinding,
  });

  function getManager(): ProjectManager | null {
    if (!deps.db) return null;
    if (!manager) {
      manager = createProjectManager({
        db: deps.db,
        eventBus: deps.eventBus ?? NOOP_EVENT_BUS,
      });
    }
    return manager;
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

      try {
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
      } catch (error) {
        deps.logger.error("ipc_project_config_unexpected_error", {
          channel: "project:config:get",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected config get error" },
        };
      }
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
      if (payload.patch.style?.genre !== undefined) {
        if (
          typeof payload.patch.style.genre === "string" &&
          payload.patch.style.genre.trim().length === 0
        ) {
          return {
            ok: false,
            error: { code: "PROJECT_GENRE_REQUIRED", message: "genre cannot be empty" },
          };
        }
      }

      const current = await mgr.getProject(payload.projectId);
      if (!current.success || !current.data) {
        return {
          ok: false,
          error: {
            code: (current.error?.code ?? "PROJECT_NOT_FOUND") as "PROJECT_NOT_FOUND",
            message: current.error?.message ?? "Project not found",
          },
        };
      }

      if (payload.patch.name !== undefined) {
        updates.name = payload.patch.name;
      }
      if (payload.patch.type !== undefined) {
        updates.type = payload.patch.type;
      }
      if (payload.patch.description !== undefined) {
        updates.description = payload.patch.description;
      }
      if (payload.patch.stage !== undefined) {
        updates.stage = payload.patch.stage;
      }
      if (payload.patch.lifecycleStatus !== undefined) {
        updates.lifecycleStatus = payload.patch.lifecycleStatus;
      }
      if (payload.patch.style !== undefined) {
        updates.style = {
          ...current.data.style,
          ...payload.patch.style,
        };
      }
      if (payload.patch.goals !== undefined) {
        updates.goals = {
          ...current.data.goals,
          ...payload.patch.goals,
        };
      }
      if (payload.patch.defaultSkillSetId !== undefined) {
        updates.defaultSkillSetId = payload.patch.defaultSkillSetId;
      }
      if (payload.patch.knowledgeGraphId !== undefined) {
        updates.knowledgeGraphId = payload.patch.knowledgeGraphId;
      }

      try {
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
      } catch (error) {
        deps.logger.error("ipc_project_config_unexpected_error", {
          channel: "project:config:update",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected config update error" },
        };
      }
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

      try {
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
      } catch (error) {
        deps.logger.error("ipc_project_config_unexpected_error", {
          channel: "project:style:get",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected style get error" },
        };
      }
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

      try {
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
      } catch (error) {
        deps.logger.error("ipc_project_config_unexpected_error", {
          channel: "project:documents:list",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected documents list error" },
        };
      }
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

      try {
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
      } catch (error) {
        deps.logger.error("ipc_project_config_unexpected_error", {
          channel: "project:overview:get",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected overview error" },
        };
      }
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
