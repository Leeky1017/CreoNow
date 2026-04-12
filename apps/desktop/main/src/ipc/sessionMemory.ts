/**
 * Register `memory:session:*` IPC handlers (L1 session-aware context memory).
 *
 * Why: L1 memory CRUD and injection must be accessible from the renderer process
 * so that the AI Panel, SkillOrchestrator, and Context Engine can read/write
 * per-session context items through IPC.
 *
 * Channel naming follows the existing `memory:simple:*` pattern with
 * lowercase-only segments per RESOURCE_ACTION_SEGMENT_PATTERN.
 *
 * INV-4: Memory-First — L1 selective injection layer.
 * INV-7: IPC handler delegates to service, no business logic here.
 */

import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "@shared/types/ipc-generated";
import type { Logger } from "../logging/logger";
import {
  createSessionMemoryService,
  type SessionMemoryService,
  type SessionMemoryItem,
  type SessionMemoryCategory,
} from "../services/memory/sessionMemoryService";
import {
  createProjectAccessHandler,
  isRecord,
  notReady,
  validateNonEmptyString,
} from "./helpers";
import type { ProjectSessionBindingRegistry } from "./projectSessionBinding";

// ─── Payload types ──────────────────────────────────────────────────

type CreatePayload = {
  projectId: string;
  sessionId: string;
  category: SessionMemoryCategory;
  content: string;
  relevanceScore?: number;
  expiresAt?: number;
};

type ListPayload = {
  projectId: string;
  sessionId?: string;
  category?: SessionMemoryCategory;
  limit?: number;
};

type DeletePayload = {
  projectId: string;
  id: string;
};

type InjectionPayload = {
  projectId: string;
  contextHint?: string;
  budgetTokens: number;
};

const VALID_CATEGORIES = new Set<string>(["style", "reference", "preference", "note"]);

export function registerSessionMemoryIpcHandlers(deps: {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  projectSessionBinding?: ProjectSessionBindingRegistry;
}): void {
  let service: SessionMemoryService | null = null;

  const handleWithProjectAccess = createProjectAccessHandler({
    ipcMain: deps.ipcMain,
    projectSessionBinding: deps.projectSessionBinding,
  });

  function getService(): SessionMemoryService | null {
    if (!deps.db) return null;
    if (!service) {
      service = createSessionMemoryService({ db: deps.db });
    }
    return service;
  }

  // ── memory:session:create ──

  handleWithProjectAccess(
    "memory:session:create",
    async (
      _event,
      payload: CreatePayload,
    ): Promise<IpcResponse<SessionMemoryItem>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<SessionMemoryItem>();

      const contentErr = validateNonEmptyString(payload.content, "content");
      if (contentErr) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: contentErr },
        };
      }

      const sessionIdErr = validateNonEmptyString(payload.sessionId, "sessionId");
      if (sessionIdErr) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: sessionIdErr },
        };
      }

      if (!VALID_CATEGORIES.has(payload.category)) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: `category must be one of: ${[...VALID_CATEGORIES].join(", ")}`,
          },
        };
      }

      try {
        const res = svc.create({
          sessionId: payload.sessionId,
          projectId: payload.projectId,
          category: payload.category,
          content: payload.content,
          relevanceScore: payload.relevanceScore,
          expiresAt: payload.expiresAt,
        });

        if (res.ok) {
          return { ok: true, data: res.data };
        }
        return {
          ok: false,
          error: { code: (res.error.code ?? "INVALID_ARGUMENT") as "INVALID_ARGUMENT", message: res.error.message },
        };
      } catch (error) {
        deps.logger.error("ipc_session_memory_error", {
          channel: "memory:session:create",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected session memory create error" },
        };
      }
    },
  );

  // ── memory:session:list ──

  handleWithProjectAccess(
    "memory:session:list",
    async (
      _event,
      payload: ListPayload,
    ): Promise<IpcResponse<{ items: SessionMemoryItem[]; totalCount: number }>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<{ items: SessionMemoryItem[]; totalCount: number }>();

      try {
        const res = svc.list({
          projectId: payload.projectId,
          sessionId: payload.sessionId,
          category: payload.category,
          limit: payload.limit,
        });

        if (res.ok) {
          return { ok: true, data: res.data };
        }
        return {
          ok: false,
          error: { code: (res.error.code ?? "INVALID_ARGUMENT") as "INVALID_ARGUMENT", message: res.error.message },
        };
      } catch (error) {
        deps.logger.error("ipc_session_memory_error", {
          channel: "memory:session:list",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected session memory list error" },
        };
      }
    },
  );

  // ── memory:session:delete ──

  handleWithProjectAccess(
    "memory:session:delete",
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

      try {
        const res = svc.delete({ id: payload.id });
        if (res.ok) {
          return { ok: true, data: { deleted: true } };
        }
        return {
          ok: false,
          error: { code: res.error.code as "NOT_FOUND", message: res.error.message },
        };
      } catch (error) {
        deps.logger.error("ipc_session_memory_error", {
          channel: "memory:session:delete",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected session memory delete error" },
        };
      }
    },
  );

  // ── memory:session:deleteexpired ──

  handleWithProjectAccess(
    "memory:session:deleteexpired",
    async (): Promise<IpcResponse<{ deletedCount: number }>> => {
      const svc = getService();
      if (!svc) return notReady<{ deletedCount: number }>();

      try {
        const res = svc.deleteExpired();
        if (res.ok) {
          return { ok: true, data: res.data };
        }
        return {
          ok: false,
          error: { code: res.error.code as "INTERNAL_ERROR", message: res.error.message },
        };
      } catch (error) {
        deps.logger.error("ipc_session_memory_error", {
          channel: "memory:session:deleteexpired",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected deleteExpired error" },
        };
      }
    },
  );

  // ── memory:session:injection ──

  handleWithProjectAccess(
    "memory:session:injection",
    async (
      _event,
      payload: InjectionPayload,
    ): Promise<IpcResponse<{ items: SessionMemoryItem[]; totalTokens: number }>> => {
      if (!isRecord(payload)) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "payload must be an object" },
        };
      }

      const svc = getService();
      if (!svc) return notReady<{ items: SessionMemoryItem[]; totalTokens: number }>();

      try {
        const res = svc.getInjectionPayload({
          projectId: payload.projectId,
          contextHint: payload.contextHint,
          budgetTokens: payload.budgetTokens,
        });

        if (res.ok) {
          return { ok: true, data: res.data };
        }
        return {
          ok: false,
          error: { code: (res.error.code ?? "INVALID_ARGUMENT") as "INVALID_ARGUMENT", message: res.error.message },
        };
      } catch (error) {
        deps.logger.error("ipc_session_memory_error", {
          channel: "memory:session:injection",
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Unexpected injection error" },
        };
      }
    },
  );
}
