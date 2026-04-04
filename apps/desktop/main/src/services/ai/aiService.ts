import { randomUUID } from "node:crypto";

import type { IpcError, IpcErrorCode } from "@shared/types/ipc-generated";
import type { AiStreamEvent, AiStreamTerminal } from "@shared/types/ai";
import type { Logger } from "../../logging/logger";
import type { ToolCallInfo } from "./streaming";
import { resolveRuntimeGovernanceFromEnv } from "../../config/runtimeGovernance";
import {
  createSkillScheduler,
  type SkillSchedulerTerminal,
} from "../skills/skillScheduler";
import { startFakeAiServer, type FakeAiServer } from "./fakeAiServer";
import { buildLLMMessages, type LLMMessage } from "./buildLLMMessages";
import {
  createChatMessageManager,
  type ChatMessageManager,
} from "./chatMessageManager";
import {
  buildUpstreamHttpError,
  mapUpstreamStatusToIpcErrorCode,
} from "./errorMapper";
import {
  combineSystemText,
  DEFAULT_REQUEST_MAX_TOKENS_ESTIMATE,
  estimateTokenCount,
  modeSystemHint,
  parseChatHistoryTokenBudget,
  parseMaxSkillOutputChars,
  resolveSkillTimeoutMs,
} from "./runtimeConfig";
import { assembleSystemPrompt } from "./assembleSystemPrompt";
import { GLOBAL_IDENTITY_PROMPT } from "./identityPrompt";
import {
  createProviderResolver,
  type ProviderConfig,
  type ProxySettings,
} from "./providerResolver";
import {
  extractAnthropicDelta,
  extractAnthropicText,
  extractOpenAiDelta,
  extractOpenAiModels,
  extractOpenAiText,
  providerDisplayName,
} from "./aiPayloadParsers";
import { validateProviderPreflight } from "./providerPreflight";
import type { TraceStore } from "./traceStore";
import { createAiWriteTransaction } from "./aiWriteTransaction";
import { logWarn } from "../shared/degradationCounter";
import { ipcError, type ServiceResult, type Err } from "../shared/ipcResult";
export type { ServiceResult };

export { assembleSystemPrompt, GLOBAL_IDENTITY_PROMPT };
export { mapUpstreamStatusToIpcErrorCode };
export type { AiProvider } from "./aiPayloadParsers";

export type TracePersistenceDegradation = {
  code: "TRACE_PERSISTENCE_DEGRADED";
  message: string;
  runId: string;
  traceId: string;
  cause: { code: IpcErrorCode; message: string };
};

export type AiService = {
  runSkill: (args: {
    skillId: string;
    systemPrompt?: string;
    input: string;
    timeoutMs?: number;
    mode: "agent" | "plan" | "ask";
    model: string;
    system?: string;
    context?: { projectId?: string; documentId?: string };
    messages?: Array<{
      role: "system" | "user" | "assistant" | "tool";
      content: string;
      toolCallId?: string;
      toolCalls?: ToolCallInfo[];
    }>;
    stream: boolean;
    ts: number;
    emitEvent: (event: AiStreamEvent) => void;
    /** P2: when provided, bypass internal message building and use these messages directly */
    overrideMessages?: Array<{ role: string; content: string; toolCallId?: string; toolCalls?: Array<{ id: string; name: string; arguments: unknown }> }>;
  }) => Promise<
    ServiceResult<{
      executionId: string;
      runId: string;
      traceId: string;
      outputText?: string;
      finishReason?: "stop" | "tool_use" | null;
      toolCalls?: ToolCallInfo[];
      degradation?: TracePersistenceDegradation;
    }>
  >;
  listModels: () => Promise<
    ServiceResult<{
      source: "proxy" | "openai" | "anthropic";
      items: Array<{ id: string; name: string; provider: string }>;
    }>
  >;
  cancel: (args: {
    executionId?: string;
    runId?: string;
    ts: number;
  }) => ServiceResult<{ canceled: true }>;
  feedback: (args: {
    runId: string;
    action: "accept" | "reject" | "partial";
    evidenceRef: string;
    ts: number;
  }) => ServiceResult<{ recorded: true }>;
};

type JsonObject = Record<string, unknown>;

type RunEntry = {
  executionId: string;
  runId: string;
  traceId: string;
  controller: AbortController;
  timeoutTimer: NodeJS.Timeout | null;
  completionTimer: NodeJS.Timeout | null;
  chunkFlushTimer: NodeJS.Timeout | null;
  stream: boolean;
  startedAt: number;
  terminal: AiStreamTerminal | null;
  doneEmitted: boolean;
  schedulerTerminalResolved: boolean;
  resolveSchedulerTerminal: (terminal: SkillSchedulerTerminal) => void;
  seq: number;
  outputText: string;
  pendingChunkBuffer: string;
  pendingChunkCount: number;
  finishReason: "stop" | "tool_use" | null;
  toolCalls: ToolCallInfo[];
  promptTokens: number;
  completionTokens: number;
  model: string;
  emitEvent: (event: AiStreamEvent) => void;
};

const PROVIDER_HALF_OPEN_AFTER_MS = 15 * 60 * 1000;
const STREAM_CHUNK_BATCH_WINDOW_MS = 20;
const STREAM_CHUNK_MAX_BATCH_COUNT = 4;
const STREAM_COMPLETION_SETTLE_MS = 20;
const SSE_PARSE_RAW_MAX_LEN = 200;

/** OpenAI tool-result message shape (role="tool" requires tool_call_id). */
type OpenAiToolMessage = { role: "tool"; content: string; tool_call_id: string };

/** OpenAI assistant message that may include tool_calls. */
type OpenAiAssistantToolCallMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};

/** Anthropic tool-result content block (wrapped in a user message). */
type AnthropicToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
};

/** Anthropic assistant content block — text or tool_use. */
type AnthropicAssistantContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };

type RuntimeMessages = {
  systemText: string;
  /** May include tool-result messages for agentic-loop rounds. */
  openAiMessages: Array<LLMMessage | OpenAiToolMessage | OpenAiAssistantToolCallMessage>;
  /** Anthropic messages; tool results are represented as user messages with
   * content blocks instead of plain strings. */
  anthropicMessages: Array<{
    role: "user" | "assistant";
    content: string | AnthropicToolResultBlock[] | AnthropicAssistantContentBlock[];
  }>;
  tools: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;
};

function estimateRuntimePromptTokens(args: {
  provider: ProviderConfig["provider"];
  runtimeMessages: RuntimeMessages;
}): number {
  const parts =
    args.provider === "anthropic"
      ? [
          args.runtimeMessages.systemText,
          JSON.stringify(args.runtimeMessages.tools),
          JSON.stringify(args.runtimeMessages.anthropicMessages),
        ]
      : [
          args.runtimeMessages.systemText,
          JSON.stringify(args.runtimeMessages.tools),
          JSON.stringify(args.runtimeMessages.openAiMessages),
        ];
  return estimateTokenCount(parts.filter((part) => part.length > 0).join("\n"));
}

/**
 * Narrow an unknown value to a JSON object.
 */
function asObject(x: unknown): JsonObject | null {
  if (typeof x !== "object" || x === null) {
    return null;
  }
  return x as JsonObject;
}

/**
 * Join a provider base URL with an endpoint path while preserving base path prefixes.
 */
function buildApiUrl(args: { baseUrl: string; endpointPath: string }): string {
  const base = new URL(args.baseUrl.trim());
  const endpoint = args.endpointPath.startsWith("/")
    ? args.endpointPath
    : `/${args.endpointPath}`;

  if (!base.pathname.endsWith("/")) {
    base.pathname = `${base.pathname}/`;
  }

  const basePathNoSlash = base.pathname.endsWith("/")
    ? base.pathname.slice(0, -1)
    : base.pathname;
  const normalizedEndpoint =
    basePathNoSlash.endsWith("/v1") && endpoint.startsWith("/v1/")
      ? endpoint.slice(3)
      : endpoint;

  return new URL(normalizedEndpoint.slice(1), base.toString()).toString();
}

/**
 * Parse upstream JSON safely and return deterministic errors for non-JSON bodies.
 */
async function parseJsonResponse(
  res: Response,
): Promise<ServiceResult<unknown>> {
  const bodyText = await res.text();
  try {
    return { ok: true, data: JSON.parse(bodyText) as unknown };
  } catch {
    return ipcError("LLM_API_ERROR", "Non-JSON upstream response");
  }
}

function extractOpenAiFinishReason(
  json: unknown,
): "stop" | "tool_use" | null {
  const obj = asObject(json);
  const choices = obj?.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }
  const first = asObject(choices[0]);
  const finishReason = first?.finish_reason;
  if (finishReason === "stop") {
    return "stop";
  }
  if (
    finishReason === "tool_use" ||
    finishReason === "tool_calls" ||
    finishReason === "function_call"
  ) {
    return "tool_use";
  }
  return null;
}

function collectOpenAiToolCallChunks(json: unknown): Array<{
  index: number;
  id?: string;
  name?: string;
  argumentsChunk?: string;
}> {
  const obj = asObject(json);
  const choices = obj?.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return [];
  }
  const first = asObject(choices[0]);
  const delta = asObject(first?.delta);
  const toolCalls = delta?.tool_calls;
  if (!Array.isArray(toolCalls)) {
    return [];
  }

  return toolCalls
    .map((raw) => {
      const row = asObject(raw);
      const fn = asObject(row?.function);
      const index = row?.index;
      if (typeof index !== "number") {
        return null;
      }
      return {
        index,
        ...(typeof row?.id === "string" ? { id: row.id } : {}),
        ...(typeof fn?.name === "string" ? { name: fn.name } : {}),
        ...(typeof fn?.arguments === "string"
          ? { argumentsChunk: fn.arguments }
          : {}),
      };
    })
    .filter((item): item is {
      index: number;
      id?: string;
      name?: string;
      argumentsChunk?: string;
    } => item !== null);
}

