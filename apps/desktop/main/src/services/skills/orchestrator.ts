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
import type { StreamChunk } from "../ai/streaming";

// ── Types ──────────────────────────────────────────────────────────

export interface WritingRequest {
  requestId: string;
  skillId: string;
  /** Optional model identifier forwarded to the AI adapter. */
  model?: string;
  input: { selectedText?: string; precedingText?: string; followingText?: string; [key: string]: unknown };
  documentId: string;
  /** Optional project ID required by tools that need document-service access. */
  projectId?: string;
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
    messages: Array<{ role: string; content: string }>,
    options: { signal: AbortSignal; onComplete: (r: unknown) => void; onError: (e: unknown) => void },
  ): AsyncGenerator<StreamChunk>;
  estimateTokens(text: string): number;
  abort(): void;
}

interface PermissionGate {
  evaluate(request: unknown): Promise<{ level: string; granted: boolean }>;
  requestPermission(request: unknown): Promise<boolean>;
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
        if (!VALID_SKILL_IDS.includes(request.skillId)) {
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
        const tokenCount = config.aiService.estimateTokens(request.input.selectedText ?? "");
        yield makeEvent("context-assembled", requestId, { tokenCount });

        if (abortController.signal.aborted) {
          taskStates.set(requestId, "killed");
          yield makeEvent("aborted", requestId, { reason: "user-abort" });
          return;
        }

        // Stage 3: model-selected
        yield makeEvent("model-selected", requestId, { modelId: "default" });

        if (abortController.signal.aborted) {
          taskStates.set(requestId, "killed");
          yield makeEvent("aborted", requestId, { reason: "user-abort" });
          return;
        }

        // Stage 4: AI streaming
        let fullText = "";
        let lastTokens = 0;
        let aiError: unknown = null;
        const MAX_AI_RETRIES = 2;
        let aiAttempt = 0;
        let aiSuccess = false;

        while (aiAttempt <= MAX_AI_RETRIES && !aiSuccess) {
          try {
            const gen = config.aiService.streamChat(
              [{ role: "user", content: request.input.selectedText ?? "" }],
              {
                signal: abortController.signal,
                onComplete: () => {},
                onError: () => {},
              },
            );

            fullText = "";
            lastTokens = 0;

            for await (const chunk of gen) {
              if (abortController.signal.aborted) {
                taskStates.set(requestId, "killed");
                yield makeEvent("aborted", requestId, { reason: "abort-during-ai" });
                config.aiService.abort();
                return;
              }

              fullText += chunk.delta;
              lastTokens = chunk.accumulatedTokens;
              yield makeEvent("ai-chunk", requestId, {
                delta: chunk.delta,
                accumulatedTokens: chunk.accumulatedTokens,
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
              if (retryCount >= MAX_AI_RETRIES) break;
              aiAttempt++;
              continue;
            }

            break;
          }
        }

        if (!aiSuccess) {
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

        // Stage 5: ai-done
        yield makeEvent("ai-done", requestId, {
          fullText,
          usage: {
            promptTokens: tokenCount,
            completionTokens: lastTokens,
            totalTokens: tokenCount + lastTokens,
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

          // Start timeout BEFORE yielding so fake timers can advance it
          let timeoutId: ReturnType<typeof setTimeout>;
          const timeoutPromise = new Promise<boolean>((resolve) => {
            timeoutId = setTimeout(() => resolve(false), PERMISSION_TIMEOUT_MS);
          });

          yield makeEvent("permission-requested", requestId, {
            level: evalResult.level,
            description: "Operation requires user confirmation",
          });

          // Wait for permission with already-registered timeout
          let granted: boolean;
          try {
            granted = await Promise.race([
              config.permissionGate.requestPermission(request),
              timeoutPromise,
            ]);
          } catch {
            granted = false;
          } finally {
            clearTimeout(timeoutId!);
          }

          taskStates.set(requestId, "running");

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

        // Stage 7: Write-back (snapshot original BEFORE write, then write AI result)
        // P1 manuscript protection: the pre-write snapshot is what users roll back to.
        const preWriteTool = config.toolRegistry.get("preWriteSnapshot");
        let preWriteSnapshotId = "unknown";
        if (preWriteTool) {
          const preResult = await preWriteTool.execute({
            documentId: request.documentId,
            projectId: request.projectId,
            requestId,
          });
          if (preResult.success && preResult.data) {
            preWriteSnapshotId =
              (preResult.data as Record<string, string>).snapshotId ?? "unknown";
          }
        }

        const writeTool = config.toolRegistry.get("documentWrite");
        if (writeTool) {
          await writeTool.execute({
            documentId: request.documentId,
            projectId: request.projectId,
            content: fullText,
            requestId,
          });
        }

        const versionTool = config.toolRegistry.get("versionSnapshot");
        let versionId = "unknown";
        if (versionTool) {
          const result = await versionTool.execute({
            documentId: request.documentId,
            projectId: request.projectId,
            requestId,
          });
          if (result.success && result.data) {
            versionId = (result.data as Record<string, string>).snapshotId ?? "unknown";
          }
        }

        yield makeEvent("write-back-done", requestId, {
          versionId,
          preWriteSnapshotId,
        });

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
      } catch {
        taskStates.set(requestId, "failed");
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
      }
    },

    getTaskState(requestId: string): TaskState {
      return taskStates.get(requestId) ?? "pending";
    },

    dispose(): void {
      for (const [, controller] of abortControllers) {
        controller.abort();
      }
      abortControllers.clear();
      taskStates.clear();
    },
  };
}
