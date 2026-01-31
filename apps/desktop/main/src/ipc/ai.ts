import type { IpcMain } from "electron";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import {
  AI_SKILL_STREAM_CHANNEL,
  type AiStreamEvent,
} from "../../../../../packages/shared/types/ai";
import type { Logger } from "../logging/logger";
import { createAiService } from "../services/ai/aiService";

type SkillRunPayload = {
  skillId: string;
  input: string;
  context?: { projectId?: string; documentId?: string };
  stream: boolean;
};

type SkillRunResponse = { runId: string; outputText?: string };

/**
 * Return an epoch-ms timestamp for AI stream events.
 */
function nowTs(): number {
  return Date.now();
}

/**
 * Best-effort emit a stream event to the renderer that invoked the skill.
 *
 * Why: renderer cannot access Node APIs; streaming must cross IPC as push events.
 */
function safeEmitToRenderer(args: {
  logger: Logger;
  sender: Electron.WebContents;
  event: AiStreamEvent;
}): void {
  try {
    args.sender.send(AI_SKILL_STREAM_CHANNEL, args.event);
  } catch (error) {
    args.logger.error("ai_stream_send_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Register `ai:skill:*` IPC handlers.
 *
 * Why: AI runtime lives in the main process (secrets + network + observability),
 * while the renderer only consumes typed results and stream events.
 */
export function registerAiIpcHandlers(deps: {
  ipcMain: IpcMain;
  logger: Logger;
  env: NodeJS.ProcessEnv;
}): void {
  const aiService = createAiService({ logger: deps.logger, env: deps.env });

  deps.ipcMain.handle(
    "ai:skill:run",
    async (
      e,
      payload: SkillRunPayload,
    ): Promise<IpcResponse<SkillRunResponse>> => {
      if (payload.skillId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "skillId is required" },
        };
      }

      const emitEvent = (event: AiStreamEvent): void => {
        safeEmitToRenderer({ logger: deps.logger, sender: e.sender, event });
      };

      try {
        const res = await aiService.runSkill({
          skillId: payload.skillId,
          input: payload.input,
          context: payload.context,
          stream: payload.stream,
          ts: nowTs(),
          emitEvent,
        });
        return res.ok
          ? { ok: true, data: res.data }
          : { ok: false, error: res.error };
      } catch (error) {
        deps.logger.error("ai_run_ipc_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL", message: "AI run failed" },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "ai:skill:cancel",
    async (
      _e,
      payload: { runId: string },
    ): Promise<IpcResponse<{ canceled: true }>> => {
      if (payload.runId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "runId is required" },
        };
      }

      try {
        const res = aiService.cancel({ runId: payload.runId, ts: nowTs() });
        return res.ok
          ? { ok: true, data: res.data }
          : { ok: false, error: res.error };
      } catch (error) {
        deps.logger.error("ai_cancel_ipc_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL", message: "AI cancel failed" },
        };
      }
    },
  );

  deps.ipcMain.handle(
    "ai:skill:feedback",
    async (
      _e,
      payload: { runId: string; rating: "up" | "down"; comment?: string },
    ): Promise<IpcResponse<{ recorded: true }>> => {
      if (payload.runId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "runId is required" },
        };
      }

      try {
        const res = aiService.feedback({
          runId: payload.runId,
          rating: payload.rating,
          comment: payload.comment,
          ts: nowTs(),
        });
        return res.ok
          ? { ok: true, data: res.data }
          : { ok: false, error: res.error };
      } catch (error) {
        deps.logger.error("ai_feedback_ipc_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL", message: "AI feedback failed" },
        };
      }
    },
  );
}

