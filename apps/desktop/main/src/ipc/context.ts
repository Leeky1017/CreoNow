import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { redactText } from "../../../../../packages/shared/redaction/redact";
import type { Logger } from "../logging/logger";
import {
  ensureCreonowDirStructure,
  getCreonowDirStatus,
  getCreonowRootPath,
  listCreonowFiles,
  readCreonowTextFile,
} from "../services/context/contextFs";
import { redactUserDataPath } from "../db/paths";
import {
  createContextLayerAssemblyService,
  type ContextAssembleRequest,
  type ContextAssembleResult,
  type ContextInspectRequest,
  type ContextInspectResult,
  type ContextLayerAssemblyService,
} from "../services/context/layerAssemblyService";
import type { CreonowWatchService } from "../services/context/watchService";

type ProjectRow = {
  rootPath: string;
};

/**
 * Check that a read request stays within an allowed `.creonow/<scope>/` prefix.
 *
 * Why: list/read are exposed over IPC; scope boundaries must be enforced even
 * though the underlying FS helper also validates `.creonow/**`.
 */
function isReadWithinScope(args: {
  scope: "rules" | "settings";
  p: string;
}): boolean {
  return args.p.startsWith(`.creonow/${args.scope}/`);
}

/**
 * Check project existence before context assembly/inspection.
 *
 * Why: `context:prompt:*` must return deterministic `NOT_FOUND` instead of
 * allowing downstream service calls to fail ambiguously.
 */
function projectExists(db: Database.Database, projectId: string): boolean {
  const row = db
    .prepare<
      [string],
      ProjectRow
    >("SELECT root_path as rootPath FROM projects WHERE project_id = ?")
    .get(projectId);
  return Boolean(row);
}

/**
 * Register `context:creonow:*` IPC handlers (P0 subset).
 *
 * Why: `.creonow` is the stable, project-relative metadata root required by P0,
 * and watch start/stop must be owned by the main process (Node APIs).
 */