/**
 * Read SSE messages from a fetch response body.
 *
 * Why: both OpenAI and Anthropic streaming are delivered as SSE.
 */
async function* readSse(args: {
  body: ReadableStream<Uint8Array>;
}): AsyncGenerator<{ event: string | null; data: string }> {
  const decoder = new TextDecoder();
  const reader = args.body.getReader();

  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const lfSeparator = buffer.indexOf("\n\n");
      const crlfSeparator = buffer.indexOf("\r\n\r\n");
      const hasLfSeparator = lfSeparator >= 0;
      const hasCrlfSeparator = crlfSeparator >= 0;
      if (!hasLfSeparator && !hasCrlfSeparator) {
        break;
      }

      const useLfSeparator =
        hasLfSeparator && (!hasCrlfSeparator || lfSeparator < crlfSeparator);
      const sepIndex = useLfSeparator ? lfSeparator : crlfSeparator;
      const sepLength = useLfSeparator ? 2 : 4;

      const rawEvent = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + sepLength);

      const lines = rawEvent.split(/\r?\n/);
      let event: string | null = null;
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice("event:".length).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          dataLines.push(line.slice("data:".length).trimStart());
        }
      }

      if (dataLines.length === 0) {
        continue;
      }

      yield { event, data: dataLines.join("\n") };
    }
  }
}

/**
 * Create the main-process AI service.
 *
 * Why: keep secrets + network + error mapping in the main process for stable IPC.
 */

type AiServiceDeps = {
  logger: Logger;
  env: NodeJS.ProcessEnv;
  getProxySettings?: () => ProxySettings | null;
  traceStore?: TraceStore;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  rateLimitPerMinute?: number;
  retryBackoffMs?: readonly number[];
  sessionTokenBudget?: number;
};

type AiInternalState = {
  runs: Map<string, RunEntry>;
  requestTimestamps: number[];
  now: () => number;
  runtimeGovernance: ReturnType<typeof resolveRuntimeGovernanceFromEnv>;
  sleep: (ms: number) => Promise<void>;
  rateLimitPerMinute: number;
  retryBackoffMs: readonly number[];
  sessionTokenBudget: number;
  maxSkillOutputChars: number;
  chatHistoryTokenBudget: number;
  sessionTokenTotalsByKey: Map<string, number>;
  sessionChatMessagesByKey: Map<string, ChatMessageManager>;
  skillScheduler: ReturnType<typeof createSkillScheduler>;
  providerResolver: ReturnType<typeof createProviderResolver>;
  getFakeServer: () => Promise<FakeAiServer>;
};

type AiHelpers = ReturnType<typeof createAiSessionHelpers> &
  ReturnType<typeof createAiEmitHelpers> &
  ReturnType<typeof createAiNonStreamHelpers> &
  ReturnType<typeof createAiStreamHelpers>;

function createAiSessionHelpers(state: AiInternalState) {
  const {
    requestTimestamps,
    now,
    rateLimitPerMinute,
    chatHistoryTokenBudget,
    sessionChatMessagesByKey,
  } = state;

  /**
   * Build a stable session key used for queueing and token-budget accounting.
   */
  function resolveSessionKey(context?: {
    projectId?: string;
    documentId?: string;
  }): string {
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

  function getChatMessageManager(sessionKey: string): ChatMessageManager {
    const existing = sessionChatMessagesByKey.get(sessionKey);
    if (existing) {
      return existing;
    }
    const created = createChatMessageManager();
    sessionChatMessagesByKey.set(sessionKey, created);
    return created;
  }

  function toLeafSkillId(skillId: string): string {
    const parts = skillId.split(":");
    return parts[parts.length - 1] ?? skillId;
  }

  function resolveRuntimeTools(skillId: string): RuntimeMessages["tools"] {
    if (toLeafSkillId(skillId) !== "continue") {
      return [];
    }
    return [
      {
        name: "kgTool",
        description:
          "Query the knowledge graph for characters, locations, and world settings",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            entityType: {
              type: "string",
              enum: ["character", "location", "worldSetting"],
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
      },
      {
        name: "memTool",
        description:
          "Query writing memory for preferences, style patterns, and rules",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            memoryType: {
              type: "string",
              enum: ["preference", "style", "rule"],
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
      },
      {
        name: "docTool",
        description: "Read a relevant snippet from another document or chapter",
        inputSchema: {
          type: "object",
          properties: {
            documentId: { type: "string" },
            query: { type: "string" },
            maxTokens: { type: "number" },
            snippetChars: { type: "number" },
          },
          required: ["query"],
          additionalProperties: false,
        },
      },
      {
        name: "documentRead",
        description: "Read a bounded snippet from the current document",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            maxTokens: { type: "number" },
            snippetChars: { type: "number" },
          },
          additionalProperties: false,
        },
      },
    ];
  }

  function buildRuntimeMessages(args: {
    skillId: string;
    systemPrompt?: string;
    mode: "agent" | "plan" | "ask";
    system?: string;
    input: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
    explicitMessages?: Array<{
      role: "system" | "user" | "assistant" | "tool";
      content: string;
      toolCallId?: string;
      toolCalls?: ToolCallInfo[];
    }>;
  }): RuntimeMessages {
    const tools = resolveRuntimeTools(args.skillId);
    if (args.explicitMessages && args.explicitMessages.length > 0) {
      const systemText = args.explicitMessages
        .filter((message) => message.role === "system")
        .map((message) => message.content)
        .join("\n\n");
      const openAiMessages = args.explicitMessages.map((message) => ({
        role: message.role,
        content: message.content,
        ...(message.role === "tool" && message.toolCallId
          ? { tool_call_id: message.toolCallId }
          : {}),
        ...(message.role === "assistant" && message.toolCalls
          ? {
              tool_calls: message.toolCalls.map((toolCall) => ({
                id: toolCall.id,
                type: "function" as const,
                function: {
                  name: toolCall.name,
                  arguments: JSON.stringify(toolCall.arguments ?? {}),
                },
              })),
            }
          : {}),
      }));
      const anthropicMessages: RuntimeMessages["anthropicMessages"] = [];
      for (const message of args.explicitMessages) {
        if (message.role === "system") {
          continue;
        }
        if (message.role === "assistant") {
          const contentBlocks: Array<
            | { type: "text"; text: string }
            | {
                type: "tool_use";
                id: string;
                name: string;
                input: Record<string, unknown>;
              }
          > = [];
          if (message.content.length > 0) {
            contentBlocks.push({ type: "text", text: message.content });
          }
          for (const toolCall of message.toolCalls ?? []) {
            if (
              toolCall.arguments &&
              typeof toolCall.arguments === "object" &&
              !Array.isArray(toolCall.arguments)
            ) {
              contentBlocks.push({
                type: "tool_use",
                id: toolCall.id,
                name: toolCall.name,
                input: toolCall.arguments as Record<string, unknown>,
              });
            }
          }
          anthropicMessages.push({
            role: "assistant",
            content:
              contentBlocks.length === 0 ? message.content : contentBlocks,
          });
          continue;
        }
        if (message.role === "tool") {
          anthropicMessages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: message.toolCallId ?? "unknown",
                content: message.content,
              },
            ],
          });
          continue;
        }
        anthropicMessages.push({
          role: "user",
          content: message.content,
        });
      }
      return {
        systemText,
        tools,
        openAiMessages,
        anthropicMessages,
      };
    }

    const systemText = combineSystemText({
      systemPrompt: args.systemPrompt,
      modeHint: modeSystemHint(args.mode) ?? undefined,
      system: args.system,
    });
    const openAiMessages = buildLLMMessages({
      systemPrompt: systemText,
      history: args.history,
      currentUserMessage: args.input,
      maxTokenBudget: chatHistoryTokenBudget,
    }).map((message) => ({
      role: message.role,
      content: message.content,
    }));
    const anthropicMessages: RuntimeMessages["anthropicMessages"] = [];
    for (const message of openAiMessages) {
      if (message.role !== "user" && message.role !== "assistant") {
        continue;
      }
      anthropicMessages.push({
        role: message.role,
        content: message.content,
      });
    }
    return {
      systemText,
      tools,
      openAiMessages,
      anthropicMessages,
    };
  }

  function isProviderAvailabilityError(error: IpcError): boolean {
    return (
      error.code === "LLM_API_ERROR" ||
      error.code === "TIMEOUT" ||
      error.code === "SKILL_TIMEOUT"
    );
  }

  function buildProviderUnavailableError(args: {
    traceId: string;
    primary: ProviderConfig;
    backup: ProviderConfig | null;
  }): Err {
    return ipcError("AI_PROVIDER_UNAVAILABLE", "All AI providers unavailable", {
      traceId: args.traceId,
      primary: args.primary.provider,
      backup: args.backup?.provider ?? null,
    });
  }

  /**
   * Consume one request budget token from the fixed 60s window limiter.
   *
   * Why: P0 baseline requires deterministic quota protection before upstream calls.
   */
  function consumeRateLimitToken(): Err | null {
    const windowStart = now() - 60_000;
    while (
      requestTimestamps.length > 0 &&
      requestTimestamps[0] <= windowStart
    ) {
      requestTimestamps.shift();
    }

    if (requestTimestamps.length >= rateLimitPerMinute) {
      return ipcError("AI_RATE_LIMITED", "AI request rate limited");
    }

    requestTimestamps.push(now());
    return null;
  }

    return {
      resolveSessionKey,
      getChatMessageManager,
      buildRuntimeMessages,
      estimateRuntimePromptTokens,
      resolveRuntimeTools,
      isProviderAvailabilityError,
      buildProviderUnavailableError,
      consumeRateLimitToken,
  };
}

