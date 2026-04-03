/**
 * WritingOrchestrator — 9 阶段写作管线
 *
 * intent-resolved → context-assembled → model-selected → ai-chunk* →
 * ai-done → permission-requested → permission-granted/denied →
 * write-back-done → hooks-done
 *
 * 权限门禁、120s 权限超时、Post-Writing Hooks、任务状态机
 */

import type { ToolRegistry } from "./toolRegistry";
import type {
  ChatMessage,
  ChatToolDefinition,
  StreamChunk,
  StreamOptions,
  StreamResult,
} from "../ai/streaming";
import {
  createToolUseHandler,
  type ToolUseConfig,
} from "./toolUseHandler";

// ── Types ──────────────────────────────────────────────────────────

export interface WritingRequest {
  requestId: string;
  skillId: string;
  input: { selectedText?: string; precedingText?: string; followingText?: string; [key: string]: unknown };
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
}

export type WritingEventType =
  | "intent-resolved"
  | "context-assembled"
  | "model-selected"
  | "ai-chunk"
  | "ai-done"
  | "warning"
  | "tool-use-started"
  | "tool-use-completed"
  | "tool-use-failed"
  | "permission-requested"
  | "permission-granted"
  | "permission-denied"
  | "write-back-done"
  | "hooks-done"
  | "aborted"
  | "error";

export type WritingEvent = {
  type: WritingEventType;
  timestamp: number;
  requestId: string;
  [key: string]: unknown;
};

type TaskState = "pending" | "running" | "paused" | "completed" | "failed" | "killed";

interface AIService {
  streamChat(
    messages: ChatMessage[],
    options: StreamOptions,
  ): AsyncGenerator<StreamChunk>;
  estimateTokens(text: string): number;
  abort(): void;
}

interface PreparedRequest {
  messages: ChatMessage[];
  tokenCount: number;
  modelId: string;
}

type GeneratedTextResult = {
  fullText: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
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

interface PermissionGate {
  evaluate(request: unknown): Promise<{ level: string; granted: boolean }>;
  requestPermission(request: unknown): Promise<boolean>;
  releasePendingPermission(requestId: string): void;
}

interface PostWritingHook {
  name: string;
  enabled?: boolean;
  execute(context: unknown): Promise<void>;
}

export interface OrchestratorConfig {
  aiService: AIService;
  toolRegistry: ToolRegistry;
  agenticToolRegistry?: ToolRegistry;
  permissionGate: PermissionGate;
  postWritingHooks: PostWritingHook[];
  defaultTimeoutMs: number;
  prepareRequest?: (request: WritingRequest) => Promise<PreparedRequest>;
  resolveToolUseConfig?: (request: WritingRequest) => ToolUseConfig | null;
  generateText?: (args: {
    request: WritingRequest;
    signal: AbortSignal;
    emitChunk: (delta: string, accumulatedTokens: number) => void;
  }) => Promise<{
    fullText: string;
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  }>;
}

export interface WritingOrchestrator {
  execute(request: WritingRequest): AsyncGenerator<WritingEvent>;
  abort(requestId: string): void;
  getTaskState(requestId: string): TaskState;
  dispose(): void;
}

const VALID_SKILL_IDS = ["polish", "expand", "summarize", "translate", "rewrite", "continue"];
const PERMISSION_TIMEOUT_MS = 120_000;
const MAX_TASK_ENTRIES = 1000;

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

function leafSkillId(skillId: string): string {
  const parts = skillId.split(":");
  return parts[parts.length - 1] ?? skillId;
}

function resolveDefaultToolUseConfig(
  request: WritingRequest,
): ToolUseConfig | null {
  if (leafSkillId(request.skillId) !== "continue") {
    return null;
  }
  return {
    maxToolRounds: 5,
    toolTimeoutMs: 10_000,
    maxConcurrentTools: 4,
    agenticLoop: true,
  };
}

function toAgenticToolDefinitions(
  registry: ToolRegistry | undefined,
): ChatToolDefinition[] {
  if (!registry) {
    return [];
  }
  return registry.list().map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: "object",
      additionalProperties: true,
    },
  }));
}

function appendAssistantMessage(
  messages: ChatMessage[],
  result: StreamResult,
): ChatMessage[] {
  return [
    ...messages,
    {
      role: "assistant",
      content: result.content,
      ...(Array.isArray(result.toolCalls) && result.toolCalls.length > 0
        ? { toolCalls: result.toolCalls }
        : {}),
    },
  ];
}

