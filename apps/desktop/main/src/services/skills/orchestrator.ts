/**
 * @module WritingOrchestrator — 9-stage writing pipeline
 *
 * ## Pipeline stages
 * intent-resolved → context-assembled → model-selected → ai-chunk* →
 * ai-done → permission-requested → permission-granted/denied →
 * write-back-done → hooks-done
 *
 * ## Responsibility
 * This module is the ONLY code path that writes AI output to documents.
 * Stage 6 enforces Permission Gate (INV-1), Stage 7 executes the write-back
 * via the `documentWrite` tool (registered in writingTooling.ts).
 *
 * ## What this module does NOT do
 * - Does not resolve which skill to run (IPC layer does that)
 * - Does not send events to the renderer (IPC layer drains the generator)
 *
 * ## Key invariants
 * - INV-1: pre-write snapshot → permission gate → documentWrite → confirmCommit
 * - INV-2: documentWrite has isConcurrencySafe=false (serial only)
 * - INV-6: all capabilities are Skills; write-back uses registered tool
 * - INV-8: Stage 8 post-writing hooks run after write-back
 *
 * 权限门禁、120s 权限超时、Post-Writing Hooks、任务状态机
 */

import type { AiCompletionResult, AiTokenUsage } from "@shared/types/ai";
import type { ToolRegistry } from "./toolRegistry";
import type { StreamChunk, ToolCallInfo } from "../ai/streaming";
import type { CostTracker } from "../ai/costTracker";
import type { ToolUseHandler } from "./toolUseHandler";
import type {
  CompactMessage,
  CompactMessageRole,
  NarrativeKnowledgeSnapshot,
} from "../ai/compact";
import type {
  DiffPreview,
  PermissionGate,
  PermissionLevel,
  PermissionRequest,
} from "./permissionGate";
import { normalizeLevel } from "./permissionGate";
import type { VersionWorkflowService } from "../documents/versionService";

// ── Types ──────────────────────────────────────────────────────────

type AgenticMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  toolCalls?: Array<{ id: string; name: string; arguments: unknown }>;
};

export interface WritingRequest {
  requestId: string;
  skillId: string;
  level?: PermissionLevel;
  sessionId?: string;
  input: { selectedText?: string; precedingText?: string; followingText?: string; [key: string]: unknown };
  userInstruction?: string;
  documentId: string;
  projectId?: string;
  modelId?: string;
  cursorPosition?: number;
  selection?: {
    from: number;
    to: number;
    text: string;
    selectionTextHash: string;
  };
  /** P2: set to true for skills that support Agentic Loop (e.g. continue) */
  agenticLoop?: boolean;
}

export type WritingEventType =
  | "intent-resolved"
  | "context-assembled"
  | "model-selected"
  | "ai-chunk"
  | "ai-done"
  | "permission-requested"
  | "permission-granted"
  | "permission-denied"
  | "write-back-done"
  | "hooks-done"
  | "aborted"
  | "error"
  | "budget-exceeded"
  | "cost-recorded"
  // P2 Agentic Loop events
  | "tool-use-started"
  | "tool-use-completed"
  | "tool-use-failed"
  // P3 Settings / Memory / Search / Skill / Export events
  | "character-updated"
  | "location-created"
  | "location-updated"
  | "location-deleted"
  | "memory-injected"
  | "memory-updated"
  | "search-index-updated"
  | "consistency-check-completed"
  | "export-completed"
  | "project-config-updated";

export type WritingEvent = {
  type: WritingEventType;
  timestamp: number;
  requestId: string;
  [key: string]: unknown;
};

type TaskState = "pending" | "running" | "paused" | "completed" | "failed" | "killed";

interface AIService {
  streamChat(
    messages: Array<{ role: string; content: string }>,
    options: {
      signal: AbortSignal;
      onComplete: (result: Partial<AiCompletionResult> & { usage?: Partial<AiTokenUsage> }) => void;
      onError: (e: unknown) => void;
      onApiCallStarted?: () => void;
      skillId?: string;
      requestId?: string;
      sessionId?: string;
    },
  ): AsyncGenerator<StreamChunk>;
  estimateTokens(text: string): number;
  abort(): void;
}

interface PreparedRequest {
  messages: Array<{ role: string; content: string }>;
  tokenCount: number;
  modelId: string;
}

type OrchestratorTokenUsage = AiTokenUsage;

type GeneratedTextResult = {
  fullText: string;
  usage: OrchestratorTokenUsage;
  /** P2: finish reason from the AI */
  finishReason?: "stop" | "tool_use" | null;
  /** P2: tool calls requested by the AI */
  toolCalls?: ToolCallInfo[];
};

function readVersionId(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const versionId = (data as Record<string, unknown>).versionId;
  if (typeof versionId !== "string") {
    return null;
  }
  const normalized = versionId.trim();
  return normalized.length > 0 ? normalized : null;
}

interface PostWritingHook {
  name: string;
  enabled?: boolean;
  execute(context: unknown): Promise<void>;
}