function createAiEmitHelpers(deps: AiServiceDeps, state: AiInternalState) {
  const { runs, maxSkillOutputChars } = state;

  /**
   * Emit an AI stream event only while the run is still active.
   *
   * Why: cancel/timeout MUST stop further deltas to keep the UI stable.
   */
  function emitIfActive(entry: RunEntry, event: AiStreamEvent): void {
    if (entry.terminal !== null && event.type === "chunk") {
      return;
    }
    entry.emitEvent(event);
  }

  /**
   * Clear pending chunk flush timer if armed.
   */
  function clearChunkFlushTimer(entry: RunEntry): void {
    if (entry.chunkFlushTimer) {
      clearTimeout(entry.chunkFlushTimer);
      entry.chunkFlushTimer = null;
    }
  }

  /**
   * Drop buffered chunk payload without emitting.
   */
  function clearChunkBuffer(entry: RunEntry): void {
    clearChunkFlushTimer(entry);
    entry.pendingChunkBuffer = "";
    entry.pendingChunkCount = 0;
  }

  /**
   * Flush buffered chunks as a single stream event.
   *
   * Why: high-frequency upstream deltas must be coalesced by batch size/window.
   */
  function flushChunkBuffer(entry: RunEntry): void {
    if (entry.pendingChunkBuffer.length === 0) {
      clearChunkBuffer(entry);
      return;
    }

    if (entry.terminal !== null) {
      clearChunkBuffer(entry);
      return;
    }

    const chunk = entry.pendingChunkBuffer;
    clearChunkBuffer(entry);

    const nextOutputLength = entry.outputText.length + chunk.length;
    if (nextOutputLength > maxSkillOutputChars) {
      entry.controller.abort();
      const oversizedError = buildSkillOutputTooLargeError(nextOutputLength);
      setTerminal({
        entry,
        terminal: "error",
        error: oversizedError,
        logEvent: "ai_run_failed",
        errorCode: oversizedError.code,
      });
      return;
    }

    entry.seq += 1;
    entry.outputText = `${entry.outputText}${chunk}`;

    emitIfActive(entry, {
      type: "chunk",
      executionId: entry.executionId,
      runId: entry.runId,
      traceId: entry.traceId,
      seq: entry.seq,
      chunk,
      ts: Date.now(),
    });
  }

  /**
   * Buffer stream chunk and flush by threshold/window.
   */
  function emitChunk(entry: RunEntry, chunk: string): void {
    if (entry.terminal !== null || chunk.length === 0) {
      return;
    }

    const bufferedLength = entry.pendingChunkBuffer.length;
    const nextOutputLength =
      entry.outputText.length + bufferedLength + chunk.length;
    if (nextOutputLength > maxSkillOutputChars) {
      entry.controller.abort();
      const oversizedError = buildSkillOutputTooLargeError(nextOutputLength);
      setTerminal({
        entry,
        terminal: "error",
        error: oversizedError,
        logEvent: "ai_run_failed",
        errorCode: oversizedError.code,
      });
      return;
    }

    entry.pendingChunkBuffer = `${entry.pendingChunkBuffer}${chunk}`;
    entry.pendingChunkCount += 1;

    if (entry.pendingChunkCount >= STREAM_CHUNK_MAX_BATCH_COUNT) {
      flushChunkBuffer(entry);
      return;
    }

    if (entry.chunkFlushTimer === null) {
      entry.chunkFlushTimer = setTimeout(() => {
        entry.chunkFlushTimer = null;
        flushChunkBuffer(entry);
      }, STREAM_CHUNK_BATCH_WINDOW_MS);
    }
  }

  /**
   * Emit the done terminal event once.
   */
  function emitDone(args: {
    entry: RunEntry;
    terminal: AiStreamTerminal;
    error?: IpcError;
    ts?: number;
  }): void {
    const entry = args.entry;
    if (entry.doneEmitted) {
      return;
    }
    entry.doneEmitted = true;

    emitIfActive(entry, {
      type: "done",
      executionId: entry.executionId,
      runId: entry.runId,
      traceId: entry.traceId,
      terminal: args.terminal,
      outputText: entry.outputText,
      ...(args.error ? { error: args.error } : {}),
      result: {
        success: args.terminal === "completed",
        output: entry.outputText,
        metadata: {
          model: entry.model,
          promptTokens: entry.promptTokens,
          completionTokens: entry.completionTokens,
        },
        traceId: entry.traceId,
        ...(args.error ? { error: args.error } : {}),
      },
      ...(entry.finishReason !== undefined ? { finishReason: entry.finishReason ?? undefined } : {}),
      ...(entry.toolCalls !== undefined ? { toolCalls: entry.toolCalls as Array<{ id: string; name: string; arguments: Record<string, unknown> }> } : {}),
      ts: args.ts ?? Date.now(),
    });
  }

  function resolveSchedulerTerminal(
    entry: RunEntry,
    terminal: SkillSchedulerTerminal,
  ): void {
    if (entry.schedulerTerminalResolved) {
      return;
    }
    entry.schedulerTerminalResolved = true;
    entry.resolveSchedulerTerminal(terminal);
  }

  /**
   * Mark a run terminal and collapse lifecycle with a single done event.
   */
  function setTerminal(args: {
    entry: RunEntry;
    terminal: AiStreamTerminal;
    logEvent:
      | "ai_run_completed"
      | "ai_run_failed"
      | "ai_run_canceled"
      | "ai_run_timeout";
    errorCode?: IpcErrorCode;
    error?: IpcError;
    ts?: number;
  }): void {
    const entry = args.entry;
    if (entry.terminal === "cancelled" && args.terminal !== "cancelled") {
      return;
    }
    if (entry.terminal !== null && args.terminal !== "cancelled") {
      return;
    }

    if (args.terminal !== "completed") {
      clearChunkBuffer(entry);
    } else {
      clearChunkFlushTimer(entry);
      flushChunkBuffer(entry);
      if (entry.terminal !== null) {
        return;
      }
    }

    entry.terminal = args.terminal;
    emitDone({
      entry,
      terminal: args.terminal,
      error: args.error,
      ts: args.ts,
    });
    deps.logger.info(args.logEvent, {
      runId: entry.runId,
      executionId: entry.executionId,
      code: args.errorCode,
    });
    resolveSchedulerTerminal(
      entry,
      args.terminal === "completed"
        ? "completed"
        : args.terminal === "cancelled"
          ? "cancelled"
          : args.errorCode === "SKILL_TIMEOUT" ||
              args.error?.code === "SKILL_TIMEOUT"
            ? "timeout"
            : "failed",
    );
    cleanupRun(entry.runId);
  }

  /**
   * Cleanup run resources.
   */
  function cleanupRun(runId: string): void {
    const entry = runs.get(runId);
    if (!entry) {
      return;
    }
    if (entry.timeoutTimer) {
      clearTimeout(entry.timeoutTimer);
    }
    if (entry.completionTimer) {
      clearTimeout(entry.completionTimer);
    }
    clearChunkBuffer(entry);
    runs.delete(runId);
  }

  function normalizeSkillError(error: IpcError): IpcError {
    if (error.code !== "TIMEOUT") {
      return error;
    }
    return {
      ...error,
      code: "SKILL_TIMEOUT",
      message: "Skill execution timed out",
    };
  }

  function buildSkillOutputTooLargeError(actualChars: number): IpcError {
    return {
      code: "IPC_PAYLOAD_TOO_LARGE",
      message: "Skill output too large",
      details: {
        maxChars: maxSkillOutputChars,
        actualChars,
      },
    };
  }

  /**
   * Reset stream sequence/output before replaying the full prompt.
   */
  function resetForFullPromptReplay(entry: RunEntry): void {
    entry.seq = 0;
    entry.outputText = "";
    entry.finishReason = null;
    entry.toolCalls = [];
    clearChunkBuffer(entry);
  }

  /**
   * Identify replayable stream disconnect errors.
   */
  function isReplayableStreamDisconnect(error: IpcError): boolean {
    const details = asObject(error.details);
    return (
      error.code === "LLM_API_ERROR" &&
      details?.reason === "STREAM_DISCONNECTED"
    );
  }

  return {
    emitIfActive,
    clearChunkFlushTimer,
    clearChunkBuffer,
    flushChunkBuffer,
    emitChunk,
    emitDone,
    resolveSchedulerTerminal,
    setTerminal,
    cleanupRun,
    normalizeSkillError,
    buildSkillOutputTooLargeError,
    resetForFullPromptReplay,
    isReplayableStreamDisconnect,
  };
}

