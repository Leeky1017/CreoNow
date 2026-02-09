import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import {
  SKILL_STREAM_CHUNK_CHANNEL,
  SKILL_STREAM_DONE_CHANNEL,
  type AiStreamEvent,
} from "../../../../../packages/shared/types/ai";
import type { Logger } from "../logging/logger";
import { createIpcPushBackpressureGate } from "./pushBackpressure";
import { createAiService } from "../services/ai/aiService";
import {
  type SecretStorageAdapter,
  createAiProxySettingsService,
} from "../services/ai/aiProxySettingsService";
import { createMemoryService } from "../services/memory/memoryService";
import {
  recordSkillFeedbackAndLearn,
  type SkillFeedbackAction,
} from "../services/memory/preferenceLearning";
import { createStatsService } from "../services/stats/statsService";
import { createSkillService } from "../services/skills/skillService";
import { createDbNotReadyError } from "./dbError";

type SkillRunPayload = {
  skillId: string;
  input: string;
  mode: "agent" | "plan" | "ask";
  model: string;
  context?: { projectId?: string; documentId?: string };
  promptDiagnostics?: { stablePrefixHash: string; promptHash: string };
  stream: boolean;
};

type SkillRunResponse = {
  runId: string;
  outputText?: string;
  promptDiagnostics?: { stablePrefixHash: string; promptHash: string };
};

type ModelCatalogResponse = {
  source: "proxy" | "openai" | "anthropic";
  items: Array<{ id: string; name: string; provider: string }>;
};

type SkillFeedbackPayload = {
  runId: string;
  action: SkillFeedbackAction;
  evidenceRef: string;
};

type SkillFeedbackResponse = {
  recorded: true;
  learning?: {
    ignored: boolean;
    ignoredReason?: string;
    learned: boolean;
    learnedMemoryId?: string;
    signalCount?: number;
    threshold?: number;
  };
};

type ChatSendPayload = {
  message: string;
  projectId?: string;
  documentId?: string;
};

type ChatSendResponse = {
  accepted: true;
  messageId: string;
  echoed: string;
};

const AI_STREAM_RATE_LIMIT_PER_SECOND = 5_000;

/**
 * Return an epoch-ms timestamp for AI stream events.
 */
function nowTs(): number {
  return Date.now();
}

/**
 * Render a user prompt template with an input string.
 *
 * Why: skills are configured as stable prompts; input is injected deterministically.
 */