export interface OrchestratorConfig {
  aiService: AIService;
  toolRegistry: ToolRegistry;
  permissionGate: PermissionGate;
  postWritingHooks: PostWritingHook[];
  defaultTimeoutMs: number;
  costTracker?: Pick<CostTracker, "checkBudget" | "recordUsage" | "getSessionCost">;
  /** P2: handler for Agentic Loop tool execution (read-only registry) */
  toolUseHandler?: ToolUseHandler;
  versionWorkflow?: Pick<
    VersionWorkflowService,
    | "createPreWriteSnapshot"
    | "markAiWriting"
    | "confirmCommit"
    | "rejectCommit"
    | "cancelCommit"
  >;
  prepareRequest?: (request: WritingRequest) => Promise<PreparedRequest>;
  generateText?: (args: {
    request: WritingRequest;
    signal: AbortSignal;
    emitChunk: (delta: string, accumulatedTokens: number) => void;
    onApiCallStarted?: () => void;
    /** P2: updated messages for subsequent agentic loop rounds */
    messages?: Array<{ role: string; content: string; toolCallId?: string }>;
  }) => Promise<{
    fullText: string;
    usage: OrchestratorTokenUsage;
    /** P2: finish reason from the AI (null = streaming, stop = done, tool_use = wants tools) */
    finishReason?: "stop" | "tool_use" | null;
    /** P2: tool calls requested by the AI when finishReason === 'tool_use' */
    toolCalls?: ToolCallInfo[];
  }>;
  autoCompact?: {
    maybeCompact: (args: {
      messages: CompactMessage[];
      auxiliaryModel?: string;
      requestModelId?: string;
      kgSnapshot: NarrativeKnowledgeSnapshot;
      requestId?: string;
    }) => Promise<{ messages: CompactMessage[]; totalTokensAfter: number }>;
  };
  getAutoCompactSnapshot?: (args: {
    request: Pick<WritingRequest, "projectId" | "documentId" | "requestId">;
  }) => Promise<NarrativeKnowledgeSnapshot>;
  logger?: {
    warn: (event: string, data?: Record<string, unknown>) => void;
  };
}

export interface WritingOrchestrator {
  execute(request: WritingRequest): AsyncGenerator<WritingEvent>;
  abort(requestId: string): void;
  getTaskState(requestId: string): TaskState;
  dispose(): void;
}

const VALID_SKILL_IDS = ["polish", "expand", "summarize", "translate", "rewrite", "continue"];
const MAX_TASK_ENTRIES = 1000;
/** P2: Maximum agentic tool-use rounds — exported so ToolUseConfig.maxToolRounds stays in sync */
export const AGENTIC_MAX_ROUNDS = 5;