function createAiNonStreamHelpers(
  deps: AiServiceDeps,
  state: AiInternalState,
  sessionHelpers: ReturnType<typeof createAiSessionHelpers>,
) {
  const { now, sleep, retryBackoffMs, providerResolver } = state;
  const {
    buildProviderUnavailableError,
    consumeRateLimitToken,
    isProviderAvailabilityError,
  } = sessionHelpers;

  /**
   * Fetch with P0 network retry and rate-limit baseline.
   *
   * Why: transient transport errors should retry with bounded backoff.
   */
  async function fetchWithPolicy(args: {
    url: string;
    init: RequestInit;
  }): Promise<ServiceResult<Response>> {
    const rateLimited = consumeRateLimitToken();
    if (rateLimited) {
      return rateLimited;
    }

    for (let attempt = 0; ; attempt += 1) {
      try {
        const res = await fetch(args.url, args.init);
        return { ok: true, data: res };
      } catch (error) {
        const signal = args.init.signal as AbortSignal | undefined;
        if (signal?.aborted) {
          return ipcError("TIMEOUT", "AI request timed out");
        }

        if (attempt >= retryBackoffMs.length) {
          return ipcError(
            "LLM_API_ERROR",
            error instanceof Error ? error.message : "AI request failed",
          );
        }

        await sleep(retryBackoffMs[attempt]);
      }
    }
  }

  /**
   * Execute a non-stream OpenAI-compatible request.
   */
  async function runOpenAiNonStream(args: {
    entry: RunEntry;
    cfg: ProviderConfig;
    runtimeMessages: RuntimeMessages;
    model: string;
  }): Promise<ServiceResult<string>> {
    const url = buildApiUrl({
      baseUrl: args.cfg.baseUrl,
      endpointPath: "/v1/chat/completions",
    });

    const fetchRes = await fetchWithPolicy({
      url,
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(args.cfg.apiKey
            ? { Authorization: `Bearer ${args.cfg.apiKey}` }
            : {}),
        },
        body: JSON.stringify({
          model: args.model,
          messages: args.runtimeMessages.openAiMessages,
          ...(args.runtimeMessages.tools.length > 0
            ? {
                tools: args.runtimeMessages.tools.map((tool) => ({
                  type: "function",
                  function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.inputSchema,
                  },
                })),
              }
            : {}),
          stream: false,
        }),
        signal: args.entry.controller.signal,
      },
    });
    if (!fetchRes.ok) {
      return fetchRes;
    }
    const res = fetchRes.data;

    if (!res.ok) {
      const mapped = await buildUpstreamHttpError({
        res,
        fallbackMessage: "AI upstream request failed",
      });
      return {
        ok: false,
        error: mapped,
      };
    }

    const jsonRes = await parseJsonResponse(res);
    if (!jsonRes.ok) {
      return jsonRes;
    }
    const json = jsonRes.data;
    const text = extractOpenAiText(json);
    if (typeof text !== "string") {
      return ipcError("INTERNAL", "Invalid OpenAI response shape");
    }
    return { ok: true, data: text };
  }

  /**
   * Execute a non-stream Anthropic request.
   */
  async function runAnthropicNonStream(args: {
    entry: RunEntry;
    cfg: ProviderConfig;
    runtimeMessages: RuntimeMessages;
    model: string;
  }): Promise<ServiceResult<string>> {
    const url = buildApiUrl({
      baseUrl: args.cfg.baseUrl,
      endpointPath: "/v1/messages",
    });

    const fetchRes = await fetchWithPolicy({
      url,
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          ...(args.cfg.apiKey ? { "x-api-key": args.cfg.apiKey } : {}),
        },
        body: JSON.stringify({
          model: args.model,
          max_tokens: DEFAULT_REQUEST_MAX_TOKENS_ESTIMATE,
          system: args.runtimeMessages.systemText,
          messages: args.runtimeMessages.anthropicMessages,
          ...(args.runtimeMessages.tools.length > 0
            ? {
                tools: args.runtimeMessages.tools.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  input_schema: tool.inputSchema,
                })),
              }
            : {}),
          stream: false,
        }),
        signal: args.entry.controller.signal,
      },
    });
    if (!fetchRes.ok) {
      return fetchRes;
    }
    const res = fetchRes.data;

    if (!res.ok) {
      const mapped = await buildUpstreamHttpError({
        res,
        fallbackMessage: "AI upstream request failed",
      });
      return {
        ok: false,
        error: mapped,
      };
    }

    const jsonRes = await parseJsonResponse(res);
    if (!jsonRes.ok) {
      return jsonRes;
    }
    const json = jsonRes.data;
    const text = extractAnthropicText(json);
    if (typeof text !== "string") {
      return ipcError("INTERNAL", "Invalid Anthropic response shape");
    }
    return { ok: true, data: text };
  }

  async function runNonStreamWithProvider(args: {
    entry: RunEntry;
    cfg: ProviderConfig;
    runtimeMessages: RuntimeMessages;
    model: string;
  }): Promise<ServiceResult<string>> {
    if (args.cfg.provider === "anthropic") {
      return await runAnthropicNonStream(args);
    }
    return await runOpenAiNonStream(args);
  }

  async function runNonStreamWithFailover(args: {
    entry: RunEntry;
    primary: ProviderConfig;
    backup: ProviderConfig | null;
    runtimeMessages: RuntimeMessages;
    model: string;
  }): Promise<ServiceResult<string>> {
    const primaryState = providerResolver.getProviderHealthState(args.primary);
    const canHalfOpenProbe =
      primaryState.status === "degraded" &&
      primaryState.degradedAtMs !== null &&
      now() - primaryState.degradedAtMs >= PROVIDER_HALF_OPEN_AFTER_MS;

    if (
      primaryState.status === "degraded" &&
      !canHalfOpenProbe &&
      args.backup !== null
    ) {
      deps.logger.info("ai_provider_failover", {
        traceId: args.entry.traceId,
        from: args.primary.provider,
        to: args.backup.provider,
        reason: "primary_degraded",
      });
      const backupRes = await runNonStreamWithProvider({
        ...args,
        cfg: args.backup,
      });
      if (backupRes.ok) {
        return backupRes;
      }
      if (isProviderAvailabilityError(backupRes.error)) {
        return buildProviderUnavailableError({
          traceId: args.entry.traceId,
          primary: args.primary,
          backup: args.backup,
        });
      }
      return backupRes;
    }

    if (canHalfOpenProbe) {
      deps.logger.info("ai_provider_half_open_probe", {
        traceId: args.entry.traceId,
        provider: args.primary.provider,
      });
    }

    const primaryRes = await runNonStreamWithProvider({
      ...args,
      cfg: args.primary,
    });
    if (primaryRes.ok) {
      providerResolver.markProviderSuccess({
        cfg: args.primary,
        traceId: args.entry.traceId,
        fromHalfOpen: canHalfOpenProbe,
      });
      return primaryRes;
    }

    if (!isProviderAvailabilityError(primaryRes.error)) {
      return primaryRes;
    }

    const state = providerResolver.markProviderFailure({
      cfg: args.primary,
      traceId: args.entry.traceId,
      reason: primaryRes.error.code,
    });

    if (state.status !== "degraded") {
      return buildProviderUnavailableError({
        traceId: args.entry.traceId,
        primary: args.primary,
        backup: args.backup,
      });
    }

    if (args.backup === null) {
      return buildProviderUnavailableError({
        traceId: args.entry.traceId,
        primary: args.primary,
        backup: null,
      });
    }

    deps.logger.info("ai_provider_failover", {
      traceId: args.entry.traceId,
      from: args.primary.provider,
      to: args.backup.provider,
      reason: canHalfOpenProbe
        ? "half_open_probe_failed"
        : "primary_unavailable",
    });

    const backupRes = await runNonStreamWithProvider({
      ...args,
      cfg: args.backup,
    });
    if (backupRes.ok) {
      return backupRes;
    }
    if (isProviderAvailabilityError(backupRes.error)) {
      return buildProviderUnavailableError({
        traceId: args.entry.traceId,
        primary: args.primary,
        backup: args.backup,
      });
    }

    return backupRes;
  }

  return {
    fetchWithPolicy,
    runOpenAiNonStream,
    runAnthropicNonStream,
    runNonStreamWithProvider,
    runNonStreamWithFailover,
  };
}

