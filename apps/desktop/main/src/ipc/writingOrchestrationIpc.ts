/**
 * Writing Orchestration IPC — P1 生产入口
 *
 * 将 WritingOrchestrator 接入 Electron IPC，作为 P1 写作管线的唯一入口。
 *
 * 暴露两个通道：
 *   ai:writing:execute          — 启动写作任务（选区→AI→权限门→写回→快照）
 *   ai:writing:permission:respond — 渲染进程确认 / 拒绝 AI 修改
 *
 * Why: audit findings 1+2 require WritingOrchestrator to be the live path,
 * with explicit confirm/reject and snapshot-before-write.
 */

import type { IpcMain } from "electron";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

import type { IpcResponse } from "@shared/types/ipc-generated";
import {
  SKILL_STREAM_CHUNK_CHANNEL,
  SKILL_STREAM_DONE_CHANNEL,
  type AiStreamEvent,
} from "@shared/types/ai";
import { estimateTokens } from "../services/context/tokenEstimation";
import type { Logger } from "../logging/logger";
import {
  createWritingOrchestrator,
  type WritingRequest,
  type WritingEvent,
} from "../services/skills/orchestrator";
import {
  createToolRegistry,
  buildTool,
} from "../services/skills/toolRegistry";
import {
  createDocumentService,
  type DocumentService,
} from "../services/documents/documentService";

// ── Types ─────────────────────────────────────────────────────────────────────

type WritingExecutePayload = {
  skillId: string;
  model?: string;
  projectId?: string;
  documentId: string;
  selectedText?: string;
  precedingText?: string;
  followingText?: string;
  selection?: {
    from: number;
    to: number;
    text: string;
    selectionTextHash: string;
  };
};

type WritingExecuteResponse = {
  requestId: string;
};

type WritingPermissionRespondPayload = {
  requestId: string;
  granted: boolean;
};

type WritingPermissionRespondResponse = {
  acknowledged: true;
};

// ── Deps ──────────────────────────────────────────────────────────────────────

export type WritingOrchestrationDeps = {
  ipcMain: IpcMain;
  db: Database.Database | null;
  logger: Logger;
  /**
   * Adapts the raw AI backend to the simple streamChat interface WritingOrchestrator
   * expects.  Provided by the caller (ai.ts) so the existing AiService instance is reused.
   */
  aiAdapter: OrchestratorAiAdapter;
};

// ── OrchestratorAiAdapter (bridge between AiService and WritingOrchestrator) ──

export interface OrchestratorAiAdapter {
  estimateTokens(text: string): number;
  abort(): void;
  /** Resolve a single AI completion; yields one chunk with the full text. */
  complete(
    input: string,
    model: string,
    signal: AbortSignal,
  ): Promise<{ text: string; tokens: number }>;
}

// ── Permission gate backed by a pending-promise map ───────────────────────────

function createPendingPermissionGate(
  pending: Map<string, (granted: boolean) => void>,
) {
  return {
    evaluate(_request: WritingRequest) {
      // P1: always require explicit user confirmation
      return Promise.resolve({ level: "confirm-required", granted: false });
    },
    requestPermission(request: WritingRequest): Promise<boolean> {
      return new Promise<boolean>((resolve) => {
        pending.set(request.requestId, resolve);
      });
    },
  };
}

// ── Document tools ────────────────────────────────────────────────────────────

/**
 * Snapshot the CURRENT document state before writing AI output.
 * This is the safe-to-rollback checkpoint.
 */
function buildPreWriteSnapshotTool(getDocSvc: () => DocumentService | null) {
  return buildTool({
    name: "preWriteSnapshot",
    description: "Snapshot original document before AI write",
    isConcurrencySafe: false,
    execute: async (ctx) => {
      const svc = getDocSvc();
      if (!svc) return { success: false, error: { code: "DB_NOT_READY", message: "DB not ready" } };

      const projectId = ctx.projectId as string | undefined;
      if (!projectId) return { success: true, data: { snapshotId: "no-project" } };

      // Read current content to capture it as-is
      const readRes = svc.read({ projectId, documentId: ctx.documentId });
      if (!readRes.ok) return { success: false, error: readRes.error };

      const contentJson = (readRes.data as Record<string, unknown>).contentJson ?? null;

      const saveRes = svc.save({
        projectId,
        documentId: ctx.documentId,
        contentJson,
        actor: "auto",
        reason: "autosave",
      });

      if (!saveRes.ok) {
        return { success: false, error: saveRes.error };
      }

      return {
        success: true,
        data: { snapshotId: saveRes.data.contentHash ?? "unknown" },
      };
    },
  });
}

