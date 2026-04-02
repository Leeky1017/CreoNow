import { randomUUID } from "node:crypto";
import type { IpcMain } from "electron";
import type Database from "better-sqlite3";

import type { IpcError, IpcResponse } from "@shared/types/ipc-generated";
import { nowTs } from "@shared/timeUtils";
import {
  SKILL_QUEUE_STATUS_CHANNEL,
  SKILL_STREAM_CHUNK_CHANNEL,
  SKILL_STREAM_DONE_CHANNEL,
  type AiStreamEvent,
} from "@shared/types/ai";
import type { Logger } from "../logging/logger";
import { createIpcPushBackpressureGate } from "./pushBackpressure";
import { createAiService } from "../services/ai/aiService";
import { createSqliteTraceStore } from "../services/ai/traceStore";
import { resolveRuntimeGovernanceFromEnv } from "../config/runtimeGovernance";
import {
  type SecretStorageAdapter,
  createAiProxySettingsService,
} from "../services/ai/aiProxySettingsService";
import { createMemoryService } from "../services/memory/memoryService";
import { createEpisodicMemoryService, createSqliteEpisodeRepository } from "../services/memory/episodicMemoryService";
import {
  recordSkillFeedbackAndLearn,
  type SkillFeedbackAction,
} from "../services/memory/preferenceLearning";
import { createStatsService } from "../services/stats/statsService";
import { createSkillService } from "../services/skills/skillService";
import { createSkillExecutor } from "../services/skills/skillExecutor";
import { createContextLayerAssemblyService } from "../services/context/layerAssemblyService";
import { createKnowledgeGraphService } from "../services/kg/kgService";
import { DegradationCounter } from "../services/shared/degradationCounter";
import { createDbNotReadyError } from "./dbError";
import type { ProjectSessionBindingRegistry } from "./projectSessionBinding";
import {
  createWritingOrchestrator,
  type WritingEvent,
} from "../services/skills/orchestrator";
import { createWritingToolRegistry } from "../services/skills/writingTooling";
import { estimateTokens } from "../services/context/tokenEstimation";

type SkillRunPayload = {
  skillId: string;
  hasSelection?: boolean;
  cursorPosition?: number;
  input: string;
  mode: "agent" | "plan" | "ask";
  model: string;
  candidateCount?: number;
  context?: { projectId?: string; documentId?: string };
  selection?: {
    from: number;
    to: number;
    text: string;
    selectionTextHash: string;
  };
  promptDiagnostics?: { stablePrefixHash: string; promptHash: string };
  stream: boolean;
};

function resolveCursorPosition(payload: SkillRunPayload): number | undefined {
  if (payload.selection) {
    return payload.selection.to;
  }
  if (
    typeof payload.cursorPosition === "number" &&
    Number.isSafeInteger(payload.cursorPosition) &&
    payload.cursorPosition >= 0
  ) {
    return payload.cursorPosition;
  }
  return undefined;
}

type SkillRunUsage = {
  promptTokens: number;
  completionTokens: number;
  sessionTotalTokens: number;
  estimatedCostUsd?: number;
};

type SkillRunCandidate = {
  id: string;
  runId: string;
  text: string;
  summary: string;
};

type SkillRunResponse = {
  executionId: string;
  runId: string;
  status: "preview" | "completed" | "rejected";
  previewId?: string;
  versionId?: string;
  outputText?: string;
  candidates?: SkillRunCandidate[];
  usage?: SkillRunUsage;
  promptDiagnostics?: { stablePrefixHash: string; promptHash: string };
};

type SkillRunResponseDataInput = SkillRunResponse & {
  contextPrompt?: string;
};

type SkillRunConfirmPayload = {
  executionId: string;
  action: "accept" | "reject";
};

type SkillRunConfirmResponse = {
  executionId: string;
  runId: string;
  status: "completed" | "rejected";
  versionId?: string;
  outputText?: string;
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
  sessionId?: string;
  documentId?: string;
};

type ChatSendResponse = {
  accepted: true;
  messageId: string;
  sessionId: string;
  echoed: string;
};

type ChatListPayload = {
  projectId?: string;
  sessionId?: string;
};

type ChatMessageRole = "user" | "assistant";

type ChatHistoryMessage = {
  messageId: string;
  projectId: string;
  role: ChatMessageRole;
  content: string;
  skillId?: string;
  timestamp: number;
  traceId: string;
};

type ChatListResponse = {
  items: ChatHistoryMessage[];
};

type ChatClearPayload = {
  projectId?: string;
  sessionId?: string;
};

type ChatClearResponse = {
  cleared: true;
  removed: number;
};

type ChatSession = {
  sessionId: string;
  projectId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

type ChatSessionsPayload = {
  projectId?: string;
  query?: string;
};

type ChatSessionsResponse = {
  sessions: ChatSession[];
};

type ChatSessionDeletePayload = {
  projectId?: string;
  sessionId: string;
};

type ChatSessionDeleteResponse = {
  deleted: true;
};

const AI_CANDIDATE_COUNT_MIN = 1;
const AI_CANDIDATE_COUNT_MAX = 5;

type ModelPricing = {
  promptPer1kTokens: number;
  completionPer1kTokens: number;
};

/**
 * Parse candidateCount input and enforce the fixed 1..5 range.
 */
function parseCandidateCount(
  raw: number | undefined,
):
  | { ok: true; data: number }
  | { ok: false; error: { code: "INVALID_ARGUMENT"; message: string } } {
  if (raw === undefined) {
    return { ok: true, data: 1 };
  }
  if (!Number.isFinite(raw) || !Number.isInteger(raw)) {
    return {
      ok: false,
      error: {
        code: "INVALID_ARGUMENT",
        message: "candidateCount must be an integer between 1 and 5",
      },
    };
  }
  if (raw < AI_CANDIDATE_COUNT_MIN || raw > AI_CANDIDATE_COUNT_MAX) {
    return {
      ok: false,
      error: {
        code: "INVALID_ARGUMENT",
        message: "candidateCount must be between 1 and 5",
      },
    };
  }
  return { ok: true, data: raw };
}

/**
 * Build a concise card summary for candidate rendering.
 */
function summarizeCandidateText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 120) {
    return normalized;
  }
  return `${normalized.slice(0, 117)}...`;
}

