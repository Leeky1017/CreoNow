import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import {
  createSkillService,
  type CustomSkillInputType,
  type SkillListItem,
} from "../services/skills/skillService";
import { createDbNotReadyError } from "./dbError";

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
    "skill:registry:list",
    async (
      _e,
      payload: { includeDisabled?: boolean },
    ): Promise<IpcResponse<{ items: SkillListItem[] }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: createDbNotReadyError(),
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
    "skill:registry:read",
    async (
      _e,
      payload: { id: string },
    ): Promise<IpcResponse<{ id: string; content: string }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: createDbNotReadyError(),
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
    "skill:registry:write",
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
          error: createDbNotReadyError(),
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
    "skill:registry:toggle",
    async (
      _e,
      payload: { id?: string; skillId?: string; enabled: boolean },
    ): Promise<IpcResponse<{ id: string; enabled: boolean }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: createDbNotReadyError(),
        };
      }

      const svc = createSkillService({
        db: deps.db,
        userDataDir: deps.userDataDir,
        builtinSkillsDir: deps.builtinSkillsDir,
        logger: deps.logger,
      });
      const id = payload.id ?? payload.skillId ?? "";
      const res = svc.toggle({ id, enabled: payload.enabled });
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "skill:custom:update",
    async (
      _e,
      payload: {
        id: string;
        scope?: "global" | "project";
        name?: string;
        description?: string;
        promptTemplate?: string;
        inputType?: CustomSkillInputType;
        contextRules?: Record<string, unknown>;
        enabled?: boolean;
      },
    ): Promise<IpcResponse<{ id: string; scope: "global" | "project" }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: createDbNotReadyError(),
        };
      }

      const svc = createSkillService({
        db: deps.db,
        userDataDir: deps.userDataDir,
        builtinSkillsDir: deps.builtinSkillsDir,
        logger: deps.logger,
      });
      const res = svc.updateCustom(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "skill:custom:create",
    async (
      _e,
      payload: {
        name: string;
        description: string;
        promptTemplate: string;
        inputType: CustomSkillInputType;
        contextRules: Record<string, unknown>;
        scope: "global" | "project";
        enabled?: boolean;
      },
    ): Promise<
      IpcResponse<{
        skill: {
          id: string;
          name: string;
          description: string;
          promptTemplate: string;
          inputType: CustomSkillInputType;
          contextRules: Record<string, unknown>;
          scope: "global" | "project";
          enabled: boolean;
          createdAt: number;
          updatedAt: number;
        };
      }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: createDbNotReadyError(),
        };
      }

      const svc = createSkillService({
        db: deps.db,
        userDataDir: deps.userDataDir,
        builtinSkillsDir: deps.builtinSkillsDir,
        logger: deps.logger,
      });
      const res = svc.createCustom(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "skill:custom:list",
    async (): Promise<
      IpcResponse<{
        items: Array<{
          id: string;
          name: string;
          description: string;
          promptTemplate: string;
          inputType: CustomSkillInputType;
          contextRules: Record<string, unknown>;
          scope: "global" | "project";
          enabled: boolean;
          createdAt: number;
          updatedAt: number;
        }>;
      }>
    > => {
      if (!deps.db) {
        return {
          ok: false,
          error: createDbNotReadyError(),
        };
      }

      const svc = createSkillService({
        db: deps.db,
        userDataDir: deps.userDataDir,
        builtinSkillsDir: deps.builtinSkillsDir,
        logger: deps.logger,
      });
      const res = svc.listCustom();
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );

  deps.ipcMain.handle(
    "skill:custom:delete",
    async (
      _e,
      payload: { id: string },
    ): Promise<IpcResponse<{ id: string; deleted: true }>> => {
      if (!deps.db) {
        return {
          ok: false,
          error: createDbNotReadyError(),
        };
      }

      const svc = createSkillService({
        db: deps.db,
        userDataDir: deps.userDataDir,
        builtinSkillsDir: deps.builtinSkillsDir,
        logger: deps.logger,
      });
      const res = svc.deleteCustom(payload);
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: res.error };
    },
  );
}