function createAiStreamHelpers(
  deps: AiServiceDeps,
  emitHelpers: ReturnType<typeof createAiEmitHelpers>,
  nonStreamHelpers: ReturnType<typeof createAiNonStreamHelpers>,
) {
  const { emitChunk } = emitHelpers;
  const { fetchWithPolicy } = nonStreamHelpers;

  /**
   * Execute a streaming OpenAI-compatible request and emit delta events.
   */
  async function runOpenAiStream(args: {
    entry: RunEntry;
    cfg: ProviderConfig;
    runtimeMessages: RuntimeMessages;
    model: string;
  }): Promise<ServiceResult<true>> {
    const url = buildApiUrl({
      baseUrl: args.cfg.baseUrl,
      endpointPath: "/v1/chat/completions",
    });

    const fetchRes = await fetchWithPolicy({
      url,
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(args.cfg.apiKey
            ? { Authorization: `Bearer ${args.cfg.apiKey}` }
            : {}),
        },
        body: JSON.stringify({
          model: args.model,
          messages: args.runtimeMessages.openAiMessages,
          ...(args.runtimeMessages.tools.length > 0
            ? {
                tools: args.runtimeMessages.tools.map((tool) => ({
                  type: "function",
                  function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.inputSchema,
                  },
                })),
              }
            : {}),
          stream: true,
        }),
        signal: args.entry.controller.signal,
      },
    });
    if (!fetchRes.ok) {
      return fetchRes;
    }
    const res = fetchRes.data;

    if (!res.ok) {
      const mapped = await buildUpstreamHttpError({
        res,
        fallbackMessage: "AI upstream request failed",
      });
      return {
        ok: false,
        error: mapped,
      };
    }

    if (!res.body) {
      return ipcError("INTERNAL", "Missing streaming response body");
    }

    let sawDone = false;
    // P2: accumulators for tool call streaming (OpenAI tool_calls delta format)
    const toolCallAccumulator = new Map<number, { id: string; name: string; argumentsRaw: string }>();
    try {
      for await (const msg of readSse({ body: res.body })) {
        if (args.entry.terminal !== null) {
          break;
        }
        if (msg.data === "[DONE]") {
          sawDone = true;
          break;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(msg.data);
        } catch (error) {
          logWarn(
            deps.logger as Logger & {
              warn?: (event: string, data?: Record<string, unknown>) => void;
            },
            "ai_sse_parse_failure",
            {
              module: "ai-service",
              provider: "openai",
              raw: msg.data.slice(0, SSE_PARSE_RAW_MAX_LEN),
              error: error instanceof Error ? error.message : String(error),
            },
          );
          continue;
        }

        const delta = extractOpenAiDelta(parsed);
        if (typeof delta !== "string" || delta.length === 0) {
          // continue below after finish/tool parsing
        } else {
          emitChunk(args.entry, delta);
        }
        for (const chunk of collectOpenAiToolCallChunks(parsed)) {
          const existing = toolCallAccumulator.get(chunk.index) ?? {
            id: chunk.id ?? `tool-call-${chunk.index}`,
            name: chunk.name ?? "",
            argumentsRaw: "",
          };
          toolCallAccumulator.set(chunk.index, {
            id: chunk.id ?? existing.id,
            name: chunk.name ?? existing.name,
            argumentsRaw: `${existing.argumentsRaw}${chunk.argumentsChunk ?? ""}`,
          });
        }
        const finishReason = extractOpenAiFinishReason(parsed);
        if (finishReason !== null) {
          args.entry.finishReason = finishReason;
          if (finishReason === "tool_use") {
            args.entry.toolCalls = [...toolCallAccumulator.entries()]
              .sort((a, b) => a[0] - b[0])
              .map(([, value]) => {
                try {
                  const parsedArgs = JSON.parse(value.argumentsRaw) as unknown;
                  return [
                    {
                      id: value.id,
                      name: value.name,
                      arguments: parsedArgs,
                    },
                  ];
                } catch {
                  return [
                    {
                      id: value.id,
                      name: value.name,
                      arguments: null,
                    },
                  ];
                }
              })
              .flat();
          } else {
            args.entry.toolCalls = [];
          }
        }
      }
    } catch (error) {
      if (args.entry.controller.signal.aborted) {
        return ipcError("CANCELED", "AI request canceled");
      }
      return ipcError("LLM_API_ERROR", "Streaming connection interrupted", {
        reason: "STREAM_DISCONNECTED",
        retryable: true,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    if (args.entry.controller.signal.aborted) {
      return ipcError("CANCELED", "AI request canceled");
    }
    if (args.entry.terminal === null && !sawDone) {
      return ipcError("LLM_API_ERROR", "Streaming connection interrupted", {
        reason: "STREAM_DISCONNECTED",
        retryable: true,
      });
    }

    return { ok: true, data: true };
  }

  /**
   * Execute a streaming Anthropic request and emit delta events.
   */
  async function runAnthropicStream(args: {
    entry: RunEntry;
    cfg: ProviderConfig;
    runtimeMessages: RuntimeMessages;
    model: string;
  }): Promise<ServiceResult<true>> {
    const url = buildApiUrl({
      baseUrl: args.cfg.baseUrl,
      endpointPath: "/v1/messages",
    });

    const fetchRes = await fetchWithPolicy({
      url,
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          ...(args.cfg.apiKey ? { "x-api-key": args.cfg.apiKey } : {}),
        },
        body: JSON.stringify({
          model: args.model,
          max_tokens: DEFAULT_REQUEST_MAX_TOKENS_ESTIMATE,
          system: args.runtimeMessages.systemText,
          messages: args.runtimeMessages.anthropicMessages,
          ...(args.runtimeMessages.tools.length > 0
            ? {
                tools: args.runtimeMessages.tools.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  input_schema: tool.inputSchema,
                })),
              }
            : {}),
          stream: true,
        }),
        signal: args.entry.controller.signal,
      },
    });
    if (!fetchRes.ok) {
      return fetchRes;
    }
    const res = fetchRes.data;

    if (!res.ok) {
      const mapped = await buildUpstreamHttpError({
        res,
        fallbackMessage: "AI upstream request failed",
      });
      return {
        ok: false,
        error: mapped,
      };
    }

    if (!res.body) {
      return ipcError("INTERNAL", "Missing streaming response body");
    }

    let sawMessageStop = false;
    // P2: accumulators for Anthropic tool_use streaming (content_block_start/delta format)
    const anthropicToolBlocks = new Map<number, { id: string; name: string; inputRaw: string }>();
    try {
      for await (const msg of readSse({ body: res.body })) {
        if (args.entry.terminal !== null) {
          break;
        }

        if (msg.event === "message_stop") {
          sawMessageStop = true;
          break;
        }

        // P2: capture stop_reason from message_delta events
        if (msg.event === "message_delta") {
          try {
            const parsed = JSON.parse(msg.data) as JsonObject;
            const delta = typeof parsed.delta === "object" && parsed.delta !== null ? parsed.delta as JsonObject : null;
            if (delta && typeof delta.stop_reason === "string") {
              args.entry.finishReason = delta.stop_reason === "tool_use" ? "tool_use" : "stop";
            }
          } catch {
            // ignore parse failures
          }
          continue;
        }

        // P2: capture tool_use content block starts
        if (msg.event === "content_block_start") {
          try {
            const parsed = JSON.parse(msg.data) as JsonObject;
            const idx = typeof parsed.index === "number" ? parsed.index : -1;
            const block = typeof parsed.content_block === "object" && parsed.content_block !== null
              ? parsed.content_block as JsonObject
              : null;
            if (block && block.type === "tool_use" && idx >= 0) {
              const initialInput = typeof block.input === "object" && block.input !== null && !Array.isArray(block.input)
                ? JSON.stringify(block.input)
                : "";
              anthropicToolBlocks.set(idx, {
                id: typeof block.id === "string" ? block.id : "",
                name: typeof block.name === "string" ? block.name : "",
                inputRaw: initialInput !== "{}" ? initialInput : "",
              });
            }
          } catch {
            // ignore parse failures
          }
          continue;
        }

        if (msg.event !== "content_block_delta") {
          continue;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(msg.data);
        } catch (error) {
          logWarn(
            deps.logger as Logger & {
              warn?: (event: string, data?: Record<string, unknown>) => void;
            },
            "ai_sse_parse_failure",
            {
              module: "ai-service",
              provider: "anthropic",
              raw: msg.data.slice(0, SSE_PARSE_RAW_MAX_LEN),
              error: error instanceof Error ? error.message : String(error),
            },
          );
          continue;
        }

        // P2: accumulate input_json_delta for tool_use blocks
        const parsedObj = typeof parsed === "object" && parsed !== null ? parsed as JsonObject : null;
        if (parsedObj) {
          const blockIdx = typeof parsedObj.index === "number" ? parsedObj.index : -1;
          const blockDelta = typeof parsedObj.delta === "object" && parsedObj.delta !== null
            ? parsedObj.delta as JsonObject
            : null;
          if (blockDelta && blockDelta.type === "input_json_delta" && typeof blockDelta.partial_json === "string" && blockIdx >= 0) {
            const acc = anthropicToolBlocks.get(blockIdx);
            if (acc) {
              acc.inputRaw += blockDelta.partial_json;
            }
          }
        }

        const delta = extractAnthropicDelta(parsed);
        if (typeof delta !== "string" || delta.length === 0) {
          continue;
        }
        emitChunk(args.entry, delta);
      }
    } catch (error) {
      if (args.entry.controller.signal.aborted) {
        return ipcError("CANCELED", "AI request canceled");
      }
      return ipcError("LLM_API_ERROR", "Streaming connection interrupted", {
        reason: "STREAM_DISCONNECTED",
        retryable: true,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    // P2: finalise accumulated Anthropic tool blocks
    if (anthropicToolBlocks.size > 0) {
      const toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = [];
      for (const [, acc] of anthropicToolBlocks) {
        let parsedInput: Record<string, unknown> = {};
        try {
          const rawParsed = JSON.parse(acc.inputRaw);
          if (typeof rawParsed === "object" && rawParsed !== null) {
            parsedInput = rawParsed as Record<string, unknown>;
          }
        } catch {
          // Malformed input — leave as empty object
        }
        toolCalls.push({ id: acc.id, name: acc.name, arguments: parsedInput });
      }
      args.entry.toolCalls = toolCalls;
    }

    if (args.entry.controller.signal.aborted) {
      return ipcError("CANCELED", "AI request canceled");
    }
    if (args.entry.terminal === null && !sawMessageStop) {
      return ipcError("LLM_API_ERROR", "Streaming connection interrupted", {
        reason: "STREAM_DISCONNECTED",
        retryable: true,
      });
    }

    return { ok: true, data: true };
  }

  return { runOpenAiStream, runAnthropicStream };
}

// eslint-disable-next-line max-lines-per-function
function createAiRunPipelineHelpers(
  deps: AiServiceDeps,
  state: AiInternalState,
  helpers: AiHelpers,
) {
  const {
    sessionTokenTotalsByKey,
    maxSkillOutputChars,
    retryBackoffMs,
    sleep,
  } = state;
  const {
    setTerminal,
    normalizeSkillError,
    buildSkillOutputTooLargeError,
    runNonStreamWithFailover,
    cleanupRun,
    runAnthropicStream,
    runOpenAiStream,
    isReplayableStreamDisconnect,
    resetForFullPromptReplay,
    clearChunkFlushTimer,
    flushChunkBuffer,
  } = helpers;

  async function executeNonStreamImpl(runCtx: {
    entry: RunEntry;
    primaryCfg: ProviderConfig;
    backupCfg: ProviderConfig | null;
    runtimeMessages: RuntimeMessages;
    model: string;
    sessionKey: string;
    executionId: string;
    runId: string;
    traceId: string;
    promptTokens: number;
    controller: AbortController;
    consumeSessionTokenBudget: () => Err | null;
    persistSuccessfulTurn: (output: string) => void;
    persistTraceAndGetDegradation: (
      output: string,
    ) => TracePersistenceDegradation | undefined;
  }): Promise<
    ServiceResult<{
      executionId: string;
      runId: string;
      traceId: string;
      outputText?: string;
      finishReason?: "stop" | "tool_use" | null;
      toolCalls?: ToolCallInfo[];
      degradation?: TracePersistenceDegradation;
    }>
  > {
    const {
      entry,
      primaryCfg,
      backupCfg,
      runtimeMessages,
      model,
      sessionKey,
      executionId,
      runId,
      traceId,
      promptTokens,
      controller,
      consumeSessionTokenBudget,
      persistSuccessfulTurn,
      persistTraceAndGetDegradation,
    } = runCtx;
    try {
      const budgetExceeded = consumeSessionTokenBudget();
      if (budgetExceeded) {
        setTerminal({
          entry,
          terminal: "error",
          error: budgetExceeded.error,
          logEvent: "ai_run_failed",
          errorCode: budgetExceeded.error.code,
        });
        return budgetExceeded;
      }

      const currentTotal = sessionTokenTotalsByKey.get(sessionKey) ?? 0;
      const res = await runNonStreamWithFailover({
        entry,
        primary: primaryCfg,
        backup: backupCfg,
        runtimeMessages,
        model,
      });

      if (!res.ok) {
        const normalizedError = normalizeSkillError(res.error);
        setTerminal({
          entry,
          terminal: "error",
          error: normalizedError,
          logEvent: "ai_run_failed",
          errorCode: normalizedError.code,
        });
        return { ok: false, error: normalizedError };
      }

      if (res.data.length > maxSkillOutputChars) {
        const oversizedError = buildSkillOutputTooLargeError(res.data.length);
        setTerminal({
          entry,
          terminal: "error",
          error: oversizedError,
          logEvent: "ai_run_failed",
          errorCode: oversizedError.code,
        });
        return { ok: false, error: oversizedError };
      }

      entry.outputText = res.data;
      entry.finishReason = "stop";
      entry.toolCalls = [];
      const completionTokens = estimateTokenCount(res.data);
      entry.completionTokens = completionTokens;
      sessionTokenTotalsByKey.set(
        sessionKey,
        currentTotal + promptTokens + completionTokens,
      );
      persistSuccessfulTurn(res.data);
      const degradation = persistTraceAndGetDegradation(res.data);

      setTerminal({
        entry,
        terminal: "completed",
        logEvent: "ai_run_completed",
      });
      return {
        ok: true,
        data: {
          executionId,
          runId,
          traceId,
          outputText: res.data,
          finishReason: entry.finishReason,
          toolCalls: entry.toolCalls,
          ...(degradation ? { degradation } : {}),
        },
      };
    } catch (error) {
      const aborted = controller.signal.aborted;
      if (aborted) {
        if (entry.terminal === "error") {
          return ipcError("SKILL_TIMEOUT", "Skill execution timed out");
        }
        setTerminal({
          entry,
          terminal: "cancelled",
          logEvent: "ai_run_canceled",
          errorCode: "CANCELED",
        });
        return ipcError("CANCELED", "AI request canceled");
      }

      setTerminal({
        entry,
        terminal: "error",
        error: {
          code: "INTERNAL",
          message: "AI request failed",
          details: {
            message: error instanceof Error ? error.message : String(error),
          },
        },
        logEvent: "ai_run_failed",
        errorCode: "INTERNAL",
      });
      return ipcError("INTERNAL", "AI request failed");
    } finally {
      cleanupRun(runId);
    }
  }

  async function executeStreamImpl(runCtx: {
    entry: RunEntry;
    primaryCfg: ProviderConfig;
    runtimeMessages: RuntimeMessages;
    model: string;
    runId: string;
    executionId: string;
    traceId: string;
    sessionKey: string;
    promptTokens: number;
    controller: AbortController;
    persistSuccessfulTurn: (output: string) => void;
    persistTraceAndGetDegradation: (
      output: string,
    ) => TracePersistenceDegradation | undefined;
  }): Promise<void> {
    const {
      entry,
      primaryCfg,
      runtimeMessages,
      model,
      runId,
      executionId,
      traceId,
      sessionKey,
      promptTokens,
      controller,
      persistSuccessfulTurn,
      persistTraceAndGetDegradation,
    } = runCtx;
    try {
      let replayAttempts = 0;
      for (;;) {
        const res =
          primaryCfg.provider === "anthropic"
            ? await runAnthropicStream({
                entry,
                cfg: primaryCfg,
                runtimeMessages,
                model,
              })
            : await runOpenAiStream({
                entry,
                cfg: primaryCfg,
                runtimeMessages,
                model,
              });

        if (res.ok) {
          break;
        }

        if (entry.terminal !== null) {
          return;
        }

        const normalizedError = normalizeSkillError(res.error);
        if (
          !isReplayableStreamDisconnect(normalizedError) ||
          replayAttempts >= 1
        ) {
          setTerminal({
            entry,
            terminal:
              normalizedError.code === "CANCELED" ? "cancelled" : "error",
            error: normalizedError,
            logEvent:
              normalizedError.code === "SKILL_TIMEOUT"
                ? "ai_run_timeout"
                : normalizedError.code === "CANCELED"
                  ? "ai_run_canceled"
                  : "ai_run_failed",
            errorCode: normalizedError.code,
          });
          return;
        }

        replayAttempts += 1;
        resetForFullPromptReplay(entry);
        deps.logger.info("ai_stream_replay_retry", {
          runId,
          executionId,
          traceId,
          attempt: replayAttempts,
        });

        const waitMs =
          retryBackoffMs[
            Math.min(replayAttempts - 1, retryBackoffMs.length - 1)
          ] ?? 0;
        if (waitMs > 0) {
          await sleep(waitMs);
        }
      }

      if (entry.terminal !== null) {
        return;
      }

      if (entry.completionTimer !== null) {
        return;
      }

      clearChunkFlushTimer(entry);
      // Completion is deferred briefly so a near-simultaneous cancel can win.
      entry.completionTimer = setTimeout(() => {
        entry.completionTimer = null;
        if (entry.terminal !== null) {
          return;
        }
        entry.completionTimer = setTimeout(() => {
          entry.completionTimer = null;
          if (entry.terminal !== null) {
            return;
          }
          flushChunkBuffer(entry);
          if (entry.terminal !== null) {
            return;
          }

          const currentTotal = sessionTokenTotalsByKey.get(sessionKey) ?? 0;
          const completionTokens = estimateTokenCount(entry.outputText);
          entry.completionTokens = completionTokens;
          sessionTokenTotalsByKey.set(
            sessionKey,
            currentTotal + promptTokens + completionTokens,
          );
          persistSuccessfulTurn(entry.outputText);
          persistTraceAndGetDegradation(entry.outputText);

          setTerminal({
            entry,
            terminal: "completed",
            logEvent: "ai_run_completed",
          });
        }, 0);
      }, STREAM_COMPLETION_SETTLE_MS);
    } catch (error) {
      if (entry.terminal !== null) {
        return;
      }

      const aborted = controller.signal.aborted;
      if (aborted) {
        setTerminal({
          entry,
          terminal: "cancelled",
          logEvent: "ai_run_canceled",
          errorCode: "CANCELED",
        });
        return;
      }

      setTerminal({
        entry,
        terminal: "error",
        error: {
          code: "INTERNAL",
          message: "AI request failed",
          details: {
            message: error instanceof Error ? error.message : String(error),
          },
        },
        logEvent: "ai_run_failed",
        errorCode: "INTERNAL",
      });
    }
  }

  return { executeNonStreamImpl, executeStreamImpl };
}

// eslint-disable-next-line max-lines-per-function
function createAiRunSkillOp(
  deps: AiServiceDeps,
  state: AiInternalState,
  helpers: AiHelpers,
  pipeline: ReturnType<typeof createAiRunPipelineHelpers>,
): Pick<AiService, "runSkill"> {
  const {
    providerResolver,
    runtimeGovernance,
    getFakeServer,
    runs,
    now,
    sessionTokenBudget,
    sessionTokenTotalsByKey,
    skillScheduler,
  } = state;
  const {
    resolveSessionKey,
    getChatMessageManager,
    buildRuntimeMessages,
    resolveRuntimeTools,
    setTerminal,
    resolveSchedulerTerminal,
    cleanupRun,
  } = helpers;
  const { executeNonStreamImpl, executeStreamImpl } = pipeline;

  // eslint-disable-next-line max-lines-per-function
  const runSkill: AiService["runSkill"] = async (args) => {
    const cfgRes = await providerResolver.resolveProviderConfig({
      env: deps.env,
      runtimeAiTimeoutMs: runtimeGovernance.ai.timeoutMs,
      getFakeServer,
      getProxySettings: deps.getProxySettings,
    });
    if (!cfgRes.ok) {
      return cfgRes;
    }
    const primaryCfg = cfgRes.data.primary;
    const backupCfg = cfgRes.data.backup;

    const preflight = validateProviderPreflight({
      provider: primaryCfg.provider,
      model: args.model,
      apiKey: primaryCfg.apiKey,
      allowMissingApiKey: deps.env.CREONOW_E2E === "1",
    });
    if (!preflight.ok) {
      return ipcError(preflight.error.code, preflight.error.message, {
        provider: primaryCfg.provider,
        model: args.model,
      });
    }

    const runId = randomUUID();
    const executionId = runId;
    const traceId = randomUUID();
    const controller = new AbortController();
    const sessionKey = resolveSessionKey(args.context);
    const chatMessageManager = getChatMessageManager(sessionKey);
    const history = chatMessageManager.getMessages().map((message) => ({
      role: message.role,
      content: message.content,
    }));
    // P2: when overrideMessages is provided, use them directly bypassing internal message assembly
    const runtimeMessages: RuntimeMessages = args.overrideMessages && args.overrideMessages.length > 0
      ? (() => {
          // OpenAI: preserve role="tool" messages with their tool_call_id
          const openAiMessages: RuntimeMessages["openAiMessages"] = args.overrideMessages!.map((m) => {
            if (m.role === "tool") {
              return {
                role: "tool" as const,
                content: m.content,
                tool_call_id: m.toolCallId ?? "",
              };
            }
            if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
              return {
                role: m.role as "system" | "user" | "assistant" | "tool",
                content: m.content,
                tool_calls: m.toolCalls.map((tc) => ({
                  id: tc.id,
                  type: "function" as const,
                  function: {
                    name: tc.name,
                    arguments: typeof tc.arguments === "string" ? tc.arguments : JSON.stringify(tc.arguments ?? {}),
                  },
                })),
              };
            }
            return {
              role: m.role as "system" | "user" | "assistant",
              content: m.content,
            };
          });
          const systemText = openAiMessages
            .filter((m) => m.role === "system")
            .map((m) => (m as LLMMessage).content)
            .join("\n");
          // Anthropic: group consecutive tool messages into user messages with
          // tool_result content blocks; skip system messages (sent separately).
          const anthropicMessages: RuntimeMessages["anthropicMessages"] = [];
          let pendingToolResults: AnthropicToolResultBlock[] = [];
          const flushToolResults = (): void => {
            if (pendingToolResults.length > 0) {
              anthropicMessages.push({ role: "user", content: [...pendingToolResults] });
              pendingToolResults = [];
            }
          };
          for (const m of args.overrideMessages!) {
            if (m.role === "system") {
              flushToolResults();
              continue;
            }
            if (m.role === "tool") {
              pendingToolResults.push({
                type: "tool_result",
                tool_use_id: m.toolCallId ?? "",
                content: m.content,
              });
            } else if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
              flushToolResults();
              const contentBlocks: AnthropicAssistantContentBlock[] = [];
              if (m.content.length > 0) {
                contentBlocks.push({ type: "text", text: m.content });
              }
              for (const tc of m.toolCalls) {
                contentBlocks.push({
                  type: "tool_use",
                  id: tc.id,
                  name: tc.name,
                  input: (typeof tc.arguments === "object" && tc.arguments !== null && !Array.isArray(tc.arguments))
                    ? tc.arguments as Record<string, unknown>
                    : {},
                });
              }
              anthropicMessages.push({ role: "assistant", content: contentBlocks });
            } else if (m.role === "user" || m.role === "assistant") {
              flushToolResults();
              anthropicMessages.push({ role: m.role, content: m.content });
            }
          }
          flushToolResults();
          const tools = resolveRuntimeTools(args.skillId);
          return { systemText, openAiMessages, anthropicMessages, tools };
        })()
      : buildRuntimeMessages({
          skillId: args.skillId ?? "",
          systemPrompt: args.systemPrompt,
          mode: args.mode,
          system: args.system,
          input: args.input,
          history,
        });
    const promptTokens = estimateRuntimePromptTokens({
      provider: primaryCfg.provider,
      runtimeMessages,
    });
    const projectedTokens = promptTokens + DEFAULT_REQUEST_MAX_TOKENS_ESTIMATE;
    const hasExplicitEnvTimeout =
      (typeof deps.env.CN_AI_TIMEOUT_MS === "string" &&
        deps.env.CN_AI_TIMEOUT_MS.trim().length > 0) ||
      (typeof deps.env.CREONOW_AI_TIMEOUT_MS === "string" &&
        deps.env.CREONOW_AI_TIMEOUT_MS.trim().length > 0);
    const skillTimeoutMs = resolveSkillTimeoutMs({
      timeoutMs: args.timeoutMs,
      fallbackEnvTimeoutMs: hasExplicitEnvTimeout
        ? primaryCfg.timeoutMs
        : undefined,
    });
    let resolveCompletion: (terminal: SkillSchedulerTerminal) => void = () =>
      undefined;
    const completionPromise = new Promise<SkillSchedulerTerminal>((resolve) => {
      resolveCompletion = resolve;
    });
    const entry: RunEntry = {
      executionId,
      runId,
      traceId,
      controller,
      timeoutTimer: null,
      completionTimer: null,
      chunkFlushTimer: null,
      stream: args.stream,
      startedAt: args.ts,
      terminal: null,
      doneEmitted: false,
      schedulerTerminalResolved: false,
      resolveSchedulerTerminal: resolveCompletion,
      seq: 0,
      outputText: "",
      pendingChunkBuffer: "",
      pendingChunkCount: 0,
      finishReason: null,
      toolCalls: [],
      promptTokens,
      completionTokens: 0,
      model: args.model,
      emitEvent: args.emitEvent,
    };
    runs.set(runId, entry);

    deps.logger.info("ai_run_started", {
      runId,
      executionId,
      traceId,
      provider: primaryCfg.provider,
      stream: args.stream,
      timeoutMs: skillTimeoutMs,
    });

    const consumeSessionTokenBudget = (): Err | null => {
      const currentTotal = sessionTokenTotalsByKey.get(sessionKey) ?? 0;
      if (currentTotal + projectedTokens > sessionTokenBudget) {
        return ipcError(
          "AI_SESSION_TOKEN_BUDGET_EXCEEDED",
          "AI session token budget exceeded",
          {
            traceId,
            sessionKey,
            sessionTokenBudget,
            currentTotal,
            projectedTokens,
          },
        );
      }
      return null;
    };

    const persistSuccessfulTurn = (assistantOutput: string): void => {
      const baseTs = now();
      const tx = createAiWriteTransaction({
        onRollbackError: (error, rollbackIndex) => {
          deps.logger.error("ai_write_transaction_rollback_failed", {
            runId,
            traceId,
            rollbackIndex,
            message: error instanceof Error ? error.message : String(error),
          });
        },
      });
      const userMessageId = randomUUID();
      const assistantMessageId = randomUUID();
      tx.applyWrite({
        apply: () => {
          chatMessageManager.add({
            id: userMessageId,
            role: "user",
            content: args.input,
            timestamp: baseTs,
            skillId: args.skillId,
            metadata: {
              tokenCount: promptTokens,
              model: args.model,
            },
          });
        },
        rollback: () => {
          chatMessageManager.removeById(userMessageId);
        },
      });
      tx.applyWrite({
        apply: () => {
          chatMessageManager.add({
            id: assistantMessageId,
            role: "assistant",
            content: assistantOutput,
            timestamp: baseTs + 1,
            skillId: args.skillId,
            metadata: {
              tokenCount: estimateTokenCount(assistantOutput),
              model: args.model,
            },
          });
        },
        rollback: () => {
          chatMessageManager.removeById(assistantMessageId);
        },
      });
      tx.commit();
    };

    const persistTraceAndGetDegradation = (
      assistantOutput: string,
    ): TracePersistenceDegradation | undefined => {
      if (!deps.traceStore) {
        return undefined;
      }

      const persisted = deps.traceStore.persistGenerationTrace({
        traceId,
        runId,
        executionId,
        skillId: args.skillId,
        mode: args.mode,
        model: args.model,
        inputText: args.input,
        outputText: assistantOutput,
        context: args.context,
        startedAt: entry.startedAt,
        completedAt: now(),
      });

      if (persisted.ok) {
        return undefined;
      }

      const degradation: TracePersistenceDegradation = {
        code: "TRACE_PERSISTENCE_DEGRADED",
        message: "Trace persistence failed",
        runId,
        traceId,
        cause: {
          code: persisted.error.code,
          message: persisted.error.message,
        },
      };

      deps.logger.error("ai_trace_persistence_degraded", {
        code: degradation.code,
        runId: degradation.runId,
        traceId: degradation.traceId,
        causeCode: degradation.cause.code,
        causeMessage: degradation.cause.message,
      });

      return degradation;
    };

    function armSkillTimeout(): void {
      if (entry.timeoutTimer) {
        clearTimeout(entry.timeoutTimer);
      }
      entry.timeoutTimer = setTimeout(() => {
        if (entry.terminal !== null) {
          return;
        }
        controller.abort();

        setTerminal({
          entry,
          terminal: "error",
          error: {
            code: "SKILL_TIMEOUT",
            message: "Skill execution timed out",
          },
          logEvent: "ai_run_timeout",
          errorCode: "SKILL_TIMEOUT",
        });
      }, skillTimeoutMs);
    }

    const scheduled = await skillScheduler.schedule({
      sessionKey,
      executionId,
      runId,
      traceId,
      onQueueEvent: (queueState) => {
        args.emitEvent({
          type: "queue",
          executionId,
          runId,
          traceId,
          status: queueState.status,
          queuePosition: queueState.queuePosition,
          queued: queueState.queued,
          globalRunning: queueState.globalRunning,
          ts: now(),
        });
      },
      start: () => {
        armSkillTimeout();
        if (args.stream) {
          const budgetExceeded = consumeSessionTokenBudget();
          if (budgetExceeded) {
            setTerminal({
              entry,
              terminal: "error",
              error: budgetExceeded.error,
              logEvent: "ai_run_failed",
              errorCode: budgetExceeded.error.code,
            });
            return {
              response: Promise.resolve(
                budgetExceeded as ServiceResult<{
                  executionId: string;
                  runId: string;
                  traceId: string;
                  outputText?: string;
                  finishReason?: "stop" | "tool_use" | null;
                  toolCalls?: ToolCallInfo[];
                  degradation?: TracePersistenceDegradation;
                }>,
              ),
              completion: completionPromise,
            };
          }

          void executeStreamImpl({
            entry,
            primaryCfg,
            runtimeMessages,
            model: args.model,
            runId,
            executionId,
            traceId,
            sessionKey,
            promptTokens,
            controller,
            persistSuccessfulTurn,
            persistTraceAndGetDegradation,
          });

          return {
            response: Promise.resolve({
              ok: true,
              data: { executionId, runId, traceId },
            }),
            completion: completionPromise,
          };
        }

        return {
          response: executeNonStreamImpl({
            entry,
            primaryCfg,
            backupCfg,
            runtimeMessages,
            model: args.model,
            sessionKey,
            executionId,
            runId,
            traceId,
            promptTokens,
            controller,
            consumeSessionTokenBudget,
            persistSuccessfulTurn,
            persistTraceAndGetDegradation,
          }),
          completion: completionPromise,
        };
      },
    });

    if (!scheduled.ok) {
      resolveSchedulerTerminal(entry, "failed");
      cleanupRun(runId);
      return scheduled;
    }

    return scheduled;
  };

  return { runSkill };
}