export function registerContextIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  userDataDir: string;
  watchService: CreonowWatchService;
  contextAssemblyService?: ContextLayerAssemblyService;
}): void {
  const contextAssemblyService =
    deps.contextAssemblyService ?? createContextLayerAssemblyService();

  deps.ipcMain.handle(
    "context:creonow:ensure",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<IpcResponse<{ rootPath: string; ensured: true }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (payload.projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }

      try {
        const row = deps.db
          .prepare<
            [string],
            ProjectRow
          >("SELECT root_path as rootPath FROM projects WHERE project_id = ?")
          .get(payload.projectId);
        if (!row) {
          return {
            ok: false,
            error: { code: "NOT_FOUND", message: "Project not found" },
          };
        }

        const ensured = ensureCreonowDirStructure(row.rootPath);
        if (!ensured.ok) {
          return { ok: false, error: ensured.error };
        }

        deps.logger.info("context_ensure", {
          projectId: payload.projectId,
          rootPath: redactUserDataPath(deps.userDataDir, row.rootPath),
        });

        return { ok: true, data: { rootPath: row.rootPath, ensured: true } };
      } catch (error) {
        deps.logger.error("creonow_ensure_failed", {
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "IO_ERROR", message: "Failed to ensure .creonow" },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "context:creonow:status",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<
      IpcResponse<{ exists: boolean; watching: boolean; rootPath?: string }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (payload.projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }

      try {
        const row = deps.db
          .prepare<
            [string],
            ProjectRow
          >("SELECT root_path as rootPath FROM projects WHERE project_id = ?")
          .get(payload.projectId);
        if (!row) {
          return {
            ok: false,
            error: { code: "NOT_FOUND", message: "Project not found" },
          };
        }

        const status = getCreonowDirStatus(row.rootPath);
        if (!status.ok) {
          return { ok: false, error: status.error };
        }

        return {
          ok: true,
          data: {
            exists: status.data.exists,
            watching: deps.watchService.isWatching({
              projectId: payload.projectId,
            }),
            rootPath: row.rootPath,
          },
        };
      } catch (error) {
        deps.logger.error("creonow_status_failed", {
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: {
            code: "IO_ERROR",
            message: "Failed to read .creonow status",
          },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "context:watch:start",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<IpcResponse<{ watching: true }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (payload.projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }

      try {
        const row = deps.db
          .prepare<
            [string],
            ProjectRow
          >("SELECT root_path as rootPath FROM projects WHERE project_id = ?")
          .get(payload.projectId);
        if (!row) {
          return {
            ok: false,
            error: { code: "NOT_FOUND", message: "Project not found" },
          };
        }

        const ensured = ensureCreonowDirStructure(row.rootPath);
        if (!ensured.ok) {
          return { ok: false, error: ensured.error };
        }

        const creonowRootPath = getCreonowRootPath(row.rootPath);
        const started = deps.watchService.start({
          projectId: payload.projectId,
          creonowRootPath,
        });
        if (!started.ok) {
          return { ok: false, error: started.error };
        }

        deps.logger.info("context_watch_started", {
          projectId: payload.projectId,
        });
        return { ok: true, data: started.data };
      } catch (error) {
        deps.logger.error("context_watch_start_ipc_failed", {
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: {
            code: "IO_ERROR",
            message: "Failed to start .creonow watch",
          },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "context:watch:stop",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<IpcResponse<{ watching: false }>> => {
      if (payload.projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }

      try {
        const stopped = deps.watchService.stop({
          projectId: payload.projectId,
        });
        if (!stopped.ok) {
          return { ok: false, error: stopped.error };
        }

        deps.logger.info("context_watch_stopped", {
          projectId: payload.projectId,
        });
        return { ok: true, data: stopped.data };
      } catch (error) {
        deps.logger.error("context_watch_stop_ipc_failed", {
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "IO_ERROR", message: "Failed to stop .creonow watch" },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "context:prompt:assemble",
    async (
      _e,
      payload: ContextAssembleRequest,
    ): Promise<IpcResponse<ContextAssembleResult>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (payload.projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }
      if (payload.documentId.trim().length === 0) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "documentId is required",
          },
        };
      }
      if (payload.skillId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "skillId is required" },
        };
      }
      if (
        typeof payload.cursorPosition !== "number" ||
        Number.isNaN(payload.cursorPosition)
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "cursorPosition must be a valid number",
          },
        };
      }

      try {
        if (!projectExists(deps.db, payload.projectId)) {
          return {
            ok: false,
            error: { code: "NOT_FOUND", message: "Project not found" },
          };
        }

        const assembled = await contextAssemblyService.assemble(payload);
        return { ok: true, data: assembled };
      } catch (error) {
        deps.logger.error("context_assemble_failed", {
          code: "INTERNAL",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL", message: "Failed to assemble context" },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "context:prompt:inspect",
    async (
      _e,
      payload: ContextInspectRequest,
    ): Promise<IpcResponse<ContextInspectResult>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (payload.projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }
      if (payload.documentId.trim().length === 0) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "documentId is required",
          },
        };
      }
      if (payload.skillId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "skillId is required" },
        };
      }
      if (
        typeof payload.cursorPosition !== "number" ||
        Number.isNaN(payload.cursorPosition)
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "cursorPosition must be a valid number",
          },
        };
      }

      try {
        if (!projectExists(deps.db, payload.projectId)) {
          return {
            ok: false,
            error: { code: "NOT_FOUND", message: "Project not found" },
          };
        }

        const inspected = await contextAssemblyService.inspect(payload);
        return { ok: true, data: inspected };
      } catch (error) {
        deps.logger.error("context_inspect_failed", {
          code: "INTERNAL",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL", message: "Failed to inspect context" },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "context:rules:list",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<
      IpcResponse<{
        items: Array<{ path: string; sizeBytes: number; updatedAtMs: number }>;
      }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (payload.projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }

      try {
        const row = deps.db
          .prepare<
            [string],
            ProjectRow
          >("SELECT root_path as rootPath FROM projects WHERE project_id = ?")
          .get(payload.projectId);
        if (!row) {
          return {
            ok: false,
            error: { code: "NOT_FOUND", message: "Project not found" },
          };
        }

        const ensured = ensureCreonowDirStructure(row.rootPath);
        if (!ensured.ok) {
          return { ok: false, error: ensured.error };
        }

        const listed = listCreonowFiles({
          projectRootPath: row.rootPath,
          scope: "rules",
        });
        return listed.ok
          ? { ok: true, data: { items: listed.data.items } }
          : { ok: false, error: listed.error };
      } catch (error) {
        deps.logger.error("context_rules_list_failed", {
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "IO_ERROR", message: "Failed to list rules" },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "context:settings:list",
    async (
      _e,
      payload: { projectId: string },
    ): Promise<
      IpcResponse<{
        items: Array<{ path: string; sizeBytes: number; updatedAtMs: number }>;
      }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (payload.projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }

      try {
        const row = deps.db
          .prepare<
            [string],
            ProjectRow
          >("SELECT root_path as rootPath FROM projects WHERE project_id = ?")
          .get(payload.projectId);
        if (!row) {
          return {
            ok: false,
            error: { code: "NOT_FOUND", message: "Project not found" },
          };
        }

        const ensured = ensureCreonowDirStructure(row.rootPath);
        if (!ensured.ok) {
          return { ok: false, error: ensured.error };
        }

        const listed = listCreonowFiles({
          projectRootPath: row.rootPath,
          scope: "settings",
        });
        return listed.ok
          ? { ok: true, data: { items: listed.data.items } }
          : { ok: false, error: listed.error };
      } catch (error) {
        deps.logger.error("context_settings_list_failed", {
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "IO_ERROR", message: "Failed to list settings" },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "context:rules:read",
    async (
      _e,
      payload: { projectId: string; path: string },
    ): Promise<
      IpcResponse<{
        path: string;
        content: string;
        sizeBytes: number;
        updatedAtMs: number;
        redactionEvidence: Array<{
          patternId: string;
          sourceRef: string;
          matchCount: number;
        }>;
      }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (payload.projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }
      if (!isReadWithinScope({ scope: "rules", p: payload.path })) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "Invalid rules path" },
        };
      }

      try {
        const row = deps.db
          .prepare<
            [string],
            ProjectRow
          >("SELECT root_path as rootPath FROM projects WHERE project_id = ?")
          .get(payload.projectId);
        if (!row) {
          return {
            ok: false,
            error: { code: "NOT_FOUND", message: "Project not found" },
          };
        }

        const ensured = ensureCreonowDirStructure(row.rootPath);
        if (!ensured.ok) {
          return { ok: false, error: ensured.error };
        }

        const file = readCreonowTextFile({
          projectRootPath: row.rootPath,
          path: payload.path,
        });
        if (!file.ok) {
          return { ok: false, error: file.error };
        }

        const redacted = redactText({
          text: file.data.content,
          sourceRef: payload.path,
        });
        for (const item of redacted.evidence) {
          deps.logger.info("context_redaction_applied", {
            projectId: payload.projectId,
            patternId: item.patternId,
            matchCount: item.matchCount,
          });
        }

        return {
          ok: true,
          data: {
            path: payload.path,
            content: redacted.redactedText,
            sizeBytes: file.data.sizeBytes,
            updatedAtMs: file.data.updatedAtMs,
            redactionEvidence: redacted.evidence,
          },
        };
      } catch (error) {
        deps.logger.error("context_rules_read_failed", {
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "IO_ERROR", message: "Failed to read rules file" },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "context:settings:read",
    async (
      _e,
      payload: { projectId: string; path: string },
    ): Promise<
      IpcResponse<{
        path: string;
        content: string;
        sizeBytes: number;
        updatedAtMs: number;
        redactionEvidence: Array<{
          patternId: string;
          sourceRef: string;
          matchCount: number;
        }>;
      }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: { code: "DB_ERROR", message: "Database not ready" },
        };
      }
      if (payload.projectId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "projectId is required" },
        };
      }
      if (!isReadWithinScope({ scope: "settings", p: payload.path })) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "Invalid settings path" },
        };
      }

      try {
        const row = deps.db
          .prepare<
            [string],
            ProjectRow
          >("SELECT root_path as rootPath FROM projects WHERE project_id = ?")
          .get(payload.projectId);
        if (!row) {
          return {
            ok: false,
            error: { code: "NOT_FOUND", message: "Project not found" },
          };
        }

        const ensured = ensureCreonowDirStructure(row.rootPath);
        if (!ensured.ok) {
          return { ok: false, error: ensured.error };
        }

        const file = readCreonowTextFile({
          projectRootPath: row.rootPath,
          path: payload.path,
        });
        if (!file.ok) {
          return { ok: false, error: file.error };
        }

        const redacted = redactText({
          text: file.data.content,
          sourceRef: payload.path,
        });
        for (const item of redacted.evidence) {
          deps.logger.info("context_redaction_applied", {
            projectId: payload.projectId,
            patternId: item.patternId,
            matchCount: item.matchCount,
          });
        }

        return {
          ok: true,
          data: {
            path: payload.path,
            content: redacted.redactedText,
            sizeBytes: file.data.sizeBytes,
            updatedAtMs: file.data.updatedAtMs,
            redactionEvidence: redacted.evidence,
          },
        };
      } catch (error) {
        deps.logger.error("context_settings_read_failed", {
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "IO_ERROR", message: "Failed to read settings file" },
        };
      }
    },
  );
}