function renderUserPrompt(args: { template: string; input: string }): string {
  if (args.template.includes("{{input}}")) {
    return args.template.split("{{input}}").join(args.input);
  }
  if (args.template.trim().length === 0) {
    return args.input;
  }
  // Intentionally preserve bytes: do not trim/normalize prompt content.
  return `${args.template}\n\n${args.input}`;
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
  const channel =
    args.event.type === "run_started" || args.event.type === "delta"
      ? SKILL_STREAM_CHUNK_CHANNEL
      : SKILL_STREAM_DONE_CHANNEL;
  try {
    args.sender.send(channel, args.event);
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
  db: Database.Database | null;
  userDataDir: string;
  builtinSkillsDir: string;
  logger: Logger;
  env: NodeJS.ProcessEnv;
  secretStorage?: SecretStorageAdapter;
}): void {
  const pushBackpressureByRenderer = new Map<
    number,
    ReturnType<typeof createIpcPushBackpressureGate>
  >();

  /**
   * Resolve per-renderer push backpressure gate.
   *
   * Why: rate limit must be isolated by renderer process, avoiding cross-window coupling.
   */
  function getPushBackpressureGate(
    sender: Electron.WebContents,
  ): ReturnType<typeof createIpcPushBackpressureGate> {
    const existing = pushBackpressureByRenderer.get(sender.id);
    if (existing) {
      return existing;
    }

    const created = createIpcPushBackpressureGate({
      limitPerSecond: AI_STREAM_RATE_LIMIT_PER_SECOND,
      onDrop: (event) => {
        deps.logger.info("ipc_push_backpressure_triggered", {
          rendererId: sender.id,
          channel: SKILL_STREAM_CHUNK_CHANNEL,
          timestamp: event.timestamp,
          droppedInWindow: event.droppedInWindow,
          limitPerSecond: event.limitPerSecond,
        });
      },
    });
    pushBackpressureByRenderer.set(sender.id, created);
    return created;
  }

  const aiService = createAiService({
    logger: deps.logger,
    env: deps.env,
    getProxySettings: () => {
      if (!deps.db) {
        return null;
      }
      const svc = createAiProxySettingsService({
        db: deps.db,
        logger: deps.logger,
        secretStorage: deps.secretStorage,
      });
      const res = svc.getRaw();
      return res.ok ? res.data : null;
    },
  });
  const runRegistry = new Map<
    string,
    { startedAt: number; context?: SkillRunPayload["context"] }
  >();

  /**
   * Remember a runId for feedback validation.
   *
   * Why: feedback can arrive after the underlying in-flight run entry is cleaned up.
   */
  function rememberRunId(args: {
    runId: string;
    context?: SkillRunPayload["context"];
  }): void {
    runRegistry.set(args.runId, { startedAt: nowTs(), context: args.context });

    const cutoff = nowTs() - 24 * 60 * 60 * 1000;
    for (const [runId, entry] of runRegistry) {
      if (entry.startedAt < cutoff) {
        runRegistry.delete(runId);
      }
    }
  }

  deps.ipcMain.handle(
    "ai:models:list",
    async (): Promise<IpcResponse<ModelCatalogResponse>> => {
      try {
        const res = await aiService.listModels();
        return res.ok
          ? { ok: true, data: res.data }
          : { ok: false, error: res.error };
      } catch (error) {
        deps.logger.error("ai_models_list_ipc_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL", message: "AI models list failed" },
        };
      }
    },
  );
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
      if (payload.model.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "model is required" },
        };
      }
      if (!deps.db) {
        return {
          ok: false,
          error: createDbNotReadyError(),
        };
      }

      const skillSvc = createSkillService({
        db: deps.db,
        userDataDir: deps.userDataDir,
        builtinSkillsDir: deps.builtinSkillsDir,
        logger: deps.logger,
      });
      const resolved = skillSvc.resolveForRun({ id: payload.skillId });
      if (!resolved.ok) {
        return { ok: false, error: resolved.error };
      }
      if (!resolved.data.enabled) {
        return {
          ok: false,
          error: {
            code: "UNSUPPORTED",
            message: "Skill is disabled",
            details: { id: payload.skillId },
          },
        };
      }
      if (!resolved.data.skill.valid) {
        return {
          ok: false,
          error: {
            code: resolved.data.skill.error_code ?? "INVALID_ARGUMENT",
            message: resolved.data.skill.error_message ?? "Skill is invalid",
            details: { id: payload.skillId },
          },
        };
      }

      const pushBackpressure = getPushBackpressureGate(e.sender);

      const emitEvent = (event: AiStreamEvent): void => {
        if (!pushBackpressure.shouldDeliver(event)) {
          return;
        }

        safeEmitToRenderer({ logger: deps.logger, sender: e.sender, event });
      };

      const stats = createStatsService({ db: deps.db, logger: deps.logger });
      const inc = stats.increment({
        ts: nowTs(),
        delta: { skillsUsed: 1 },
      });
      if (!inc.ok) {
        deps.logger.error("stats_increment_skills_used_failed", {
          code: inc.error.code,
          message: inc.error.message,
        });
      }

      try {
        const systemPrompt = resolved.data.skill.prompt?.system ?? "";
        const userPrompt = renderUserPrompt({
          template: resolved.data.skill.prompt?.user ?? "",
          input: payload.input,
        });

        const res = await aiService.runSkill({
          skillId: payload.skillId,
          systemPrompt,
          input: userPrompt,
          mode: payload.mode,
          model: payload.model,
          context: payload.context,
          stream: payload.stream,
          ts: nowTs(),
          emitEvent,
        });
        if (res.ok) {
          rememberRunId({ runId: res.data.runId, context: payload.context });
        }
        return res.ok
          ? {
              ok: true,
              data: {
                ...res.data,
                promptDiagnostics: payload.promptDiagnostics,
              },
            }
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
      payload: SkillFeedbackPayload,
    ): Promise<IpcResponse<SkillFeedbackResponse>> => {
      if (payload.runId.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "runId is required" },
        };
      }

      if (!runRegistry.has(payload.runId)) {
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "runId not found" },
        };
      }

      if (!deps.db) {
        return {
          ok: false,
          error: createDbNotReadyError(),
        };
      }

      try {
        const memSvc = createMemoryService({
          db: deps.db,
          logger: deps.logger,
        });
        const settings = memSvc.getSettings();
        if (!settings.ok) {
          return { ok: false, error: settings.error };
        }

        const learning = recordSkillFeedbackAndLearn({
          db: deps.db,
          logger: deps.logger,
          settings: settings.data,
          runId: payload.runId,
          action: payload.action,
          evidenceRef: payload.evidenceRef,
        });
        if (!learning.ok) {
          return { ok: false, error: learning.error };
        }

        const res = aiService.feedback({
          runId: payload.runId,
          action: payload.action,
          evidenceRef: payload.evidenceRef,
          ts: nowTs(),
        });
        return res.ok
          ? {
              ok: true,
              data: {
                recorded: true,
                learning: {
                  ignored: learning.data.ignored,
                  ignoredReason: learning.data.ignoredReason,
                  learned: learning.data.learned,
                  learnedMemoryId: learning.data.learnedMemoryId,
                  signalCount: learning.data.signalCount,
                  threshold: learning.data.threshold,
                },
              },
            }
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

  deps.ipcMain.handle(
    "ai:chat:send",
    async (
      _e,
      payload: ChatSendPayload,
    ): Promise<IpcResponse<ChatSendResponse>> => {
      const message = payload.message.trim();
      if (message.length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "message is required" },
        };
      }

      return {
        ok: true,
        data: {
          accepted: true,
          messageId: `chat-${nowTs()}`,
          echoed: message,
        },
      };
    },
  );
}