function createAiMethodOps(
  deps: AiServiceDeps,
  state: AiInternalState,
  helpers: AiHelpers,
): Pick<AiService, "listModels" | "cancel" | "feedback"> {
  const { runtimeGovernance, providerResolver, getFakeServer, runs } = state;
  const { setTerminal, fetchWithPolicy } = helpers;

  const listModels: AiService["listModels"] = async () => {
    const cfgRes = await providerResolver.resolveProviderConfig({
      env: deps.env,
      runtimeAiTimeoutMs: runtimeGovernance.ai.timeoutMs,
      getFakeServer,
      getProxySettings: deps.getProxySettings,
    });
    if (!cfgRes.ok) {
      return cfgRes;
    }

    const cfg = cfgRes.data.primary;
    const provider = cfg.provider;
    const providerName = providerDisplayName(provider);

    const url = buildApiUrl({
      baseUrl: cfg.baseUrl,
      endpointPath: "/v1/models",
    });
    const fetchRes = await fetchWithPolicy({
      url,
      init: {
        method: "GET",
        headers: {
          ...(cfg.apiKey
            ? provider === "anthropic"
              ? {
                  "x-api-key": cfg.apiKey,
                  "anthropic-version": "2023-06-01",
                }
              : { Authorization: `Bearer ${cfg.apiKey}` }
            : {}),
        },
      },
    });
    if (!fetchRes.ok) {
      return fetchRes;
    }
    const res = fetchRes.data;

    if (!res.ok) {
      const mapped = await buildUpstreamHttpError({
        res,
        fallbackMessage: "AI model catalog request failed",
      });
      return {
        ok: false,
        error: mapped,
      };
    }

    const jsonRes = await parseJsonResponse(res);
    if (!jsonRes.ok) {
      return jsonRes;
    }
    const json = jsonRes.data;
    const items = extractOpenAiModels(json).map((item) => ({
      id: item.id,
      name: item.name,
      provider: providerName,
    }));

    return {
      ok: true,
      data: {
        source: provider,
        items,
      },
    };
  };

  const cancel: AiService["cancel"] = (args) => {
    const executionId = (args.executionId ?? args.runId ?? "").trim();
    if (executionId.length === 0) {
      return ipcError("INVALID_ARGUMENT", "executionId is required");
    }

    const entry = runs.get(executionId);
    if (!entry) {
      return { ok: true, data: { canceled: true } };
    }

    if (entry.terminal !== null) {
      return { ok: true, data: { canceled: true } };
    }

    entry.controller.abort();
    setTerminal({
      entry,
      terminal: "cancelled",
      logEvent: "ai_run_canceled",
      errorCode: "CANCELED",
      ts: args.ts,
    });

    return { ok: true, data: { canceled: true } };
  };

  const feedback: AiService["feedback"] = (args) => {
    if (deps.traceStore) {
      const persisted = deps.traceStore.recordTraceFeedback({
        runId: args.runId,
        action: args.action,
        evidenceRef: args.evidenceRef,
        ts: args.ts,
      });
      if (!persisted.ok) {
        deps.logger.error("ai_trace_feedback_persist_failed", {
          runId: args.runId,
          action: args.action,
          code: persisted.error.code,
          message: persisted.error.message,
        });
        return persisted;
      }
    }

    deps.logger.info("ai_feedback_received", {
      runId: args.runId,
      action: args.action,
      evidenceRefLen: args.evidenceRef.trim().length,
    });
    return { ok: true, data: { recorded: true } };
  };

  return { listModels, cancel, feedback };
}