function createPendingPermissionGate(): PendingPermissionGate {
  const pending = new Map<string, (granted: boolean) => void>();
  const settled = new Map<string, boolean>();

  return {
    async evaluate() {
      return { level: "preview-confirm", granted: false };
    },
    async requestPermission(request: unknown) {
      const maybeRequest = request as { requestId?: unknown };
      const requestId =
        typeof maybeRequest?.requestId === "string" ? maybeRequest.requestId : "";
      if (requestId.length === 0) {
        return false;
      }
      const preResolved = settled.get(requestId);
      if (typeof preResolved === "boolean") {
        settled.delete(requestId);
        return preResolved;
      }
      return await new Promise<boolean>((resolve) => {
        pending.set(requestId, resolve);
      });
    },
    resolve(requestId: string, granted: boolean) {
      const resolver = pending.get(requestId);
      if (!resolver) {
        settled.set(requestId, granted);
        return true;
      }
      pending.delete(requestId);
      resolver(granted);
      return true;
    },
    rejectAll() {
      for (const [requestId, resolver] of pending) {
        pending.delete(requestId);
        resolver(false);
      }
      settled.clear();
    },
  };
}

function renderSkillUserPrompt(args: {
  template: string;
  input: string;
}): string {
  if (args.template.includes("{{input}}")) {
    return args.template.split("{{input}}").join(args.input);
  }
  if (args.template.trim().length === 0) {
    return args.input;
  }
  return `${args.template}\n\n${args.input}`;
}

function resolveP1BuiltinSkill(skillId: string):
  | {
      id: string;
      prompt: { system: string; user: string };
      inputType: "selection" | "document";
      enabled: true;
      valid: true;
      output?: Record<string, unknown>;
      dependsOn?: string[];
      timeoutMs?: number;
    }
  | null {
  const normalized = leafSkillId(skillId);
  if (normalized === "polish") {
    return {
      id: "builtin:polish",
      prompt: {
        system:
          "You are CreoNow's writing assistant. Follow the user's intent exactly. Preserve meaning and factual claims. Do not add new information.",
        user: "Polish the following text for clarity and style.\n\n<text>\n{{input}}\n</text>",
      },
      inputType: "selection",
      enabled: true,
      valid: true,
    };
  }
  if (normalized === "rewrite") {
    return {
      id: "builtin:rewrite",
      prompt: {
        system:
          "You are CreoNow's writing assistant. Rewrite the input while preserving meaning and factual claims. Follow all explicit rewrite instructions from the input.",
        user: "Rewrite the following text according to the user's instruction.\n\n<input>\n{{input}}\n</input>",
      },
      inputType: "selection",
      enabled: true,
      valid: true,
    };
  }
  if (normalized === "continue") {
    return {
      id: "builtin:continue",
        prompt: {
          system:
            "You are CreoNow's writing assistant. Continue writing from provided context, matching style and narrative constraints.",
          user: "Continue the draft based on current context and constraints.\n\n<text>\n{{input}}\n</text>",
        },
      inputType: "document",
      enabled: true,
      valid: true,
    };
  }
  return null;
}

async function prepareWritingRequest(args: {
  ctx: AiIpcContext;
  payload: SkillRunPayload;
}): Promise<
  | {
      ok: true;
      data: {
        messages: Array<{ role: string; content: string }>;
        tokenCount: number;
        modelId: string;
      };
    }
  | { ok: false; error: { code: string; message: string; details?: unknown } }
> {
  const skillSvc = args.ctx.skillServiceFactory();
  const resolved = skillSvc.resolveForRun({ id: args.payload.skillId });
  const resolvedData = resolved.ok
    ? resolved.data
    : (() => {
        const fallback = resolveP1BuiltinSkill(args.payload.skillId);
        if (!fallback) {
          return null;
        }
        return {
          skill: fallback,
          enabled: true,
          inputType: fallback.inputType,
        };
      })();
  if (!resolvedData) {
    return {
      ok: false,
      error: resolved.ok
        ? { code: "NOT_FOUND", message: "Skill not found" }
        : resolved.error,
    };
  }
  if (!resolvedData.enabled) {
    return {
      ok: false,
      error: { code: "UNSUPPORTED", message: "Skill is disabled" },
    };
  }
  if (!resolvedData.skill.valid) {
    return {
      ok: false,
      error: {
        code: resolvedData.skill.error_code ?? "INVALID_ARGUMENT",
        message: resolvedData.skill.error_message ?? "Skill is invalid",
      },
    };
  }

  const input = args.payload.input.trim();
  const inputType = resolvedData.inputType ?? "selection";
  if (inputType === "selection" && input.length === 0) {
    return {
      ok: false,
      error: {
        code: "SKILL_INPUT_EMPTY",
        message:
          leafSkillId(args.payload.skillId) === "polish"
            ? "请先选中需要润色的文本"
            : "请先提供需要处理的文本",
      },
    };
  }

  let contextPrompt = "";
  const projectId = args.payload.context?.projectId?.trim() ?? "";
  const documentId = args.payload.context?.documentId?.trim() ?? "";
  const cursorPosition = resolveCursorPosition(args.payload);

  if (projectId.length > 0 && documentId.length > 0) {
    try {
      const assembled = await args.ctx.contextAssemblyService.assemble({
        projectId,
        documentId,
        cursorPosition: cursorPosition ?? 0,
        skillId: args.payload.skillId,
        additionalInput: input,
        provider: "ai-service",
        model: args.payload.model,
      });
      contextPrompt = assembled.prompt.trim();
    } catch (error) {
      args.ctx.deps.logger.info("context_assembly_degraded", {
        skillId: args.payload.skillId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const systemPrompt = resolvedData.skill.prompt?.system?.trim() ?? "";
  const userPrompt = renderSkillUserPrompt({
    template: resolvedData.skill.prompt?.user ?? "",
    input,
  });

  const messages = [
    {
      role: "system",
      content: [systemPrompt, contextPrompt].filter(Boolean).join("\n\n"),
    },
    {
      role: "user",
      content: userPrompt,
    },
  ];

  const tokenCount = estimateTokens(
    messages.map((message) => message.content).join("\n\n"),
  );

  return {
    ok: true,
    data: {
      messages,
      tokenCount,
      modelId: args.payload.model,
    },
  };
}

function buildPreviewCandidates(args: {
  runId: string;
  outputText: string;
}): SkillRunCandidate[] {
  return [
    {
      id: "candidate-1",
      runId: args.runId,
      text: args.outputText,
      summary: summarizeCandidateText(args.outputText),
    },
  ];
}

function emitOrchestratorChunk(args: {
  ctx: AiIpcContext;
  sender: Electron.WebContents;
  executionId: string;
  runId: string;
  traceId: string;
  seq: number;
  delta: string;
}): void {
  const pushBackpressure = getOrCreatePushBackpressureGate(args.ctx, args.sender);
  const event: AiStreamEvent = {
    type: "chunk",
    executionId: args.executionId,
    runId: args.runId,
    traceId: args.traceId,
    seq: args.seq,
    chunk: args.delta,
    ts: nowTs(),
  };
  if (!pushBackpressure.shouldDeliver(event)) {
    return;
  }
  safeEmitToRenderer({
    logger: args.ctx.deps.logger,
    sender: args.sender,
    event,
  });
}

function emitOrchestratorDone(args: {
  ctx: AiIpcContext;
  sender: Electron.WebContents;
  executionId: string;
  runId: string;
  traceId: string;
  terminal: "completed" | "cancelled" | "error";
  outputText: string;
  error?: IpcError;
  model: string;
  usage?: SkillRunResponse["usage"];
}): void {
  safeEmitToRenderer({
    logger: args.ctx.deps.logger,
    sender: args.sender,
    event: {
      type: "done",
      executionId: args.executionId,
      runId: args.runId,
      traceId: args.traceId,
      terminal: args.terminal,
      outputText: args.outputText,
      ...(args.error ? { error: args.error } : {}),
      result: {
        success: args.terminal === "completed",
        output: args.outputText,
        metadata: {
          model: args.model,
          promptTokens: args.usage?.promptTokens ?? 0,
          completionTokens: args.usage?.completionTokens ?? 0,
        },
        traceId: args.traceId,
        ...(args.error ? { error: args.error } : {}),
      },
      ts: nowTs(),
    },
  });
}

/**
 * Normalize AI run response payload to the IPC contract surface.
 *
 * Why: executor internals (e.g. `contextPrompt`) must never leak across IPC
 * response validation boundaries.
 */
export function toSkillRunResponseData(
  data: SkillRunResponseDataInput,
): SkillRunResponse {
  return {
    executionId: data.executionId,
    runId: data.runId,
    status: data.status,
    ...(typeof data.previewId === "string" ? { previewId: data.previewId } : {}),
    ...(typeof data.versionId === "string" ? { versionId: data.versionId } : {}),
    ...(typeof data.outputText === "string"
      ? { outputText: data.outputText }
      : {}),
    ...(Array.isArray(data.candidates) ? { candidates: data.candidates } : {}),
    ...(data.usage ? { usage: data.usage } : {}),
    ...(data.promptDiagnostics
      ? { promptDiagnostics: data.promptDiagnostics }
      : {}),
  };
}

function leafSkillId(skillId: string): string {
  const parts = skillId.split(":");
  return parts[parts.length - 1] ?? skillId;
}

/**
 * Parse per-model pricing from env JSON.
 *
 * Format:
 * {"gpt-5.2":{"promptPer1kTokens":0.0015,"completionPer1kTokens":0.003}}
 */
function parseModelPricingMap(
  env: NodeJS.ProcessEnv,
): Map<string, ModelPricing> {
  const raw = env.CREONOW_AI_MODEL_PRICING_JSON;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return new Map();
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return new Map();
    }
    const entries = Object.entries(parsed as Record<string, unknown>);
    const map = new Map<string, ModelPricing>();
    for (const [model, value] of entries) {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        continue;
      }
      const record = value as Record<string, unknown>;
      const prompt = record.promptPer1kTokens;
      const completion = record.completionPer1kTokens;
      if (
        typeof prompt !== "number" ||
        !Number.isFinite(prompt) ||
        prompt < 0 ||
        typeof completion !== "number" ||
        !Number.isFinite(completion) ||
        completion < 0
      ) {
        continue;
      }
      map.set(model, {
        promptPer1kTokens: prompt,
        completionPer1kTokens: completion,
      });
    }
    return map;
  } catch {
    return new Map();
  }
}

/**
 * Validate and normalize chat project scope key.
 *
 * Why: chat history must be isolated by project to prevent cross-project leakage.
 */

function validateChatPayload(
  payload: unknown,
): asserts payload is Record<string, unknown> {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("payload must be an object");
  }
}

