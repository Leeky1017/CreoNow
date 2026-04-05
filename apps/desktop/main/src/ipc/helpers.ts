import type { IpcMain } from "electron";

import type { IpcResponse } from "@shared/types/ipc-generated";
import { guardAndNormalizeProjectAccess } from "./projectAccessGuard";
import type { ProjectSessionBindingRegistry } from "./projectSessionBinding";

// ─── Shared IPC helper types & utilities ────────────────────────────
// Extracted from settings.ts / simpleMemory.ts / projectSearch.ts / project.ts
// to eliminate cross-module duplication.

export interface EventBusLike {
  emit(event: Record<string, unknown>): void;
  on(event: string, handler: (payload: Record<string, unknown>) => void): void;
  off(
    event: string,
    handler: (payload: Record<string, unknown>) => void,
  ): void;
}

export function notReady<T>(): IpcResponse<T> {
  return {
    ok: false,
    error: { code: "DB_ERROR", message: "Database not ready" },
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateNonEmptyString(
  value: unknown,
  fieldName: string,
): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  return null;
}

export const NOOP_EVENT_BUS: EventBusLike = {
  emit: () => {},
  on: () => {},
  off: () => {},
};

export function createEventBus(): EventBusLike {
  const listeners = new Map<
    string,
    Set<(payload: Record<string, unknown>) => void>
  >();

  return {
    emit(event) {
      const type = typeof event.type === "string" ? event.type : "";
      if (type.length === 0) {
        return;
      }
      const handlers = listeners.get(type);
      if (!handlers) {
        return;
      }
      for (const handler of handlers) {
        handler(event);
      }
    },
    on(event, handler) {
      const handlers = listeners.get(event) ?? new Set();
      handlers.add(handler);
      listeners.set(event, handlers);
    },
    off(event, handler) {
      const handlers = listeners.get(event);
      if (!handlers) {
        return;
      }
      handlers.delete(handler);
      if (handlers.size === 0) {
        listeners.delete(event);
      }
    },
  };
}

export function createProjectAccessHandler(deps: {
  ipcMain: IpcMain;
  projectSessionBinding?: ProjectSessionBindingRegistry;
  allowNullProjectId?: boolean;
}) {
  return function handleWithProjectAccess<TPayload, TResponse>(
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
        allowNullProjectId: deps.allowNullProjectId,
      });
      if (!guarded.ok) {
        return guarded.response as IpcResponse<TResponse>;
      }
      return listener(event, payload as TPayload);
    });
  };
}