export function createAiService(deps: AiServiceDeps): AiService {
  const runtimeGovernance = resolveRuntimeGovernanceFromEnv(deps.env);
  const runs = new Map<string, RunEntry>();
  const requestTimestamps: number[] = [];
  const sessionTokenTotalsByKey = new Map<string, number>();
  const sessionChatMessagesByKey = new Map<string, ChatMessageManager>();
  const skillScheduler = createSkillScheduler({
    globalConcurrencyLimit: runtimeGovernance.skills.globalConcurrencyLimit,
    sessionQueueLimit: runtimeGovernance.skills.sessionQueueLimit,
    slotRecoveryTimeoutMs: runtimeGovernance.skills.slotRecoveryTimeoutMs,
  });
  const now = deps.now ?? (() => Date.now());
  const providerResolver = createProviderResolver({
    logger: deps.logger,
    now,
  });
  const sleep =
    deps.sleep ??
    ((ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      }));
  const rateLimitPerMinute =
    deps.rateLimitPerMinute ?? runtimeGovernance.ai.rateLimitPerMinute;
  const retryBackoffMs =
    deps.retryBackoffMs ?? runtimeGovernance.ai.retryBackoffMs;
  const sessionTokenBudget =
    deps.sessionTokenBudget ?? runtimeGovernance.ai.sessionTokenBudget;
  const maxSkillOutputChars = parseMaxSkillOutputChars(deps.env);
  const chatHistoryTokenBudget = parseChatHistoryTokenBudget(deps.env);
  let fakeServerPromise: Promise<FakeAiServer> | null = null;

  const getFakeServer = async (): Promise<FakeAiServer> => {
    if (!fakeServerPromise) {
      fakeServerPromise = startFakeAiServer({
        logger: deps.logger,
        env: deps.env,
      });
    }
    return await fakeServerPromise;
  };

  const state: AiInternalState = {
    runs,
    requestTimestamps,
    now,
    runtimeGovernance,
    sleep,
    rateLimitPerMinute,
    retryBackoffMs,
    sessionTokenBudget,
    maxSkillOutputChars,
    chatHistoryTokenBudget,
    sessionTokenTotalsByKey,
    sessionChatMessagesByKey,
    skillScheduler,
    providerResolver,
    getFakeServer,
  };

  const sessionHelpers = createAiSessionHelpers(state);
  const emitHelpers = createAiEmitHelpers(deps, state);
  const nonStreamHelpers = createAiNonStreamHelpers(
    deps,
    state,
    sessionHelpers,
  );
  const streamHelpers = createAiStreamHelpers(
    deps,
    emitHelpers,
    nonStreamHelpers,
  );
  const helpers: AiHelpers = {
    ...sessionHelpers,
    ...emitHelpers,
    ...nonStreamHelpers,
    ...streamHelpers,
  };
  const pipeline = createAiRunPipelineHelpers(deps, state, helpers);

  const { runSkill } = createAiRunSkillOp(deps, state, helpers, pipeline);
  const { listModels, cancel, feedback } = createAiMethodOps(
    deps,
    state,
    helpers,
  );

  return { runSkill, listModels, cancel, feedback };
}