function resolveChatProjectId(args: {
  projectId?: string;
  boundProjectId?: string | null;
}):
  | { ok: true; data: string }
  | {
      ok: false;
      error:
        | { code: "INVALID_ARGUMENT"; message: string }
        | { code: "FORBIDDEN"; message: string };
    } {
  const boundProjectId = args.boundProjectId?.trim() ?? "";
  const requestedProjectId = args.projectId?.trim() ?? "";

  if (requestedProjectId.length === 0) {
    if (boundProjectId.length > 0) {
      return { ok: true, data: boundProjectId };
    }
    return {
      ok: false,
      error: {
        code: "INVALID_ARGUMENT",
        message: "projectId is required",
      },
    };
  }

  if (boundProjectId.length > 0 && requestedProjectId !== boundProjectId) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "projectId is not active for this renderer session",
      },
    };
  }

  return { ok: true, data: requestedProjectId };
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
    args.event.type === "chunk"
      ? SKILL_STREAM_CHUNK_CHANNEL
      : args.event.type === "queue"
        ? SKILL_QUEUE_STATUS_CHANNEL
        : SKILL_STREAM_DONE_CHANNEL;
  try {
    args.sender.send(channel, args.event);
  } catch (error) {
    args.logger.error("ai_stream_send_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

type AiIpcDeps = {
  ipcMain: IpcMain;
  db: Database.Database | null;
  userDataDir: string;
  builtinSkillsDir: string;
  logger: Logger;
  env: NodeJS.ProcessEnv;
  secretStorage?: SecretStorageAdapter;
  projectSessionBinding?: ProjectSessionBindingRegistry;
};

type AiIpcContext = {
  deps: AiIpcDeps;
  runtimeGovernance: ReturnType<typeof resolveRuntimeGovernanceFromEnv>;
  aiService: ReturnType<typeof createAiService>;
  writingOrchestrator: ReturnType<typeof createWritingOrchestrator>;
  skillServiceFactory: () => ReturnType<typeof createSkillService>;
  contextAssemblyService: ReturnType<typeof createContextLayerAssemblyService>;
  runRegistry: Map<
    string,
    {
      startedAt: number;
      executionId: string;
      context?: SkillRunPayload["context"];
    }
  >;
  previewSessions: Map<string, PendingPreviewSession>;
  permissionGate: PendingPermissionGate;
  sessionTokenTotalsByContext: Map<string, number>;
  modelPricingByModel: Map<string, ModelPricing>;
  pushBackpressureByRenderer: Map<
    number,
    ReturnType<typeof createIpcPushBackpressureGate>
  >;
};

type PendingPreviewSession = {
  executionId: string;
  runId: string;
  traceId: string;
  sender: Electron.WebContents;
  payload: SkillRunPayload;
  generator: AsyncGenerator<WritingEvent>;
  outputText: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  completion: Promise<IpcResponse<SkillRunConfirmResponse>>;
};

type PendingPermissionGate = {
  evaluate: (request: unknown) => Promise<{ level: string; granted: boolean }>;
  requestPermission: (request: unknown) => Promise<boolean>;
  resolve: (requestId: string, granted: boolean) => boolean;
  rejectAll: () => void;
};

function getOrCreatePushBackpressureGate(
  ctx: AiIpcContext,
  sender: Electron.WebContents,
): ReturnType<typeof createIpcPushBackpressureGate> {
  const existing = ctx.pushBackpressureByRenderer.get(sender.id);
  if (existing) {
    return existing;
  }
  const created = createIpcPushBackpressureGate({
    limitPerSecond: ctx.runtimeGovernance.ai.streamRateLimitPerSecond,
    onDrop: (event) => {
      ctx.deps.logger.info("ipc_push_backpressure_triggered", {
        rendererId: sender.id,
        channel: SKILL_STREAM_CHUNK_CHANNEL,
        timestamp: event.timestamp,
        droppedInWindow: event.droppedInWindow,
        limitPerSecond: event.limitPerSecond,
      });
    },
  });
  ctx.pushBackpressureByRenderer.set(sender.id, created);
  return created;
}

function rememberRunInRegistry(
  ctx: AiIpcContext,
  args: {
    runId: string;
    executionId: string;
    context?: SkillRunPayload["context"];
  },
): void {
  ctx.runRegistry.set(args.runId, {
    startedAt: nowTs(),
    executionId: args.executionId,
    context: args.context,
  });
  const cutoff = nowTs() - 24 * 60 * 60 * 1000;
  for (const [runId, entry] of ctx.runRegistry) {
    if (entry.startedAt < cutoff) {
      ctx.runRegistry.delete(runId);
    }
  }
}

function resolveUsageContextKey(context?: SkillRunPayload["context"]): string {
  const projectId = context?.projectId?.trim() ?? "";
  if (projectId.length > 0) {
    return `project:${projectId}`;
  }
  const documentId = context?.documentId?.trim() ?? "";
  if (documentId.length > 0) {
    return `document:${documentId}`;
  }
  return "global";
}

function buildSkillRunUsage(
  ctx: AiIpcContext,
  args: {
    model: string;
    context?: SkillRunPayload["context"];
    promptTokens: number;
    completionTokens: number;
  },
): SkillRunUsage {
  const key = resolveUsageContextKey(args.context);
  const delta =
    Math.max(0, args.promptTokens) + Math.max(0, args.completionTokens);
  const nextTotal = (ctx.sessionTokenTotalsByContext.get(key) ?? 0) + delta;
  ctx.sessionTokenTotalsByContext.set(key, nextTotal);

  const pricing = ctx.modelPricingByModel.get(args.model.trim());
  const estimatedCostUsd =
    pricing === undefined
      ? undefined
      : Number(
          (
            (Math.max(0, args.promptTokens) / 1000) *
              pricing.promptPer1kTokens +
            (Math.max(0, args.completionTokens) / 1000) *
              pricing.completionPer1kTokens
          ).toFixed(6),
        );

  return {
    promptTokens: Math.max(0, args.promptTokens),
    completionTokens: Math.max(0, args.completionTokens),
    sessionTotalTokens: nextTotal,
    ...(typeof estimatedCostUsd === "number" ? { estimatedCostUsd } : {}),
  };
}

/**
 * Register `ai:skill:*` IPC handlers.
 *
 * Why: AI runtime lives in the main process (secrets + network + observability),
 * while the renderer only consumes typed results and stream events.
 */
export function registerAiIpcHandlers(deps: AiIpcDeps): void {
  const runtimeGovernance = resolveRuntimeGovernanceFromEnv(deps.env);
  const pushBackpressureByRenderer = new Map<
    number,
    ReturnType<typeof createIpcPushBackpressureGate>
  >();

  const aiService = createAiService({
    logger: deps.logger,
    env: deps.env,
    ...(deps.db
      ? {
          traceStore: createSqliteTraceStore({
            db: deps.db,
            logger: deps.logger,
          }),
        }
      : {}),
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
    {
      startedAt: number;
      executionId: string;
      context?: SkillRunPayload["context"];
    }
  >();
  const sessionTokenTotalsByContext = new Map<string, number>();
  const modelPricingByModel = parseModelPricingMap(deps.env);
  const degradationCounter = new DegradationCounter();
  const memoryServiceForContext =
    deps.db !== null
      ? createMemoryService({
          db: deps.db,
          logger: deps.logger,
          degradationCounter,
        })
      : undefined;
  const episodicMemoryServiceForContext =
    deps.db !== null
      ? createEpisodicMemoryService({
          repository: createSqliteEpisodeRepository({
            db: deps.db,
            logger: deps.logger,
          }),
          logger: deps.logger,
        })
      : undefined;
  const contextAssemblyService = createContextLayerAssemblyService(
    undefined,
    deps.db
      ? {
          logger: deps.logger,
          degradationCounter,
          kgService: createKnowledgeGraphService({
            db: deps.db,
            logger: deps.logger,
          }),
          ...(memoryServiceForContext
            ? { memoryService: memoryServiceForContext }
            : {}),
          ...(episodicMemoryServiceForContext
            ? { episodicMemoryService: episodicMemoryServiceForContext }
            : {}),
        }
      : undefined,
  );
  const skillExecutor = createSkillExecutor({
    resolveSkill: (skillId) => {
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
      const resolved = skillSvc.resolveForRun({ id: skillId });
      const resolvedData = resolved.ok
        ? resolved.data
        : (() => {
            const fallback = resolveP1BuiltinSkill(skillId);
            if (!fallback) {
              return null;
            }
            return {
              skill: fallback,
              enabled: true,
              inputType: fallback.inputType,
            };
          })();
      if (!resolvedData) {
        return {
          ok: false,
          error: resolved.ok
            ? { code: "NOT_FOUND", message: "Skill not found" }
            : resolved.error,
        };
      }
      const fallbackSkill =
        "error_code" in resolvedData.skill ? resolvedData.skill : undefined;
      return {
        ok: true,
        data: {
          id: resolvedData.skill.id,
          prompt: resolvedData.skill.prompt,
          output: resolvedData.skill.output,
          enabled: resolvedData.enabled,
          valid: resolvedData.skill.valid,
          inputType: resolvedData.inputType,
          dependsOn: resolvedData.skill.dependsOn,
          timeoutMs: resolvedData.skill.timeoutMs,
          error_code: fallbackSkill?.error_code,
          error_message: fallbackSkill?.error_message,
        },
      };
    },
    checkDependencies: ({ dependsOn }) => {
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

      const missing: string[] = [];
      for (const dependencyId of dependsOn) {
        const available = skillSvc.isDependencyAvailable({ dependencyId });
        if (!available.ok) {
          return {
            ok: false,
            error: available.error,
          };
        }
        if (!available.data.available) {
          missing.push(dependencyId);
        }
      }

      if (missing.length > 0) {
        return {
          ok: false,
          error: {
            code: "SKILL_DEPENDENCY_MISSING",
            message: "Skill dependency missing",
            details: missing,
          },
        };
      }

      return { ok: true, data: true };
    },
    runSkill: async (args) => {
      return await aiService.runSkill(args);
    },
    assembleContext: async (args) => {
      return await contextAssemblyService.assemble(args);
    },
    logger: {
      warn: (event, data) => deps.logger.info(event, data),
    },
  });
  const permissionGate = createPendingPermissionGate();
  const skillServiceFactory = () => {
    if (!deps.db) {
      throw new Error("Database not ready");
    }
    return createSkillService({
      db: deps.db,
      userDataDir: deps.userDataDir,
      builtinSkillsDir: deps.builtinSkillsDir,
      logger: deps.logger,
    });
  };
  const writingOrchestrator = createWritingOrchestrator({
    aiService: {
      async *streamChat() {
        return;
      },
      estimateTokens,
      abort() {
        return;
      },
    },
    toolRegistry:
      deps.db === null
        ? createWritingToolRegistry({
            db: {} as Database.Database,
            logger: deps.logger,
          })
        : createWritingToolRegistry({
            db: deps.db,
            logger: deps.logger,
          }),
    permissionGate,
    postWritingHooks: [
      {
        name: "auto-save-version",
        async execute() {
          return;
        },
      },
    ],
    defaultTimeoutMs: 30_000,
    prepareRequest: async (request) => {
      const prepared = await prepareWritingRequest({
        ctx: {
          deps,
          runtimeGovernance,
          aiService,
          writingOrchestrator: undefined as never,
          skillServiceFactory,
          contextAssemblyService,
          runRegistry: new Map(),
          previewSessions: new Map(),
          permissionGate,
          sessionTokenTotalsByContext,
          modelPricingByModel,
          pushBackpressureByRenderer,
        },
        payload: {
          skillId: request.skillId,
          hasSelection: Boolean(request.selection),
          input: request.input.selectedText ?? "",
          mode: "ask",
          model: request.modelId ?? "default",
          context: {
            projectId: request.projectId,
            documentId: request.documentId,
          },
          selection: request.selection,
          stream: true,
        },
      });
      if (!prepared.ok) {
        const err = Object.assign(new Error(prepared.error.message), {
          code: prepared.error.code,
          ...(prepared.error.details !== undefined
            ? { details: prepared.error.details }
            : {}),
        });
        throw err;
      }
      return prepared.data;
    },
    generateText: async ({ request, signal, emitChunk }) => {
      let outputText = "";
      let usage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };
      let sawStreamChunk = false;
      let streamTerminalSeen = false;
      let settleStreamCompletion: (() => void) | null = null;
      let rejectStreamCompletion: ((error: Error) => void) | null = null;
      const streamCompletion = new Promise<void>((resolve, reject) => {
        settleStreamCompletion = resolve;
        rejectStreamCompletion = reject;
      });
      const res = await skillExecutor.execute({
        skillId: request.skillId,
        hasSelection: Boolean(request.selection),
        input: request.input.selectedText ?? "",
        mode: "ask",
        model: request.modelId ?? "default",
        context: {
          projectId: request.projectId,
          documentId: request.documentId,
        },
        stream: true,
        ts: nowTs(),
        emitEvent: (event) => {
          if (signal.aborted) {
            return;
          }
          if (event.type === "chunk") {
            sawStreamChunk = true;
            outputText += event.chunk;
            const accumulatedTokens = estimateTokens(outputText);
            emitChunk(event.chunk, accumulatedTokens);
            return;
          }
          if (event.type === "done") {
            if (!sawStreamChunk && event.outputText.length > 0) {
              outputText = event.outputText;
              emitChunk(event.outputText, estimateTokens(event.outputText));
              sawStreamChunk = true;
            } else {
              outputText = event.outputText;
            }
            usage = {
              promptTokens: event.result?.metadata.promptTokens ?? estimateTokens(request.input.selectedText ?? ""),
              completionTokens:
                event.result?.metadata.completionTokens ?? estimateTokens(event.outputText),
              totalTokens:
                (event.result?.metadata.promptTokens ?? estimateTokens(request.input.selectedText ?? "")) +
                (event.result?.metadata.completionTokens ?? estimateTokens(event.outputText)),
            };
            streamTerminalSeen = true;
            if (event.terminal === "completed") {
              settleStreamCompletion?.();
            } else {
              rejectStreamCompletion?.(
                Object.assign(
                  new Error(
                    event.error?.message ??
                      (event.terminal === "cancelled"
                        ? "AI request canceled"
                        : "AI stream failed"),
                  ),
                  {
                    code: event.error?.code ?? "AI_SERVICE_ERROR",
                    terminal: event.terminal,
                  },
                ),
              );
            }
          }
        },
      });
      if (!res.ok) {
        throw res.error;
      }
      if (!streamTerminalSeen) {
        await streamCompletion;
      }
      if (!sawStreamChunk && (res.data.outputText?.length ?? 0) > 0) {
        const finalOutput = res.data.outputText ?? "";
        outputText = finalOutput;
        emitChunk(finalOutput, estimateTokens(finalOutput));
      }
      return {
        fullText: outputText || res.data.outputText || "",
        usage,
      };
    },
  });

  const ctx: AiIpcContext = {
    deps,
    runtimeGovernance,
    aiService,
    writingOrchestrator,
    skillServiceFactory,
    contextAssemblyService,
    runRegistry,
    previewSessions: new Map(),
    permissionGate,
    sessionTokenTotalsByContext,
    modelPricingByModel,
    pushBackpressureByRenderer,
  };

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
  registerAiSkillRunHandler(ctx);
  registerAiSkillLifecycleHandlers(ctx);
  registerAiChatHandlers(ctx);
}

async function drainPreviewUntilPause(args: {
  ctx: AiIpcContext;
  sender: Electron.WebContents;
  executionId: string;
  runId: string;
  traceId: string;
  payload: SkillRunPayload;
  generator: AsyncGenerator<WritingEvent>;
}): Promise<IpcResponse<SkillRunResponse>> {
  let seq = 0;
  let outputText = "";
  let usage:
    | {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      }
    | undefined;
  let versionId: string | undefined;

  while (true) {
    const next = await args.generator.next();
    if (next.done) {
      emitOrchestratorDone({
        ctx: args.ctx,
        sender: args.sender,
        executionId: args.executionId,
        runId: args.runId,
        traceId: args.traceId,
        terminal: "completed",
        outputText,
        model: args.payload.model,
        usage: usage
          ? buildSkillRunUsage(args.ctx, {
              model: args.payload.model,
              context: args.payload.context,
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
            })
          : undefined,
      });
      return {
        ok: true,
        data: {
          executionId: args.executionId,
          runId: args.runId,
          status: "completed",
          ...(versionId ? { versionId } : {}),
          outputText,
          candidates: buildPreviewCandidates({ runId: args.runId, outputText }),
          ...(usage
            ? {
                usage: buildSkillRunUsage(args.ctx, {
                  model: args.payload.model,
                  context: args.payload.context,
                  promptTokens: usage.promptTokens,
                  completionTokens: usage.completionTokens,
                }),
              }
            : {}),
          ...(args.payload.promptDiagnostics
            ? { promptDiagnostics: args.payload.promptDiagnostics }
            : {}),
        },
      };
    }

    const event = next.value;
    if (event.type === "ai-chunk") {
      seq += 1;
      emitOrchestratorChunk({
        ctx: args.ctx,
        sender: args.sender,
        executionId: args.executionId,
        runId: args.runId,
        traceId: args.traceId,
        seq,
        delta: String(event.delta ?? ""),
      });
      continue;
    }

    if (event.type === "ai-done") {
      outputText = String(event.fullText ?? "");
      usage = event.usage as {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
      continue;
    }

    if (event.type === "permission-requested") {
      const session = {
        executionId: args.executionId,
        runId: args.runId,
        traceId: args.traceId,
        sender: args.sender,
        payload: args.payload,
        generator: args.generator,
        outputText,
        usage,
      } as PendingPreviewSession;
      session.completion = Promise.resolve()
        .then(() =>
          continuePreviewSession({
            ctx: args.ctx,
            session,
          }),
        )
        .catch((error) => ({
          ok: false,
          error: {
            code: "INTERNAL",
            message:
              error instanceof Error ? error.message : "AI skill confirmation failed",
          },
        }));
      args.ctx.previewSessions.set(args.executionId, session);
      return {
        ok: true,
        data: {
          executionId: args.executionId,
          runId: args.runId,
          status: "preview",
          previewId: args.executionId,
          outputText,
          candidates: buildPreviewCandidates({ runId: args.runId, outputText }),
          ...(usage
            ? {
                usage: buildSkillRunUsage(args.ctx, {
                  model: args.payload.model,
                  context: args.payload.context,
                  promptTokens: usage.promptTokens,
                  completionTokens: usage.completionTokens,
                }),
              }
            : {}),
          ...(args.payload.promptDiagnostics
            ? { promptDiagnostics: args.payload.promptDiagnostics }
            : {}),
        },
      };
    }

    if (event.type === "write-back-done") {
      versionId = typeof event.versionId === "string" ? event.versionId : undefined;
      continue;
    }

    if (event.type === "permission-denied") {
      emitOrchestratorDone({
        ctx: args.ctx,
        sender: args.sender,
        executionId: args.executionId,
        runId: args.runId,
        traceId: args.traceId,
        terminal: "cancelled",
        outputText,
        model: args.payload.model,
      });
      return {
        ok: true,
        data: {
          executionId: args.executionId,
          runId: args.runId,
          status: "rejected",
          outputText,
          ...(args.payload.promptDiagnostics
            ? { promptDiagnostics: args.payload.promptDiagnostics }
            : {}),
        },
      };
    }

    if (event.type === "error") {
      return {
        ok: false,
        error:
          (event.error as IpcError) ?? {
            code: "INTERNAL",
            message: "AI skill run failed",
          },
      };
    }
  }
}

async function continuePreviewSession(args: {
  ctx: AiIpcContext;
  session: PendingPreviewSession;
}): Promise<IpcResponse<SkillRunConfirmResponse>> {
  let versionId: string | undefined;

  while (true) {
    const next = await args.session.generator.next();
    if (next.done) {
      emitOrchestratorDone({
        ctx: args.ctx,
        sender: args.session.sender,
        executionId: args.session.executionId,
        runId: args.session.runId,
        traceId: args.session.traceId,
        terminal: "completed",
        outputText: args.session.outputText,
        model: args.session.payload.model,
        usage: args.session.usage
          ? buildSkillRunUsage(args.ctx, {
              model: args.session.payload.model,
              context: args.session.payload.context,
              promptTokens: args.session.usage.promptTokens,
              completionTokens: args.session.usage.completionTokens,
            })
          : undefined,
      });
      args.ctx.previewSessions.delete(args.session.executionId);
      return {
        ok: true,
        data: {
          executionId: args.session.executionId,
          runId: args.session.runId,
          status: "completed",
          ...(versionId ? { versionId } : {}),
          outputText: args.session.outputText,
        },
      };
    }

    const event = next.value;
    if (event.type === "write-back-done") {
      versionId = typeof event.versionId === "string" ? event.versionId : versionId;
      continue;
    }
    if (event.type === "permission-denied") {
      emitOrchestratorDone({
        ctx: args.ctx,
        sender: args.session.sender,
        executionId: args.session.executionId,
        runId: args.session.runId,
        traceId: args.session.traceId,
        terminal: "cancelled",
        outputText: args.session.outputText,
        model: args.session.payload.model,
      });
      args.ctx.previewSessions.delete(args.session.executionId);
      return {
        ok: true,
        data: {
          executionId: args.session.executionId,
          runId: args.session.runId,
          status: "rejected",
          outputText: args.session.outputText,
        },
      };
    }
    if (event.type === "error") {
      args.ctx.previewSessions.delete(args.session.executionId);
      return {
        ok: false,
        error:
          (event.error as IpcError) ?? {
            code: "INTERNAL",
            message: "AI skill confirmation failed",
          },
      };
    }
  }
}

async function finalizePreviewSession(args: {
  ctx: AiIpcContext;
  session: PendingPreviewSession;
  action: "accept" | "reject";
}): Promise<IpcResponse<SkillRunConfirmResponse>> {
  args.ctx.permissionGate.resolve(
    args.session.executionId,
    args.action === "accept",
  );
  return await args.session.completion;
}

function registerAiSkillRunHandler(ctx: AiIpcContext): void {
  ctx.deps.ipcMain.handle(
    "ai:skill:run",
    async (
      e,
      payload: SkillRunPayload,
    ): Promise<IpcResponse<SkillRunResponse>> => {
      if (payload.model.trim().length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "model is required" },
        };
      }
      if (!ctx.deps.db) {
        return {
          ok: false,
          error: createDbNotReadyError(),
        };
      }

      const candidateCountRes = parseCandidateCount(payload.candidateCount);
      if (!candidateCountRes.ok) {
        return {
          ok: false,
          error: candidateCountRes.error,
        };
      }
      if (candidateCountRes.data !== 1) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "Phase 1 only supports a single candidate",
          },
        };
      }

      const projectId = payload.context?.projectId?.trim() ?? "";
      const documentId = payload.context?.documentId?.trim() ?? "";
      if (projectId.length === 0 || documentId.length === 0) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "projectId/documentId is required",
          },
        };
      }
      if (payload.hasSelection && !payload.selection) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "selection is required for selection-based skills",
          },
        };
      }
      if (
        payload.cursorPosition !== undefined &&
        (!Number.isSafeInteger(payload.cursorPosition) || payload.cursorPosition < 0)
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "cursorPosition must be a non-negative integer",
          },
        };
      }

      const stats = createStatsService({
        db: ctx.deps.db,
        logger: ctx.deps.logger,
      });
      const inc = stats.increment({
        ts: nowTs(),
        delta: { skillsUsed: 1 },
      });
      if (!inc.ok) {
        ctx.deps.logger.error("stats_increment_skills_used_failed", {
          code: inc.error.code,
          message: inc.error.message,
        });
      }

      const executionId = randomUUID();
      const runId = randomUUID();
      const traceId = executionId;
      const cursorPosition = resolveCursorPosition(payload);
      const generator = ctx.writingOrchestrator.execute({
        requestId: executionId,
        skillId: payload.skillId,
        input: { selectedText: payload.input },
        documentId,
        projectId,
        modelId: payload.model,
        ...(payload.selection ? { selection: payload.selection } : {}),
        ...(cursorPosition === undefined ? {} : { cursorPosition }),
      });

      rememberRunInRegistry(ctx, {
        runId,
        executionId,
        context: payload.context,
      });

      try {
        return await drainPreviewUntilPause({
          ctx,
          sender: e.sender,
          executionId,
          runId,
          traceId,
          payload,
          generator,
        });
      } catch (error) {
        ctx.previewSessions.delete(executionId);
        ctx.deps.logger.error("ai_skill_run_ipc_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL", message: "AI skill run failed" },
        };
      }
    },
  );

  ctx.deps.ipcMain.handle(
    "ai:skill:confirm",
    async (
      _e,
      payload: SkillRunConfirmPayload,
    ): Promise<IpcResponse<SkillRunConfirmResponse>> => {
      const session = ctx.previewSessions.get(payload.executionId);
      if (!session) {
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "Preview session not found" },
        };
      }

      return await finalizePreviewSession({
        ctx,
        session,
        action: payload.action,
      });
    },
  );
}

