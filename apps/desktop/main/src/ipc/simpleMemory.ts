import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import type { ProjectLifecycle } from "../services/projects/projectLifecycle";
import {
  createSimpleMemoryService,
  type MemoryInjection,
  type MemoryRecord,
  type SimpleMemoryService,
} from "../services/memory/simpleMemoryService";
import {
  type EventBusLike,
  createProjectAccessHandler,
  isRecord,
  notReady,
  validateNonEmptyString,
  NOOP_EVENT_BUS,
} from "./helpers";
import type { ProjectSessionBindingRegistry } from "./projectSessionBinding";

// ─── Payload types ──────────────────────────────────────────────────

type WritePayload = {
  projectId: string | null;
  key: string;
  value: string;
  source?: string;
  category?: string;
};

type ReadPayload = {
  projectId: string;
  id: string;
};

type DeletePayload = {
  projectId: string;
  id: string;
};

type ListPayload = {
  projectId: string | null;
  category?: string;
  keyPrefix?: string;
};

type InjectPayload = {
  projectId: string | null;
  documentText: string;
  tokenBudget?: number;
};

type ClearProjectPayload = {
  projectId: string;
  confirmed?: boolean;
};

const VALID_CATEGORIES = new Set([
  "preference",
  "character-setting",
  "location-setting",
  "style-rule",
]);

const VALID_SOURCES = new Set(["user", "system"]);

/**
 * Register `memory:simple:*` IPC handlers (SimpleMemory key-value CRUD).
 *
 * Why: P3 简单记忆系统通过 IPC 层暴露给渲染进程，
 * 让 Context Engine 和 AI 模块在运行时可注入/读取用户设定的记忆条目。
 */