/**
 * Write AI-generated text back to the document.
 */
function buildDocumentWriteTool(getDocSvc: () => DocumentService | null) {
  return buildTool({
    name: "documentWrite",
    description: "Write AI result to document",
    isConcurrencySafe: false,
    execute: async (ctx) => {
      const svc = getDocSvc();
      if (!svc) return { success: false, error: { code: "DB_NOT_READY", message: "DB not ready" } };

      const projectId = ctx.projectId as string | undefined;
      if (!projectId) return { success: true };

      const content = ctx.content as string;
      const contentJson = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: content }] }] };

      const saveRes = svc.save({
        projectId,
        documentId: ctx.documentId,
        contentJson,
        actor: "ai",
        reason: "ai-accept",
      });

      return saveRes.ok
        ? { success: true }
        : { success: false, error: saveRes.error };
    },
  });
}

/**
 * Create a post-write snapshot of the AI-written content.
 */
function buildVersionSnapshotTool(getDocSvc: () => DocumentService | null) {
  return buildTool({
    name: "versionSnapshot",
    description: "Snapshot AI-written content",
    isConcurrencySafe: false,
    execute: async (ctx) => {
      const svc = getDocSvc();
      if (!svc) return { success: false, error: { code: "DB_NOT_READY", message: "DB not ready" } };

      const projectId = ctx.projectId as string | undefined;
      if (!projectId) return { success: true, data: { snapshotId: "no-project" } };

      const readRes = svc.read({ projectId, documentId: ctx.documentId });
      if (!readRes.ok) return { success: false, error: readRes.error };

      const contentJson = (readRes.data as Record<string, unknown>).contentJson ?? null;
      const saveRes = svc.save({
        projectId,
        documentId: ctx.documentId,
        contentJson,
        actor: "ai",
        reason: "ai-accept",
      });

      if (!saveRes.ok) {
        return { success: false, error: saveRes.error };
      }

      return {
        success: true,
        data: { snapshotId: saveRes.data.contentHash ?? "unknown" },
      };
    },
  });
}

// ── Main registration function ────────────────────────────────────────────────

/**
 * Register the two P1 writing orchestration IPC handlers.
 *
 * Call this from registerAiIpcHandlers after the AiService is set up.
 */