function registerAiSkillLifecycleHandlers(ctx: AiIpcContext): void {
  ctx.deps.ipcMain.handle(
    "ai:skill:cancel",
    async (
      _e,
      payload: { runId?: string; executionId?: string },
    ): Promise<IpcResponse<{ canceled: true }>> => {
      const executionIdValue =
        typeof payload.executionId === "string"
          ? payload.executionId.trim()
          : "";
      const runIdValue =
        typeof payload.runId === "string" ? payload.runId.trim() : "";
      if (executionIdValue.length === 0 && runIdValue.length > 0) {
        ctx.deps.logger.info("deprecated_field", {
          channel: "ai:skill:cancel",
          field: "runId",
        });
      }
      const runEntry =
        runIdValue.length > 0 ? ctx.runRegistry.get(runIdValue) : undefined;
      const executionId =
        executionIdValue.length > 0
          ? executionIdValue
          : (runEntry?.executionId ?? "");
      if (executionId.length === 0 && runIdValue.length === 0) {
        return {
          ok: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "executionId or runId is required",
          },
        };
      }

      try {
        const previewSession = ctx.previewSessions.get(executionId);
        if (previewSession) {
          ctx.permissionGate.resolve(executionId, false);
          const completion = await previewSession.completion;
          if (!completion.ok) {
            return completion;
          }
          return { ok: true, data: { canceled: true } };
        }
        const res = ctx.aiService.cancel({
          executionId: executionId.length > 0 ? executionId : undefined,
          runId: runIdValue.length > 0 ? runIdValue : undefined,
          ts: nowTs(),
        });
        return res.ok
          ? { ok: true, data: res.data }
          : { ok: false, error: res.error };
      } catch (error) {
        ctx.deps.logger.error("ai_cancel_ipc_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: { code: "INTERNAL", message: "AI cancel failed" },
        };
      }
    },
  );

  ctx.deps.ipcMain.handle(
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

      if (!ctx.runRegistry.has(payload.runId)) {
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "runId not found" },
        };
      }

      if (!ctx.deps.db) {
        return {
          ok: false,
          error: createDbNotReadyError(),
        };
      }

      try {
        const memSvc = createMemoryService({
          db: ctx.deps.db,
          logger: ctx.deps.logger,
        });
        const settings = memSvc.getSettings();
        if (!settings.ok) {
          return { ok: false, error: settings.error };
        }

        const learning = recordSkillFeedbackAndLearn({
          db: ctx.deps.db,
          logger: ctx.deps.logger,
          settings: settings.data,
          runId: payload.runId,
          action: payload.action,
          evidenceRef: payload.evidenceRef,
        });
        if (!learning.ok) {
          return { ok: false, error: learning.error };
        }

        const res = ctx.aiService.feedback({
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
        ctx.deps.logger.error("ai_feedback_ipc_failed", {
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

function registerAiChatHandlers(ctx: AiIpcContext): void {
  ctx.deps.ipcMain.handle(
    "ai:chat:send",
    async (
      event,
      payload: ChatSendPayload,
    ): Promise<IpcResponse<ChatSendResponse>> => {
      const message = payload.message.trim();
      if (message.length === 0) {
        return {
          ok: false,
          error: { code: "INVALID_ARGUMENT", message: "message is required" },
        };
      }

      const projectId = resolveChatProjectId({
        projectId: payload.projectId,
        boundProjectId: ctx.deps.projectSessionBinding?.resolveProjectId({
          webContentsId: event.sender.id,
        }),
      });
      if (!projectId.ok) {
        return {
          ok: false,
          error: projectId.error,
        };
      }

      const db = ctx.deps.db;
      if (!db) {
        return { ok: false, error: createDbNotReadyError() };
      }

      const timestamp = nowTs();

      // Resolve or create session
      const sessionId = payload.sessionId?.trim() || null;
      let resolvedSessionId: string;

      if (sessionId) {
        const existing = db
          .prepare(
            "SELECT id FROM chat_sessions WHERE id = ? AND project_id = ?",
          )
          .get(sessionId, projectId.data) as { id: string } | undefined;
        if (!existing) {
          return {
            ok: false,
            error: {
              code: "NOT_FOUND",
              message: "session not found",
            },
          };
        }
        resolvedSessionId = sessionId;
      } else {
        resolvedSessionId = `session-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
        db.prepare(
          "INSERT INTO chat_sessions (id, project_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ).run(resolvedSessionId, projectId.data, "", timestamp, timestamp);
      }

      // Check capacity
      const msgCount = (
        db
          .prepare(
            "SELECT COUNT(*) AS cnt FROM chat_messages WHERE project_id = ?",
          )
          .get(projectId.data) as { cnt: number }
      ).cnt;
      if (msgCount >= ctx.runtimeGovernance.ai.chatMessageCapacity) {
        return {
          ok: false,
          error: {
            code: "CONFLICT",
            message: "会话消息已达上限，请先归档旧会话后继续",
          },
        };
      }

      const messageId = `chat-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
      const traceId = `trace-${messageId}`;

      db.prepare(
        "INSERT INTO chat_messages (id, session_id, project_id, role, content, skill_id, timestamp, trace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(
        messageId,
        resolvedSessionId,
        projectId.data,
        "user",
        message,
        payload.documentId ?? null,
        timestamp,
        traceId,
      );

      // Update session title from first message if empty
      db.prepare(
        "UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ? AND title = ''",
      ).run(message.slice(0, 100), timestamp, resolvedSessionId);

      // Always update session timestamp
      db.prepare("UPDATE chat_sessions SET updated_at = ? WHERE id = ?").run(
        timestamp,
        resolvedSessionId,
      );

      return {
        ok: true,
        data: {
          accepted: true,
          messageId,
          sessionId: resolvedSessionId,
          echoed: message,
        },
      };
    },
  );

  ctx.deps.ipcMain.handle(
    "ai:chat:list",
    async (
      event,
      payload: ChatListPayload,
    ): Promise<IpcResponse<ChatListResponse>> => {
      const projectId = resolveChatProjectId({
        projectId: payload.projectId,
        boundProjectId: ctx.deps.projectSessionBinding?.resolveProjectId({
          webContentsId: event.sender.id,
        }),
      });
      if (!projectId.ok) {
        return {
          ok: false,
          error: projectId.error,
        };
      }

      const db = ctx.deps.db;
      if (!db) {
        return { ok: false, error: createDbNotReadyError() };
      }

      const sessionId = payload.sessionId?.trim() || null;

      const rows = sessionId
        ? (db
            .prepare(
              "SELECT id AS messageId, project_id AS projectId, role, content, skill_id AS skillId, timestamp, trace_id AS traceId FROM chat_messages WHERE project_id = ? AND session_id = ? ORDER BY timestamp ASC",
            )
            .all(projectId.data, sessionId) as ChatHistoryMessage[])
        : (db
            .prepare(
              "SELECT id AS messageId, project_id AS projectId, role, content, skill_id AS skillId, timestamp, trace_id AS traceId FROM chat_messages WHERE project_id = ? ORDER BY timestamp ASC",
            )
            .all(projectId.data) as ChatHistoryMessage[]);

      return {
        ok: true,
        data: { items: rows },
      };
    },
  );

  ctx.deps.ipcMain.handle(
    "ai:chat:clear",
    async (
      event,
      payload: ChatClearPayload,
    ): Promise<IpcResponse<ChatClearResponse>> => {
      const projectId = resolveChatProjectId({
        projectId: payload.projectId,
        boundProjectId: ctx.deps.projectSessionBinding?.resolveProjectId({
          webContentsId: event.sender.id,
        }),
      });
      if (!projectId.ok) {
        return {
          ok: false,
          error: projectId.error,
        };
      }

      const db = ctx.deps.db;
      if (!db) {
        return { ok: false, error: createDbNotReadyError() };
      }

      const sessionId = payload.sessionId?.trim() || null;
      let removed: number;

      if (sessionId) {
        removed = db
          .prepare(
            "DELETE FROM chat_messages WHERE project_id = ? AND session_id = ?",
          )
          .run(projectId.data, sessionId).changes;
        db.prepare(
          "DELETE FROM chat_sessions WHERE id = ? AND project_id = ?",
        ).run(sessionId, projectId.data);
      } else {
        removed = db
          .prepare("DELETE FROM chat_messages WHERE project_id = ?")
          .run(projectId.data).changes;
        db.prepare("DELETE FROM chat_sessions WHERE project_id = ?").run(
          projectId.data,
        );
      }

      return {
        ok: true,
        data: {
          cleared: true,
          removed,
        },
      };
    },
  );

  ctx.deps.ipcMain.handle(
    "ai:chat:sessions",
    async (
      event,
      payload: ChatSessionsPayload,
    ): Promise<IpcResponse<ChatSessionsResponse>> => {
      validateChatPayload(payload);
      const projectId = resolveChatProjectId({
        projectId: payload.projectId,
        boundProjectId: ctx.deps.projectSessionBinding?.resolveProjectId({
          webContentsId: event.sender.id,
        }),
      });
      if (!projectId.ok) {
        return {
          ok: false,
          error: projectId.error,
        };
      }

      const db = ctx.deps.db;
      if (!db) {
        return { ok: false, error: createDbNotReadyError() };
      }

      const query = payload.query?.trim() || null;
      const sessions = query
        ? (db
            .prepare(
              "SELECT s.id AS sessionId, s.project_id AS projectId, s.title, s.created_at AS createdAt, s.updated_at AS updatedAt FROM chat_sessions s WHERE s.project_id = ? AND (s.title LIKE ? OR EXISTS (SELECT 1 FROM chat_messages m WHERE m.session_id = s.id AND m.content LIKE ?)) ORDER BY s.updated_at DESC",
            )
            .all(projectId.data, `%${query}%`, `%${query}%`) as ChatSession[])
        : (db
            .prepare(
              "SELECT id AS sessionId, project_id AS projectId, title, created_at AS createdAt, updated_at AS updatedAt FROM chat_sessions WHERE project_id = ? ORDER BY updated_at DESC",
            )
            .all(projectId.data) as ChatSession[]);

      return {
        ok: true,
        data: { sessions },
      };
    },
  );

  ctx.deps.ipcMain.handle(
    "ai:chatsession:delete",
    async (
      event,
      payload: ChatSessionDeletePayload,
    ): Promise<IpcResponse<ChatSessionDeleteResponse>> => {
      validateChatPayload(payload);
      const projectId = resolveChatProjectId({
        projectId: payload.projectId,
        boundProjectId: ctx.deps.projectSessionBinding?.resolveProjectId({
          webContentsId: event.sender.id,
        }),
      });
      if (!projectId.ok) {
        return {
          ok: false,
          error: projectId.error,
        };
      }

      const db = ctx.deps.db;
      if (!db) {
        return { ok: false, error: createDbNotReadyError() };
      }

      // CASCADE delete handles messages
      db.prepare(
        "DELETE FROM chat_sessions WHERE id = ? AND project_id = ?",
      ).run(payload.sessionId, projectId.data);

      return {
        ok: true,
        data: { deleted: true },
      };
    },
  );
}
