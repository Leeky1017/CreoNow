import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import {
  createSimpleMemoryService,
  type MemoryInjection,
  type MemoryRecord,
  type SimpleMemoryService,
} from "../services/memory/simpleMemoryService";
import { guardAndNormalizeProjectAccess } from "./projectAccessGuard";
import type { ProjectSessionBindingRegistry } from "./projectSessionBinding";

// ─── Payload types ──────────────────────────────────────────────────

type WritePayload = {
  projectId: string;
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
  projectId: string;
  category?: string;
  keyPrefix?: string;
};

type InjectPayload = {
  projectId: string;
  documentText: string;
  tokenBudget?: number;
};

type ClearProjectPayload = {
  projectId: string;
  confirmed?: boolean;
};

// ─── Helpers ────────────────────────────────────────────────────────

function notReady<T>(): IpcResponse<T> {
  return {
    ok: false,
    error: { code: "DB_ERROR", message: "Database not ready" },
  };
}

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

interface EventBusLike {
  emit(event: Record<string, unknown>): void;
  on(event: string, handler: (payload: Record<string, unknown>) => void): void;
  off(
    event: string,
    handler: (payload: Record<string, unknown>) => void,
  ): void;
}

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
  eventBus?: EventBusLike;
}): void {
  let service: SimpleMemoryService | null = null;

  const noopEventBus: EventBusLike = {
    emit: () => {},
    on: () => {},
    off: () => {},
  };

  function getService(): SimpleMemoryService | null {
    if (!deps.db) return null;
    if (!service) {
      service = createSimpleMemoryService({
        db: deps.db as never,
        eventBus: deps.eventBus ?? noopEventBus,
      });
    }
    return service;
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

      const res = await svc.write({
        projectId: payload.projectId,
        key: payload.key,
        value: payload.value,
        source: payload.source ?? "user",
        category: payload.category ?? "general",
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
    },
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
    },
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
    },
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
    },
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
    },
  );

  // ── memory:simple:clearproject ──

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
    },
  );
}