export function registerSimpleMemoryIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  projectSessionBinding?: ProjectSessionBindingRegistry;
  projectLifecycle?: ProjectLifecycle;
  eventBus?: EventBusLike;
}): void {
  let service: SimpleMemoryService | null = null;
  let lifecycleRegistered = false;

  const handleWithProjectAccess = createProjectAccessHandler({
    ipcMain: deps.ipcMain,
    projectSessionBinding: deps.projectSessionBinding,
  });

  function getService(): SimpleMemoryService | null {
    if (!deps.db) return null;
    if (!service) {
      service = createSimpleMemoryService({
        db: deps.db,
        eventBus: deps.eventBus ?? NOOP_EVENT_BUS,
      });
    }
    return service;
  }

  function ensureLifecycleRegistered(): void {
    if (lifecycleRegistered || !deps.projectLifecycle) {
      return;
    }
    lifecycleRegistered = true;
    deps.projectLifecycle.register({
      id: "simple-memory",
      unbind: () => {
        service?.dispose();
        service = null;
      },
      bind: () => {
        getService();
      },
    });
  }

  ensureLifecycleRegistered();

  // ── memory:simple:write ──

  handleWithProjectAccess(
    "memory:simple:write",
    async (
      _event,
      payload: WritePayload,
    ): Promise<IpcResponse<MemoryRecord>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<MemoryRecord>();

      const keyErr = validateNonEmptyString(payload.key, "key");
      if (keyErr) {
        return {
          ok: false,
          error: { code: "MEMORY_KEY_REQUIRED", message: keyErr },
        };
      }

      const valErr = validateNonEmptyString(payload.value, "value");
      if (valErr) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: valErr },
        };
      }

      // C-F7: Validate category enum
      const category = payload.category ?? "preference";
      if (!VALID_CATEGORIES.has(category)) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: `category must be one of: ${[...VALID_CATEGORIES].join(", ")}`,
          },
        };
      }

      // C-F7: Validate source enum
      const source = payload.source ?? "user";
      if (!VALID_SOURCES.has(source)) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: `source must be one of: ${[...VALID_SOURCES].join(", ")}`,
          },
        };
      }

      try {
        const res = await svc.write({
          projectId: payload.projectId,
          key: payload.key,
          value: payload.value,
          source,
          category,
        });

        if (res.success && res.data) {
          return { ok: true, data: res.data };
        }
        return {
          ok: false,
          error: {
            code: (res.error?.code ?? "INTERNAL_ERROR") as "MEMORY_KEY_REQUIRED",
            message: res.error?.message ?? "Write failed",
          },
        };
      } catch (error) {
        deps.logger.error("ipc_memory_unexpected_error", {
          channel: "memory:simple:write",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected memory write error" },
        };
      }
    },
    { allowNullProjectId: true },
  );

  // ── memory:simple:read ──

  handleWithProjectAccess(
    "memory:simple:read",
    async (
      _event,
      payload: ReadPayload,
    ): Promise<IpcResponse<MemoryRecord>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<MemoryRecord>();

      const idErr = validateNonEmptyString(payload.id, "id");
      if (idErr) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: idErr },
        };
      }

      try {
        const res = await svc.read(payload.id);
        if (res.success && res.data) {
          if (res.data.projectId !== payload.projectId) {
            return {
              ok: false,
              error: { code: "MEMORY_NOT_FOUND" as const, message: "Memory not found in this project" },
            };
          }
          return { ok: true, data: res.data };
        }
        return {
          ok: false,
          error: {
            code: (res.error?.code ?? "MEMORY_NOT_FOUND") as "MEMORY_NOT_FOUND",
            message: res.error?.message ?? "Memory not found",
          },
        };
      } catch (error) {
        deps.logger.error("ipc_memory_unexpected_error", {
          channel: "memory:simple:read",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected memory read error" },
        };
      }
    },
    { allowNullProjectId: true },
  );

  // ── memory:simple:delete ──

  handleWithProjectAccess(
    "memory:simple:delete",
    async (
      _event,
      payload: DeletePayload,
    ): Promise<IpcResponse<{ deleted: true }>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<{ deleted: true }>();

      const idErr = validateNonEmptyString(payload.id, "id");
      if (idErr) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: idErr },
        };
      }

      // Verify ownership before delete
      try {
        const existing = await svc.read(payload.id);
        if (!existing.success || !existing.data) {
          return {
            ok: false,
            error: { code: "MEMORY_NOT_FOUND" as const, message: "Memory not found" },
          };
        }
        if (existing.data.projectId !== payload.projectId) {
          return {
            ok: false,
            error: { code: "MEMORY_NOT_FOUND" as const, message: "Memory not found in this project" },
          };
        }

        const res = await svc.delete(payload.id);
        if (res.success) {
          return { ok: true, data: { deleted: true } };
        }
        return {
          ok: false,
          error: {
            code: (res.error?.code ?? "MEMORY_NOT_FOUND") as "MEMORY_NOT_FOUND",
            message: res.error?.message ?? "Delete failed",
          },
        };
      } catch (error) {
        deps.logger.error("ipc_memory_unexpected_error", {
          channel: "memory:simple:delete",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected memory delete error" },
        };
      }
    },
    { allowNullProjectId: true },
  );

  // ── memory:simple:list ──

  handleWithProjectAccess(
    "memory:simple:list",
    async (
      _event,
      payload: ListPayload,
    ): Promise<IpcResponse<{ items: MemoryRecord[] }>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<{ items: MemoryRecord[] }>();

      try {
        const res = await svc.list({
          projectId: payload.projectId,
          category: payload.category,
          keyPrefix: payload.keyPrefix,
        });
        if (res.success) {
          return { ok: true, data: { items: res.data ?? [] } };
        }
        return {
          ok: false,
          error: {
            code: (res.error?.code ?? "INTERNAL_ERROR") as "INTERNAL_ERROR",
            message: res.error?.message ?? "List failed",
          },
        };
      } catch (error) {
        deps.logger.error("ipc_memory_unexpected_error", {
          channel: "memory:simple:list",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected memory list error" },
        };
      }
    },
    { allowNullProjectId: true },
  );

  // ── memory:simple:inject ──

  handleWithProjectAccess(
    "memory:simple:inject",
    async (
      _event,
      payload: InjectPayload,
    ): Promise<IpcResponse<MemoryInjection>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<MemoryInjection>();

      const textErr = validateNonEmptyString(payload.documentText, "documentText");
      if (textErr) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: textErr },
        };
      }

      try {
        const res = await svc.inject(payload.projectId, {
          documentText: payload.documentText,
          tokenBudget: payload.tokenBudget,
        });
        if (res.success && res.data) {
          return { ok: true, data: res.data };
        }
        return {
          ok: false,
          error: {
            code: (res.error?.code ?? "MEMORY_SERVICE_UNAVAILABLE") as "MEMORY_SERVICE_UNAVAILABLE",
            message: res.error?.message ?? "Injection failed",
          },
        };
      } catch (error) {
        deps.logger.error("ipc_memory_unexpected_error", {
          channel: "memory:simple:inject",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected memory inject error" },
        };
      }
    },
    { allowNullProjectId: true },
  );

  // ── memory:simple:clearproject ──
  // NOTE: Spec 中使用 kebab-case (clear-project)，但合约生成器要求 [a-z0-9] only。
  // 保持 clearproject 以符合 RESOURCE_ACTION_SEGMENT_PATTERN。

  handleWithProjectAccess(
    "memory:simple:clearproject",
    async (
      _event,
      payload: ClearProjectPayload,
    ): Promise<IpcResponse<{ cleared: true }>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<{ cleared: true }>();

      try {
        const res = await svc.clearProject(payload.projectId, {
          confirmed: payload.confirmed,
        });
        if (res.success) {
          return { ok: true, data: { cleared: true } };
        }
        return {
          ok: false,
          error: {
            code: (res.error?.code ?? "INTERNAL_ERROR") as "INTERNAL_ERROR",
            message: res.error?.message ?? "Clear failed",
          },
        };
      } catch (error) {
        deps.logger.error("ipc_memory_unexpected_error", {
          channel: "memory:simple:clearproject",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected memory clear error" },
        };
      }
    },
  );
}