export function registerWritingOrchestrationHandlers(
  deps: WritingOrchestrationDeps,
): void {
  const { ipcMain, db, logger, aiAdapter } = deps;

  // Pending permission promises: requestId → resolve(granted)
  const pendingPermissions = new Map<string, (granted: boolean) => void>();

  const getDocSvc = (): DocumentService | null => {
    if (!db) return null;
    return createDocumentService({ db, logger });
  };

  const toolRegistry = createToolRegistry();
  toolRegistry.register(buildPreWriteSnapshotTool(getDocSvc));
  toolRegistry.register(buildDocumentWriteTool(getDocSvc));
  toolRegistry.register(buildVersionSnapshotTool(getDocSvc));

  const permissionGate = createPendingPermissionGate(pendingPermissions);

  // Adapt the simple complete() interface to the streamChat generator interface
  // expected by WritingOrchestrator.
  const orchestratorAiService = {
    estimateTokens: (text: string) => aiAdapter.estimateTokens(text),
    abort: () => aiAdapter.abort(),
    streamChat: async function* (
      messages: Array<{ role: string; content: string }>,
      options: {
        signal: AbortSignal;
        onComplete: (r: unknown) => void;
        onError: (e: unknown) => void;
      },
    ) {
      const input = messages.map((m) => m.content).join("\n");
      try {
        const result = await aiAdapter.complete(
          input,
          "default",
          options.signal,
        );
        yield {
          delta: result.text,
          finishReason: "stop" as const,
          accumulatedTokens: result.tokens,
        };
        options.onComplete({ content: result.text });
      } catch (err) {
        options.onError(err);
        throw err;
      }
    },
  };

  const orchestrator = createWritingOrchestrator({
    aiService: orchestratorAiService,
    toolRegistry,
    permissionGate,
    postWritingHooks: [],
    defaultTimeoutMs: 60_000,
  });

  // ── ai:writing:execute ───────────────────────────────────────────────────

  ipcMain.handle(
    "ai:writing:execute",
    async (
      e,
      payload: WritingExecutePayload,
    ): Promise<IpcResponse<WritingExecuteResponse>> => {
      if (!payload.documentId || payload.documentId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "documentId is required" },
        };
      }
      if (!payload.skillId || payload.skillId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "skillId is required" },
        };
      }

      const requestId = randomUUID();
      const request: WritingRequest = {
        requestId,
        skillId: payload.skillId,
        model: payload.model,
        projectId: payload.projectId,
        documentId: payload.documentId,
        input: {
          selectedText: payload.selectedText,
          precedingText: payload.precedingText,
          followingText: payload.followingText,
        },
        selection: payload.selection,
      };

      const safeEmit = (event: AiStreamEvent): void => {
        try {
          if (!e.sender.isDestroyed()) {
            e.sender.send(SKILL_STREAM_CHUNK_CHANNEL, event);
          }
        } catch {
          // renderer gone
        }
      };

      const sendDone = (outputText: string, terminal: "completed" | "cancelled" | "error"): void => {
        try {
          if (!e.sender.isDestroyed()) {
            const doneEvent: AiStreamEvent = {
              type: "done",
              executionId: requestId,
              runId: requestId,
              traceId: requestId,
              terminal,
              outputText,
              ts: Date.now(),
            };
            e.sender.send(SKILL_STREAM_DONE_CHANNEL, doneEvent);
          }
        } catch {
          // renderer gone
        }
      };

      // Run the orchestrator pipeline in the background; return requestId immediately
      // so the renderer can wire up permission responses while pipeline runs.
      (async () => {
        let outputText = "";
        try {
          for await (const event of orchestrator.execute(request)) {
            switch (event.type) {
              case "ai-chunk": {
                outputText += (event as WritingEvent & { delta?: string }).delta ?? "";
                const chunkEvent: AiStreamEvent = {
                  type: "chunk",
                  executionId: requestId,
                  runId: requestId,
                  traceId: requestId,
                  seq: 0,
                  chunk: (event as WritingEvent & { delta?: string }).delta ?? "",
                  ts: Date.now(),
                };
                safeEmit(chunkEvent);
                break;
              }
              case "permission-requested": {
                // Forward to renderer as a special chunk so the UI can show confirm dialog.
                const permEvent: AiStreamEvent & { writingPermission?: unknown } = {
                  type: "chunk",
                  executionId: requestId,
                  runId: requestId,
                  traceId: requestId,
                  seq: -1,
                  chunk: "",
                  ts: Date.now(),
                  // Non-standard field: renderers aware of writing orchestration
                  // should react to this.
                };
                (permEvent as Record<string, unknown>).writingPermission = {
                  requestId,
                  level: (event as WritingEvent & { level?: string }).level,
                  previewText: outputText,
                };
                safeEmit(permEvent);
                break;
              }
              case "error": {
                const errEvent = event as WritingEvent & { error?: { message?: string } };
                sendDone(outputText, "error");
                logger.error("writing_orchestrator_error", {
                  requestId,
                  message: errEvent.error?.message ?? "unknown",
                });
                return;
              }
              case "aborted":
              case "permission-denied": {
                sendDone(outputText, "cancelled");
                return;
              }
              case "hooks-done": {
                sendDone(outputText, "completed");
                return;
              }
              default:
                break;
            }
          }
          sendDone(outputText, "completed");
        } catch (err) {
          logger.error("writing_orchestrator_unhandled", {
            requestId,
            error: String(err),
          });
          sendDone(outputText, "error");
        } finally {
          pendingPermissions.delete(requestId);
        }
      })();

      return { ok: true, data: { requestId } };
    },
  );

  // ── ai:writing:permission:respond ────────────────────────────────────────

  ipcMain.handle(
    "ai:writing:permission:respond",
    async (
      _e,
      payload: WritingPermissionRespondPayload,
    ): Promise<IpcResponse<WritingPermissionRespondResponse>> => {
      if (!payload.requestId || payload.requestId.trim().length === 0) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "requestId is required",
          },
        };
      }

      const resolve = pendingPermissions.get(payload.requestId);
      if (!resolve) {
        // Already resolved or unknown — not an error, just idempotent.
        return { ok: true, data: { acknowledged: true } };
      }

      pendingPermissions.delete(payload.requestId);
      resolve(payload.granted === true);

      return { ok: true, data: { acknowledged: true } };
    },
  );
}

/**
 * Create a minimal OrchestratorAiAdapter backed by a stub that returns a
 * NOT_READY error.  Replaced at runtime by the real adapter from ai.ts.
 */
export function createStubOrchestratorAiAdapter(): OrchestratorAiAdapter {
  return {
    estimateTokens,
    abort() {},
    complete(_input, _model, signal) {
      if (signal.aborted) {
        return Promise.reject(new Error("aborted"));
      }
      return Promise.reject(new Error("AI adapter not configured"));
    },
  };
}