function normalizeUsage(args: {
  result: StreamResult;
  estimateTokens: (text: string) => number;
  messages: ChatMessage[];
}): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  const promptTokens =
    typeof args.result.usage?.promptTokens === "number"
      ? args.result.usage.promptTokens
      : args.estimateTokens(args.messages.map((message) => message.content).join("\n\n"));
  const completionTokens =
    typeof args.result.usage?.completionTokens === "number"
      ? args.result.usage.completionTokens
      : args.estimateTokens(args.result.content);
  const totalTokens =
    typeof args.result.usage?.totalTokens === "number"
      ? args.result.usage.totalTokens
      : promptTokens + completionTokens;
  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
}

async function* executeAiRound(args: {
  config: OrchestratorConfig;
  request: WritingRequest;
  messages: ChatMessage[];
  modelId: string;
  signal: AbortSignal;
  tools?: ChatToolDefinition[];
}): AsyncGenerator<StreamChunk, StreamResult, void> {
  if (args.config.generateText) {
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
    const generationPromise = args.config
      .generateText({
        request: args.request,
        signal: args.signal,
        emitChunk: (delta, accumulatedTokens) => {
          chunkQueue.push({ delta, accumulatedTokens });
          wake();
        },
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
      if (args.signal.aborted) {
        return {
          content: "",
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          },
          wasRetried: false,
          finishReason: null,
          messages: args.messages,
        };
      }

      const nextChunk = chunkQueue.shift();
      if (nextChunk) {
        yield {
          delta: nextChunk.delta,
          finishReason: null,
          accumulatedTokens: nextChunk.accumulatedTokens,
        };
        continue;
      }

      await new Promise<void>((resolve) => {
        const onAbort = () => resolve();
        notifyChange = resolve;
        args.signal.addEventListener("abort", onAbort, { once: true });
      });
    }

    await generationPromise;
    if (generatedError) {
      throw generatedError;
    }
    if (!generatedResult) {
      throw new Error("generateText completed without result");
    }

    return {
      content: generatedResult.fullText,
      usage: generatedResult.usage,
      wasRetried: false,
      finishReason: "stop",
      messages: appendAssistantMessage(args.messages, {
        content: generatedResult.fullText,
        usage: generatedResult.usage,
        wasRetried: false,
      }),
    };
  }

  let completionResult: StreamResult | null = null;
  let content = "";
  let lastTokens = 0;
  let finishReason: "stop" | "tool_use" | null = null;

  const gen = args.config.aiService.streamChat(args.messages, {
    signal: args.signal,
    modelId: args.modelId,
    ...(args.tools ? { tools: args.tools } : {}),
    onComplete: (result) => {
      completionResult = result;
    },
    onError: () => {},
  });

  for await (const chunk of gen) {
    content += chunk.delta;
    lastTokens = chunk.accumulatedTokens;
    if (chunk.finishReason !== null) {
      finishReason = chunk.finishReason;
    }
    yield chunk;
  }

  if (completionResult) {
    const completedResult = completionResult as StreamResult;
    return {
      ...completedResult,
      finishReason:
        completedResult.finishReason
        ?? (Array.isArray(completedResult.toolCalls) && completedResult.toolCalls.length > 0
          ? "tool_use"
          : finishReason ?? "stop"),
      messages: completedResult.messages ?? appendAssistantMessage(
        args.messages,
        completedResult,
      ),
    };
  }

  const promptTokens = args.config.aiService.estimateTokens(
    args.messages.map((message) => message.content).join("\n\n"),
  );
  const fallbackResult: StreamResult = {
    content,
    usage: {
      promptTokens,
      completionTokens: lastTokens,
      totalTokens: promptTokens + lastTokens,
    },
    wasRetried: false,
    finishReason: finishReason ?? "stop",
    messages: appendAssistantMessage(args.messages, {
      content,
      usage: {
        promptTokens,
        completionTokens: lastTokens,
        totalTokens: promptTokens + lastTokens,
      },
      wasRetried: false,
      finishReason: finishReason ?? "stop",
    }),
  };
  return fallbackResult;
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
              ] as ChatMessage[],
              tokenCount: config.aiService.estimateTokens(request.input.selectedText ?? ""),
              modelId: request.modelId ?? "default",
            };
        const tokenCount = prepared.tokenCount;
        yield makeEvent("context-assembled", requestId, { tokenCount });

        if (abortController.signal.aborted) {
          taskStates.set(requestId, "killed");
          yield makeEvent("aborted", requestId, { reason: "user-abort" });
          return;
        }

        // Stage 3: model-selected
        yield makeEvent("model-selected", requestId, { modelId: prepared.modelId });

        if (abortController.signal.aborted) {
          taskStates.set(requestId, "killed");
          yield makeEvent("aborted", requestId, { reason: "user-abort" });
          return;
        }

        // Stage 4: AI streaming + P2 tool-use loop
        let fullText = "";
        let conversationMessages = prepared.messages;
        let aiError: unknown = null;
        let toolRoundCount = 0;
        const aggregateUsage = {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        };
        const MAX_AI_RETRIES = 2;
        const toolUseConfig =
          config.resolveToolUseConfig?.(request)
          ?? resolveDefaultToolUseConfig(request);
        const toolUseHandler =
          toolUseConfig && config.agenticToolRegistry
            ? createToolUseHandler(config.agenticToolRegistry, {
                ...toolUseConfig,
                agenticLoop: true,
              })
            : null;
        const agenticTools =
          toolUseHandler && config.agenticToolRegistry
            ? toAgenticToolDefinitions(config.agenticToolRegistry)
            : undefined;

        while (true) {
          let aiAttempt = 0;
          let aiSuccess = false;
          let roundResult: StreamResult | null = null;

          while (aiAttempt <= MAX_AI_RETRIES && !aiSuccess) {
            try {
              const roundGen = executeAiRound({
                config,
                request,
                messages: conversationMessages,
                modelId: prepared.modelId,
                signal: abortController.signal,
                ...(agenticTools ? { tools: agenticTools } : {}),
              });

              while (true) {
                const nextChunk = await roundGen.next();
                if (nextChunk.done) {
                  roundResult = nextChunk.value;
                  break;
                }

                if (abortController.signal.aborted) {
                  taskStates.set(requestId, "killed");
                  yield makeEvent("aborted", requestId, { reason: "abort-during-ai" });
                  config.aiService.abort();
                  return;
                }

                yield makeEvent("ai-chunk", requestId, {
                  delta: nextChunk.value.delta,
                  accumulatedTokens: nextChunk.value.accumulatedTokens,
                });
              }

              aiSuccess = true;
            } catch (err: unknown) {
              aiError = err;
              const errObj = err as Record<string, unknown>;

              if (errObj?.kind === "non-retryable") {
                break;
              }

              if (errObj?.kind === "retryable") {
                const retryCount = (errObj.retryCount as number) ?? 0;
                if (retryCount >= MAX_AI_RETRIES) {
                  break;
                }
                aiAttempt++;
                continue;
              }

              break;
            }
          }

          if (!aiSuccess || !roundResult) {
            taskStates.set(requestId, "failed");
            yield makeEvent("error", requestId, {
              error: {
                code: "AI_SERVICE_ERROR",
                message: String(aiError),
                retryable: false,
              },
            });
            return;
          }

          if (abortController.signal.aborted) {
            taskStates.set(requestId, "killed");
            yield makeEvent("aborted", requestId, { reason: "abort-during-ai" });
            return;
          }

          const usage = normalizeUsage({
            result: roundResult,
            estimateTokens: config.aiService.estimateTokens,
            messages: conversationMessages,
          });
          aggregateUsage.promptTokens += usage.promptTokens;
          aggregateUsage.completionTokens += usage.completionTokens;
          aggregateUsage.totalTokens += usage.totalTokens;

          fullText = roundResult.content;
          conversationMessages =
            roundResult.messages ?? appendAssistantMessage(conversationMessages, roundResult);

          const finishReason =
            roundResult.finishReason
            ?? (Array.isArray(roundResult.toolCalls) && roundResult.toolCalls.length > 0
              ? "tool_use"
              : "stop");
          const hasToolCalls =
            Array.isArray(roundResult.toolCalls) && roundResult.toolCalls.length > 0;
          const agenticLoopEnabled = Boolean(toolUseHandler && toolUseConfig);

          if (finishReason === "tool_use" && !agenticLoopEnabled) {
            yield makeEvent("warning", requestId, {
              message: "AI 返回 tool_use 但当前 Skill 未启用 Agentic Loop",
            });
            break;
          }

          if (
            finishReason !== "tool_use"
            || !toolUseHandler
            || !toolUseConfig
            || !hasToolCalls
          ) {
            break;
          }
          const toolCalls = roundResult.toolCalls as NonNullable<
            StreamResult["toolCalls"]
          >;

          const nextRound = toolRoundCount + 1;
          if (nextRound > toolUseConfig.maxToolRounds) {
            yield makeEvent("tool-use-failed", requestId, {
              round: nextRound,
              error: {
                code: "TOOL_USE_MAX_ROUNDS_EXCEEDED",
                message: `Maximum tool rounds (${toolUseConfig.maxToolRounds}) exceeded`,
                retryable: false,
              },
            });
            break;
          }

          let parsedCalls;
          try {
            parsedCalls = toolUseHandler.parseToolCalls(toolCalls);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            yield makeEvent("tool-use-failed", requestId, {
              round: nextRound,
              error: {
                code: "TOOL_USE_PARSE_FAILED",
                message,
                retryable: false,
              },
            });
            break;
          }

          yield makeEvent("tool-use-started", requestId, {
            round: nextRound,
            toolNames: parsedCalls.map((call) => call.toolName),
          });

          const results = await toolUseHandler.executeToolBatch(parsedCalls, {
            documentId: request.documentId,
            requestId,
            ...(request.projectId ? { projectId: request.projectId } : {}),
            ...(request.cursorPosition === undefined
              ? {}
              : { cursorPosition: request.cursorPosition }),
            ...(request.selection ? { selection: request.selection } : {}),
          });
          toolRoundCount = nextRound;

          const summary = toolUseHandler.getBatchSummary(results);
          if (summary.allFailed) {
            yield makeEvent("tool-use-failed", requestId, {
              round: nextRound,
              error: {
                code: summary.errorCode ?? "TOOL_USE_ALL_FAILED",
                message: "All requested tools failed or were not eligible",
                retryable: false,
              },
            });
            break;
          }

          yield makeEvent("tool-use-completed", requestId, {
            round: nextRound,
            results: results.map((result) => ({
              toolName: result.toolName,
              success: result.success,
              durationMs: result.durationMs,
            })),
            hasNextRound: true,
          });

          conversationMessages = toolUseHandler.injectResults(
            conversationMessages,
            results,
          );
        }

        // Stage 5: ai-done
        yield makeEvent("ai-done", requestId, {
          fullText,
          usage: aggregateUsage.totalTokens > 0
            ? aggregateUsage
            : {
                promptTokens: tokenCount,
                completionTokens: 0,
                totalTokens: tokenCount,
              },
        });

        if (abortController.signal.aborted) {
          taskStates.set(requestId, "killed");
          yield makeEvent("aborted", requestId, { reason: "user-abort" });
          return;
        }

        // Stage 6: Permission gate
        const evalResult = await config.permissionGate.evaluate(request);

        if (evalResult.level === "auto-allow") {
          // Auto-allow: skip permission stage entirely, proceed to write-back
        } else {
          // Need explicit permission
          taskStates.set(requestId, "paused");

          let timeoutId: ReturnType<typeof setTimeout> | undefined;
          let removeAbortListener: (() => void) | undefined;
          const permissionDecision = Promise.race<boolean>([
            config.permissionGate.requestPermission(request).catch(() => false),
            new Promise<boolean>((resolve) => {
              timeoutId = setTimeout(() => resolve(false), PERMISSION_TIMEOUT_MS);
            }),
            new Promise<boolean>((resolve) => {
              const handleAbort = () => resolve(false);
              abortController.signal.addEventListener("abort", handleAbort, {
                once: true,
              });
              removeAbortListener = () => {
                abortController.signal.removeEventListener("abort", handleAbort);
              };
            }),
          ]);

          yield makeEvent("permission-requested", requestId, {
            level: evalResult.level,
            description: "Operation requires user confirmation",
          });

          let granted: boolean;
          try {
            granted = await permissionDecision;
          } catch {
            granted = false;
          } finally {
            if (timeoutId !== undefined) {
              clearTimeout(timeoutId);
            }
            removeAbortListener?.();
            config.permissionGate.releasePendingPermission(requestId);
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
        }

        if (abortController.signal.aborted) {
          taskStates.set(requestId, "killed");
          yield makeEvent("aborted", requestId, { reason: "user-abort" });
          return;
        }

        const versionTool = config.toolRegistry.get("versionSnapshot");
        if (!versionTool) {
          yield makeFailureEvent({
            requestId,
            code: "VERSION_SNAPSHOT_FAILED",
            message: 'Required tool "versionSnapshot" is not registered',
          });
          return;
        }
        const snapshotResult = await versionTool.execute({
          projectId: request.projectId,
          documentId: request.documentId,
          requestId,
          actor: "auto",
          reason: "pre-write",
        });
        if (!snapshotResult.success) {
          yield makeFailureEvent({
            requestId,
            code: snapshotResult.error?.code ?? "VERSION_SNAPSHOT_FAILED",
            message:
              snapshotResult.error?.message ??
              "Pre-write snapshot failed before document write",
            retryable: snapshotResult.error?.retryable,
            details: snapshotResult.error?.details,
          });
          return;
        }
        if (!readVersionId(snapshotResult.data)) {
          yield makeFailureEvent({
            requestId,
            code: "VERSION_SNAPSHOT_FAILED",
            message: "Pre-write snapshot did not return versionId",
          });
          return;
        }

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
        abortControllers.delete(requestId);
      }
      })();
    },

    abort(requestId: string): void {
      const controller = abortControllers.get(requestId);
      if (controller) {
        controller.abort();
        config.aiService.abort();
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