export function createWritingOrchestrator(
  config: OrchestratorConfig,
): WritingOrchestrator {
  const taskStates = new Map<string, TaskState>();
  const abortControllers = new Map<string, AbortController>();

  function normalizeSkillId(skillId: string): string {
    const parts = skillId.split(":");
    return parts[parts.length - 1] ?? skillId;
  }

  function pruneTaskStates(): void {
    if (taskStates.size > MAX_TASK_ENTRIES) {
      for (const [id, state] of taskStates) {
        if (["completed", "failed", "killed"].includes(state)) {
          taskStates.delete(id);
          if (taskStates.size <= MAX_TASK_ENTRIES / 2) break;
        }
      }
    }
  }

  function makeEvent(
    type: WritingEventType,
    requestId: string,
    extra: Record<string, unknown> = {},
  ): WritingEvent {
    return { type, timestamp: Date.now(), requestId, ...extra };
  }

  function makeFailureEvent(args: {
    requestId: string;
    code: string;
    message: string;
    retryable?: boolean;
    details?: unknown;
  }): WritingEvent {
    taskStates.set(args.requestId, "failed");
    pruneTaskStates();
    return makeEvent("error", args.requestId, {
      error: {
        code: args.code,
        message: args.message,
        retryable: args.retryable ?? false,
        ...(args.details === undefined ? {} : { details: args.details }),
      },
    });
  }

  function buildDiffPreview(request: WritingRequest, fullText: string): DiffPreview {
    const original =
      request.selection?.text ??
      (typeof request.input.selectedText === "string" ? request.input.selectedText : "");
    if (original.length === 0 && fullText.length > 0) {
      return { original: "", modified: fullText, changeType: "insert" };
    }
    if (original.length > 0 && fullText.length === 0) {
      return { original, modified: "", changeType: "delete" };
    }
    return { original, modified: fullText, changeType: "replace" };
  }

  function normalizeAutoCompactRole(role: string): CompactMessageRole {
    if (role === "system" || role === "assistant" || role === "tool") {
      return role;
    }
    return "user";
  }

  function convertMessagesForAutoCompact(
    messages: Array<{ role: string; content: string }>,
  ): CompactMessage[] {
    const hasWritingDirective = (content: string): boolean =>
      /(第一人称|第三人称|语气|文风|风格|口吻|时态|不要|必须|请务必|写作约束|叙述视角|POV|pov)/i.test(
        content,
      );

    let firstUserMessagePinned = false;
    return messages.map((message, index) => {
      const isSystem = message.role === "system";
      const isUser = message.role === "user";
      let compactable: boolean | undefined;
      if (isSystem) {
        compactable = false;
      } else if (isUser) {
        const shouldPinAsSetup = !firstUserMessagePinned;
        firstUserMessagePinned = true;
        compactable = shouldPinAsSetup || hasWritingDirective(message.content)
          ? false
          : undefined;
      }
      return {
        id: `prepared-${index}`,
        role: normalizeAutoCompactRole(message.role),
        content: message.content,
        compactable,
      };
    });
  }

  function convertMessagesFromAutoCompact(
    messages: CompactMessage[],
  ): Array<{ role: string; content: string }> {
    return messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }

  return {
    execute(request: WritingRequest): AsyncGenerator<WritingEvent> {
      const { requestId } = request;

      // Check terminal states eagerly
      const currentState = taskStates.get(requestId);
      if (currentState && ["completed", "failed", "killed"].includes(currentState)) {
        return (async function* () {
          yield makeEvent("error", requestId, {
            error: {
              code: "INVALID_STATE_TRANSITION",
              message: `Cannot transition from "${currentState}" to "running"`,
              retryable: false,
            },
          });
        })();
      }

      // Eagerly set running state before generator body executes
      taskStates.set(requestId, "running");
      const abortController = new AbortController();
      abortControllers.set(requestId, abortController);

      return (async function* () {
      try {
        // Validate skillId
        if (!VALID_SKILL_IDS.includes(normalizeSkillId(request.skillId))) {
          taskStates.set(requestId, "failed");
          yield makeEvent("error", requestId, {
            error: {
              code: "SKILL_INPUT_INVALID",
              message: `Unknown skill: "${request.skillId}"`,
              retryable: false,
            },
          });
          return;
        }

        // Stage 1: intent-resolved
        yield makeEvent("intent-resolved", requestId, {
          skillId: request.skillId,
        });

        if (abortController.signal.aborted) {
          taskStates.set(requestId, "killed");
          yield makeEvent("aborted", requestId, { reason: "user-abort" });
          return;
        }

        // Stage 2: context-assembled
        const prepared = config.prepareRequest
          ? await config.prepareRequest(request)
          : {
              messages: [
                {
                  role: "user",
                  content: request.input.selectedText ?? "",
                },
              ],
              tokenCount: config.aiService.estimateTokens(request.input.selectedText ?? ""),
              modelId: request.modelId ?? "default",
            };
        const autoCompact = config.autoCompact;
        const preparedWithCompaction = autoCompact
            ? await (async (): Promise<PreparedRequest> => {
              try {
                let kgSnapshot: NarrativeKnowledgeSnapshot = {
                  entities: [],
                  relations: [],
                  characterSettings: [],
                  unresolvedPlotPoints: [],
                  toneMarkers: [],
                  narrativePOV: undefined,
                  foreshadowingClues: [],
                  timelineMarkers: [],
                  userConstraints: [],
                };
                if (config.getAutoCompactSnapshot) {
                  try {
                    kgSnapshot = await config.getAutoCompactSnapshot({
                      request: {
                        projectId: request.projectId,
                        documentId: request.documentId,
                        requestId,
                      },
                    });
                  } catch (error) {
                    config.logger?.warn("orchestrator_auto_compact_kg_degraded", {
                      requestId,
                      error:
                        error instanceof Error ? error.message : String(error),
                    });
                  }
                }
                // INV-9: Use a distinct requestId so costTracker does not
                // conflate compact-call costs with the outer generation costs.
                const compactResult = await autoCompact.maybeCompact({
                  messages: convertMessagesForAutoCompact(prepared.messages),
                  auxiliaryModel: prepared.modelId,
                  requestModelId: prepared.modelId,
                  kgSnapshot,
                  requestId: `${requestId}-compact`,
                });
                return {
                  ...prepared,
                  messages: convertMessagesFromAutoCompact(compactResult.messages),
                  tokenCount: compactResult.totalTokensAfter,
                };
              } catch (error) {
                config.logger?.warn("orchestrator_auto_compact_degraded", {
                  requestId,
                  error:
                    error instanceof Error ? error.message : String(error),
                });
                return prepared;
              }
            })()
          : prepared;
        const tokenCount = preparedWithCompaction.tokenCount;
        yield makeEvent("context-assembled", requestId, { tokenCount });

        if (abortController.signal.aborted) {
          taskStates.set(requestId, "killed");
          yield makeEvent("aborted", requestId, { reason: "user-abort" });
          return;
        }

        // Stage 3: model-selected
        yield makeEvent("model-selected", requestId, {
          modelId: preparedWithCompaction.modelId,
        });

        if (abortController.signal.aborted) {
          taskStates.set(requestId, "killed");
          yield makeEvent("aborted", requestId, { reason: "user-abort" });
          return;
        }

        const checkBudgetGuard = (): WritingEvent | null => {
          const alert = config.costTracker?.checkBudget();
          if (!alert || alert.kind !== "hard-stop") {
            return null;
          }
          return makeEvent("budget-exceeded", requestId, {
            currentCost: alert.currentCost,
            hardStopLimit: alert.threshold,
          });
        };

        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;
        let totalCachedTokens = 0;
        const pendingCostEvents: WritingEvent[] = [];
        const recordUsage = (usage: OrchestratorTokenUsage): void => {
          totalPromptTokens += usage.promptTokens;
          totalCompletionTokens += usage.completionTokens;
          totalCachedTokens += Math.max(0, usage.cachedTokens ?? 0);

          if (!config.costTracker) {
            return;
          }

          const requestCost = config.costTracker.recordUsage(
            usage,
            preparedWithCompaction.modelId,
            requestId,
            normalizeSkillId(request.skillId),
            usage.cachedTokens,
          );
          const summary = config.costTracker.getSessionCost();
          const budgetAlert = config.costTracker.checkBudget() ?? undefined;
          pendingCostEvents.push(makeEvent("cost-recorded", requestId, {
            requestCost: requestCost.cost,
            sessionTotalCost: summary.totalCost,
            ...(budgetAlert ? { budgetAlert } : {}),
          }));
        };

        const budgetExceeded = checkBudgetGuard();
        if (budgetExceeded) {
          taskStates.set(requestId, "failed");
          yield budgetExceeded;
          yield makeFailureEvent({
            requestId,
            code: "BUDGET_EXCEEDED",
            message: "Budget hard-stop reached before AI execution",
          });
          return;
        }

          // Stage 4: AI streaming
        let fullText = "";
        let lastTokens = 0;
        let aiError: unknown = null;
        const MAX_AI_RETRIES = 2;
        let aiAttempt = 0;
        let aiSuccess = false;
        let lastFinishReason: "stop" | "tool_use" | null = null;
        let lastToolCalls: ToolCallInfo[] = [];
        let lastPromptTokens = tokenCount;
        let lastCachedTokens = 0;
        let apiCallStarted = false;

        while (aiAttempt <= MAX_AI_RETRIES && !aiSuccess) {
          try {
            fullText = "";
            lastTokens = 0;
            lastFinishReason = null;
            lastToolCalls = [];

            const generateText = config.generateText;
            const hasStreamChat = typeof config.aiService.streamChat === "function";
            const shouldUseGenerateText =
              Boolean(generateText) &&
              (request.agenticLoop === true ||
                !hasStreamChat);

            if (shouldUseGenerateText && generateText) {
              const chunkQueue: Array<{
                delta: string;
                accumulatedTokens: number;
              }> = [];
              let generatedResult: GeneratedTextResult | undefined;
              let generatedError: unknown = null;
              let generationSettled = false;
              let notifyChange: (() => void) | null = null;
              const wake = () => {
                const resolver = notifyChange;
                notifyChange = null;
                resolver?.();
              };
              const generationPromise = generateText({
                  request,
                  signal: abortController.signal,
                  emitChunk: (delta, accumulatedTokens) => {
                    chunkQueue.push({ delta, accumulatedTokens });
                    wake();
                  },
                  onApiCallStarted: () => {
                    apiCallStarted = true;
                  },
                  ...(request.agenticLoop === true
                    ? { messages: preparedWithCompaction.messages }
                    : {}),
                })
                .then(
                  (result) => {
                    generatedResult = result;
                    generationSettled = true;
                    wake();
                  },
                  (error: unknown) => {
                    generatedError = error;
                    generationSettled = true;
                    wake();
                  },
                );

              while (!generationSettled || chunkQueue.length > 0) {
                if (abortController.signal.aborted) {
                  if (apiCallStarted) {
                    recordUsage({
                      promptTokens: lastPromptTokens,
                      completionTokens: lastTokens,
                      totalTokens: lastPromptTokens + lastTokens,
                      cachedTokens: lastCachedTokens,
                    });
                  }
                  taskStates.set(requestId, "killed");
                  yield makeEvent("aborted", requestId, {
                    reason: "abort-during-ai",
                  });
                  return;
                }

                const nextChunk = chunkQueue.shift();
                if (nextChunk) {
                  fullText += nextChunk.delta;
                  lastTokens = nextChunk.accumulatedTokens;
                  yield makeEvent("ai-chunk", requestId, {
                    delta: nextChunk.delta,
                    accumulatedTokens: nextChunk.accumulatedTokens,
                  });
                  continue;
                }

                await new Promise<void>((resolve) => {
                  const onAbort = () => resolve();
                  notifyChange = resolve;
                  abortController.signal.addEventListener("abort", onAbort, {
                    once: true,
                  });
                });
              }

              await generationPromise;
              if (generatedError) {
                throw generatedError;
              }
              if (!generatedResult) {
                throw new Error("generateText completed without result");
              }

              fullText = generatedResult.fullText;
              lastPromptTokens = generatedResult.usage.promptTokens;
              lastTokens = generatedResult.usage.completionTokens;
              lastCachedTokens = generatedResult.usage.cachedTokens ?? 0;
              lastFinishReason = generatedResult.finishReason ?? null;
              lastToolCalls = generatedResult.toolCalls ?? [];
            } else if (hasStreamChat) {
              let streamFinishReason: "stop" | "tool_use" | null = null;
              const gen = config.aiService.streamChat(
                preparedWithCompaction.messages,
                {
                  signal: abortController.signal,
                  onComplete: (result) => {
                    const completedUsage = result.usage;
                    if (completedUsage) {
                      if (typeof completedUsage.promptTokens === "number" && Number.isFinite(completedUsage.promptTokens)) {
                        lastPromptTokens = Math.max(lastPromptTokens, Math.max(0, completedUsage.promptTokens));
                      }
                      if (typeof completedUsage.completionTokens === "number" && Number.isFinite(completedUsage.completionTokens)) {
                        lastTokens = Math.max(lastTokens, Math.max(0, completedUsage.completionTokens));
                      }
                      if (typeof completedUsage.cachedTokens === "number" && Number.isFinite(completedUsage.cachedTokens)) {
                        lastCachedTokens = Math.max(0, completedUsage.cachedTokens);
                      }
                    }
                  },
                  onError: () => {},
                  onApiCallStarted: () => {
                    apiCallStarted = true;
                  },
                  skillId: request.skillId,
                  requestId,
                  ...(request.sessionId ? { sessionId: request.sessionId } : {}),
                },
              );

              for await (const chunk of gen) {
                if (abortController.signal.aborted) {
                  if (apiCallStarted) {
                    recordUsage({
                      promptTokens: lastPromptTokens,
                      completionTokens: lastTokens,
                      totalTokens: lastPromptTokens + lastTokens,
                      cachedTokens: lastCachedTokens,
                    });
                  }
                  taskStates.set(requestId, "killed");
                  yield makeEvent("aborted", requestId, { reason: "abort-during-ai" });
                  return;
                }

                fullText += chunk.delta;
                lastTokens = chunk.accumulatedTokens;
                if (chunk.finishReason !== null) {
                  streamFinishReason = chunk.finishReason;
                }
                yield makeEvent("ai-chunk", requestId, {
                  delta: chunk.delta,
                  accumulatedTokens: chunk.accumulatedTokens,
                });
              }
              lastFinishReason = streamFinishReason;
            } else {
              throw new Error("No AI execution path available");
            }

            aiSuccess = true;
          } catch (err: unknown) {
            aiError = err;
            const errObj = err as Record<string, unknown>;
            const isAbortError =
              errObj?.kind === "aborted" ||
              (err instanceof Error && err.name === "AbortError");

            if (isAbortError) {
              if (apiCallStarted) {
                recordUsage({
                  promptTokens: lastPromptTokens,
                  completionTokens: lastTokens,
                  totalTokens: lastPromptTokens + lastTokens,
                  cachedTokens: lastCachedTokens,
                });
              }
              taskStates.set(requestId, "killed");
              yield makeEvent("aborted", requestId, { reason: "abort-during-ai" });
              return;
            }

            if (errObj?.kind === "partial-result") {
              if (apiCallStarted) {
                recordUsage({
                  promptTokens: lastPromptTokens,
                  completionTokens: lastTokens,
                  totalTokens: lastPromptTokens + lastTokens,
                  cachedTokens: lastCachedTokens,
                });
              }
              const partialContent =
                fullText.length > 0
                  ? fullText
                  : typeof errObj.partialContent === "string"
                    ? errObj.partialContent
                    : undefined;
              yield makeFailureEvent({
                requestId,
                code: "PARTIAL_RESULT",
                message:
                  typeof errObj.message === "string"
                    ? errObj.message
                    : "Stream interrupted with partial result",
                details: {
                  kind: "partial-result",
                  ...(partialContent ? { partialContent } : {}),
                },
              });
              return;
            }

            if (errObj?.kind === "non-retryable") {
              break;
            }

            if (errObj?.kind === "retryable") {
              const retryCount = (errObj.retryCount as number) ?? 0;
              if (retryCount >= MAX_AI_RETRIES) break;
              aiAttempt++;
              continue;
            }

            break;
          }
        }

        if (!aiSuccess) {
          const message =
            aiError instanceof Error
              ? aiError.message
              : typeof (aiError as { message?: unknown } | null)?.message === "string"
                ? (aiError as { message: string }).message
                : String(aiError);
          yield makeFailureEvent({
            requestId,
            code: "AI_SERVICE_ERROR",
            message,
          });
          return;
        }

        if (apiCallStarted) {
          recordUsage({
            promptTokens: lastPromptTokens,
            completionTokens: lastTokens,
            totalTokens: lastPromptTokens + lastTokens,
            cachedTokens: lastCachedTokens,
          });
        }

        // Stage 4.5 (P2): Agentic tool-use loop
        // Only runs when request.agenticLoop is true AND toolUseHandler is configured
        // AND the AI returned finishReason === 'tool_use'
        if (request.agenticLoop && config.toolUseHandler && config.generateText) {
          let agenticRound = 0;
          let agenticMessages: Array<{ role: string; content: string; toolCallId?: string }> | undefined;

          while (lastFinishReason === "tool_use" && agenticRound < AGENTIC_MAX_ROUNDS) {
            agenticRound++;

            // Parse tool calls (may fail with TOOL_USE_PARSE_FAILED)
            let parsedCalls;
            try {
              parsedCalls = config.toolUseHandler.parseToolCalls(lastToolCalls);
            } catch (parseErr: unknown) {
              const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
              yield makeEvent("tool-use-failed", requestId, {
                round: agenticRound,
                error: { code: "TOOL_USE_PARSE_FAILED", message: msg, retryable: false },
              });
              break;
            }

            // Yield tool-use-started
            yield makeEvent("tool-use-started", requestId, {
              round: agenticRound,
              toolNames: parsedCalls.map((c) => c.toolName),
            });

            if (abortController.signal.aborted) {
              taskStates.set(requestId, "killed");
              yield makeEvent("aborted", requestId, { reason: "user-abort" });
              return;
            }

            // Execute tools via the agentic (read-only) registry
            const toolCtx = {
              documentId: request.documentId,
              requestId,
              ...(request.projectId !== undefined ? { projectId: request.projectId } : {}),
            };
            const results = await config.toolUseHandler.executeToolBatch(parsedCalls, toolCtx);

            const summary = config.toolUseHandler.getBatchSummary(results);
            if (summary.allFailed) {
              yield makeEvent("tool-use-failed", requestId, {
                round: agenticRound,
                error: {
                  code: "TOOL_USE_ALL_FAILED",
                  message: "All tool calls in this round failed",
                  retryable: false,
                },
              });
            }

            // Inject tool results into message history
            const baseMsgs = (agenticMessages ??
              preparedWithCompaction.messages) as AgenticMessage[];
            // Append assistant message (partial AI text before tool_use) then tool results
            const msgsWithAssistant: AgenticMessage[] = [
              ...(baseMsgs.map((m) => ({
                role: m.role,
                content: m.content,
                ...(m.toolCallId ? { toolCallId: m.toolCallId } : {}),
                ...(m.toolCalls ? { toolCalls: m.toolCalls } : {}),
              }))),
              {
                role: "assistant" as const,
                content: fullText,
                ...(lastToolCalls.length > 0 ? { toolCalls: lastToolCalls } : {}),
              },
            ];
            agenticMessages = config.toolUseHandler.injectResults(
              msgsWithAssistant,
              results,
            ) as Array<{ role: string; content: string; toolCallId?: string }>;

            if (abortController.signal.aborted) {
              taskStates.set(requestId, "killed");
              yield makeEvent("aborted", requestId, { reason: "user-abort" });
              return;
            }

            const roundBudgetExceeded = checkBudgetGuard();
            if (roundBudgetExceeded) {
              yield roundBudgetExceeded;
              break;
            }

            // Re-call AI with injected messages
            const nextChunkQueue: Array<{ delta: string; accumulatedTokens: number }> = [];
            let nextResult: GeneratedTextResult | undefined;
            let nextError: unknown = null;
            let nextSettled = false;
            let nextNotify: (() => void) | null = null;
            const nextWake = () => {
              const r = nextNotify;
              nextNotify = null;
              r?.();
            };

            const nextGenPromise = config
              .generateText({
                request,
                signal: abortController.signal,
                emitChunk: (delta, accumulatedTokens) => {
                  nextChunkQueue.push({ delta, accumulatedTokens });
                  nextWake();
                },
                messages: agenticMessages,
              })
              .then(
                (r) => { nextResult = r; nextSettled = true; nextWake(); },
                (e: unknown) => { nextError = e; nextSettled = true; nextWake(); },
              );

            let roundFullText = "";
            while (!nextSettled || nextChunkQueue.length > 0) {
              if (abortController.signal.aborted) {
                taskStates.set(requestId, "killed");
                yield makeEvent("aborted", requestId, { reason: "abort-during-ai" });
                return;
              }

              const nextChunk = nextChunkQueue.shift();
              if (nextChunk) {
                roundFullText += nextChunk.delta;
                lastTokens = nextChunk.accumulatedTokens;
                yield makeEvent("ai-chunk", requestId, {
                  delta: nextChunk.delta,
                  accumulatedTokens: nextChunk.accumulatedTokens,
                });
                continue;
              }

              await new Promise<void>((resolve) => {
                const onAbort = () => resolve();
                nextNotify = resolve;
                abortController.signal.addEventListener("abort", onAbort, { once: true });
              });
            }

            await nextGenPromise;
            if (nextError) {
              throw nextError;
            }
            if (!nextResult) {
              throw new Error("generateText completed without result in agentic round");
            }

            fullText = nextResult.fullText || roundFullText;
            lastPromptTokens = nextResult.usage.promptTokens;
            lastTokens = nextResult.usage.completionTokens;
            lastCachedTokens = nextResult.usage.cachedTokens ?? 0;
            lastFinishReason = nextResult.finishReason ?? null;
            lastToolCalls = nextResult.toolCalls ?? [];

            if (apiCallStarted) {
              recordUsage({
                promptTokens: lastPromptTokens,
                completionTokens: lastTokens,
                totalTokens: lastPromptTokens + lastTokens,
                cachedTokens: lastCachedTokens,
              });
            }

            const hasNextRound =
              lastFinishReason === "tool_use" && agenticRound < AGENTIC_MAX_ROUNDS;

            // Yield tool-use-completed
            yield makeEvent("tool-use-completed", requestId, {
              round: agenticRound,
              results: results.map((r) => ({
                callId: r.callId,
                toolName: r.toolName,
                success: r.success,
                durationMs: r.durationMs,
                ...(r.error ? { error: r.error } : {}),
              })),
              hasNextRound,
            });
          }

          // Max rounds exceeded
          if (agenticRound >= AGENTIC_MAX_ROUNDS && lastFinishReason === "tool_use") {
            yield makeEvent("tool-use-failed", requestId, {
              round: agenticRound,
              error: {
                code: "TOOL_USE_MAX_ROUNDS_EXCEEDED",
                message: `Maximum tool rounds (${AGENTIC_MAX_ROUNDS}) exceeded`,
                retryable: false,
              },
            });
          }
        }

        // Stage 5: ai-done
        yield makeEvent("ai-done", requestId, {
          fullText,
          usage: {
            promptTokens: totalPromptTokens,
            completionTokens: totalCompletionTokens,
            totalTokens: totalPromptTokens + totalCompletionTokens,
            ...(totalCachedTokens > 0 ? { cachedTokens: totalCachedTokens } : {}),
          },
        });
        for (const costEvent of pendingCostEvents) {
          yield costEvent;
        }

        if (abortController.signal.aborted) {
          taskStates.set(requestId, "killed");
          yield makeEvent("aborted", requestId, { reason: "user-abort" });
          return;
        }

        let preWriteSnapshotId: string | null = null;
        let aiWritingMarked = false;
        const createPreWriteSnapshot = async (): Promise<WritingEvent | null> => {
          if (preWriteSnapshotId) {
            return null;
          }

          if (config.versionWorkflow && request.projectId) {
            const workflowSnapshot = config.versionWorkflow.createPreWriteSnapshot({
              projectId: request.projectId,
              documentId: request.documentId,
              executionId: requestId,
            });
            if (!workflowSnapshot.ok) {
              return makeFailureEvent({
                requestId,
                code: workflowSnapshot.error.code,
                message: workflowSnapshot.error.message,
                retryable: workflowSnapshot.error.retryable,
                details: workflowSnapshot.error.details,
              });
            }
            preWriteSnapshotId = workflowSnapshot.data.preWriteSnapshotId;
            return null;
          }

          const versionTool = config.toolRegistry.get("versionSnapshot");
          if (!versionTool) {
            return makeFailureEvent({
              requestId,
              code: "VERSION_SNAPSHOT_FAILED",
              message: 'Required tool "versionSnapshot" is not registered',
            });
          }

          const snapshotResult = await versionTool.execute({
            projectId: request.projectId,
            documentId: request.documentId,
            requestId,
            actor: "auto",
            reason: "pre-write",
          });
          if (!snapshotResult.success) {
            return makeFailureEvent({
              requestId,
              code: snapshotResult.error?.code ?? "VERSION_SNAPSHOT_FAILED",
              message:
                snapshotResult.error?.message ??
                "Pre-write snapshot failed before document write",
              retryable: snapshotResult.error?.retryable,
              details: snapshotResult.error?.details,
            });
          }
          const versionId = readVersionId(snapshotResult.data);
          if (!versionId) {
            return makeFailureEvent({
              requestId,
              code: "VERSION_SNAPSHOT_FAILED",
              message: "Pre-write snapshot did not return versionId",
            });
          }
          preWriteSnapshotId = versionId;
          return null;
        };
        const markAiWritingStage = (): WritingEvent | null => {
          if (!config.versionWorkflow || aiWritingMarked) {
            return null;
          }
          const writing = config.versionWorkflow.markAiWriting(requestId);
          if (!writing.ok) {
            return makeFailureEvent({
              requestId,
              code: writing.error.code,
              message: writing.error.message,
              retryable: writing.error.retryable,
              details: writing.error.details,
            });
          }
          aiWritingMarked = true;
          return null;
        };

        // Stage 6: Permission gate (SINGLE AUTHORITY — INV-1)
        // This is the ONLY enforcement point for permission policy.
        // The IPC layer resolves the raw permission level from the skill
        // manifest but does NOT override or enforce it — that is our job.
        // auto-allow is intentionally escalated to preview-confirm for write-back operations.
        const evalResult = config.permissionGate.evaluate
          ? await config.permissionGate.evaluate(request)
          : { level: "preview-confirm", granted: false };
        const rawPermissionLevel = normalizeLevel(evalResult.level ?? request.level);
        const permissionLevel: PermissionLevel =
          rawPermissionLevel === "auto-allow"
            ? "preview-confirm"
            : rawPermissionLevel;

        const snapshotError = await createPreWriteSnapshot();
        if (snapshotError) {
          yield snapshotError;
          return;
        }

        const permissionRequest: PermissionRequest = {
          requestId,
          level: permissionLevel,
          description: "Operation requires user confirmation",
          preview: buildDiffPreview(request, fullText),
          ...(permissionLevel === "budget-confirm"
            ? { estimatedTokenCost: totalPromptTokens + totalCompletionTokens }
            : {}),
        };

        // Need explicit permission
        taskStates.set(requestId, "paused");

        yield makeEvent("permission-requested", requestId, {
          level: permissionLevel,
          description: permissionRequest.description,
        });

        let granted = false;
        try {
          granted = await config.permissionGate.requestPermission(permissionRequest);
        } catch (error) {
          config.permissionGate.releasePendingPermission(requestId);
          yield makeFailureEvent({
            requestId,
            code: "PERMISSION_IPC_ERROR",
            message: "Permission confirmation IPC failed",
            details: error,
          });
          return;
        }

        taskStates.set(requestId, "running");

        if (abortController.signal.aborted) {
          taskStates.set(requestId, "killed");
          yield makeEvent("aborted", requestId, { reason: "user-abort" });
          return;
        }

        if (!granted) {
          taskStates.set(requestId, "killed");
          pruneTaskStates();
          yield makeEvent("permission-denied", requestId);
          return;
        }

        yield makeEvent("permission-granted", requestId);

        if (abortController.signal.aborted) {
          taskStates.set(requestId, "killed");
          yield makeEvent("aborted", requestId, { reason: "user-abort" });
          return;
        }

        if (!preWriteSnapshotId) {
          const snapshotError = await createPreWriteSnapshot();
          if (snapshotError) {
            yield snapshotError;
            return;
          }
        }
        const markError = markAiWritingStage();
        if (markError) {
          yield markError;
          return;
        }

        // ── Stage 7: Write-back (CANONICAL PATH — INV-1) ──────────────────
        // This is the ONLY location in the entire codebase that executes
        // AI-generated content write-back to a document.  The sequence is:
        //   1. Pre-write snapshot (above) — ensures rollback is possible
        //   2. Permission gate (Stage 6)  — user must approve the write
        //   3. documentWrite tool (below) — performs the actual DB save
        //   4. confirmCommit              — finalises the version record
        //
        // No other module (IPC layer, renderer, etc.) may perform document
        // writes on behalf of AI output.  See Issue #109 for context.
        const writeTool = config.toolRegistry.get("documentWrite");
        if (!writeTool) {
          yield makeFailureEvent({
            requestId,
            code: "WRITE_BACK_FAILED",
            message: 'Required tool "documentWrite" is not registered',
          });
          return;
        }
        const writeResult = await writeTool.execute({
          projectId: request.projectId,
          documentId: request.documentId,
          requestId,
          content: fullText,
          cursorPosition: request.cursorPosition,
          selection: request.selection,
        });
        if (!writeResult.success) {
          yield makeFailureEvent({
            requestId,
            code: writeResult.error?.code ?? "WRITE_BACK_FAILED",
            message:
              writeResult.error?.message ??
              "Document write-back failed after permission grant",
            retryable: writeResult.error?.retryable,
            details: writeResult.error?.details,
          });
          return;
        }
        const versionId = readVersionId(writeResult.data);
        if (!versionId) {
          yield makeFailureEvent({
            requestId,
            code: "WRITE_BACK_FAILED",
            message: "Document write-back did not return versionId",
          });
          return;
        }

        if (config.versionWorkflow && request.projectId) {
          const confirmed = config.versionWorkflow.confirmCommit({
            executionId: requestId,
            projectId: request.projectId,
          });
          if (!confirmed.ok) {
            yield makeFailureEvent({
              requestId,
              code: confirmed.error.code,
              message: confirmed.error.message,
              retryable: confirmed.error.retryable,
              details: confirmed.error.details,
            });
            return;
          }
        }

        yield makeEvent("write-back-done", requestId, { versionId });

        // Stage 8: Post-writing hooks
        const executedHooks: string[] = [];
        for (const hook of config.postWritingHooks) {
          if (hook.enabled === false) continue;
          try {
            await hook.execute({ requestId, documentId: request.documentId, fullText });
            executedHooks.push(hook.name);
          } catch {
            executedHooks.push(hook.name);
            // Hook failure doesn't fail pipeline
          }
        }

        yield makeEvent("hooks-done", requestId, { executed: executedHooks });

        taskStates.set(requestId, "completed");
        pruneTaskStates();
      } catch (error) {
        taskStates.set(requestId, "failed");
        const errObj = error as Record<string, unknown>;
        const errCode =
          typeof errObj?.code === "string" && errObj.code.length > 0
            ? errObj.code
            : "INTERNAL";
        const errDetails = errObj?.details;
        yield makeEvent("error", requestId, {
          error: {
            code: errCode,
            message: error instanceof Error ? error.message : String(error),
            retryable: false,
            ...(errDetails !== undefined ? { details: errDetails } : {}),
          },
        });
      } finally {
        config.versionWorkflow?.cancelCommit(requestId);
        abortControllers.delete(requestId);
      }
      })();
    },

    abort(requestId: string): void {
      const controller = abortControllers.get(requestId);
      if (controller) {
        controller.abort();
        config.permissionGate.releasePendingPermission(requestId);
      }
    },

    getTaskState(requestId: string): TaskState {
      return taskStates.get(requestId) ?? "pending";
    },

    dispose(): void {
      for (const [requestId, controller] of abortControllers) {
        controller.abort();
        config.permissionGate.releasePendingPermission(requestId);
      }
      abortControllers.clear();
      taskStates.clear();
    },
  };
}
