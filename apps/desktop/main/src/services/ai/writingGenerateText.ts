/**
 * Factory for the WritingOrchestrator `generateText` strategy.
 *
 * ## Responsibility
 * Creates the `generateText` callback required by `OrchestratorConfig`.
 * This strategy bridges the orchestrator's generic `WritingRequest` to the
 * service-layer `skillExecutor` (first round) or `aiService` (subsequent
 * agentic rounds where accumulated tool-result messages must be forwarded).
 *
 * ## Why a factory in the services layer (not inline in ai.ts)
 * Defining this callback inline inside `registerAiIpcHandlers` would put
 * bare `aiService.runSkill()` calls inside the IPC module, violating
 * INV-7 ("禁止 IPC handler 直调 Service").  Extracting here removes all
 * direct `aiService.runSkill()` calls from `ai.ts`.
 *
 * ## INV references
 * - INV-6 (一切皆 Skill): first-round execution uses skillExecutor, which
 *   enforces the full Schema → 权限 → 执行 → 返回 pipeline
 * - INV-7 (统一入口): IPC module delegates to this factory, no bare runSkill
 * - INV-10 (错误不丢上下文): errors propagate without silent catch
 */

import { nowTs } from "@shared/timeUtils";
import type { AiService } from "./aiService";
import type { SkillExecutor, SkillExecutorRunArgs } from "../skills/skillExecutor";
import type { WritingRequest } from "../skills/orchestrator";
import type { AiTokenUsage } from "@shared/types/ai";
import { estimateTokens } from "../context/tokenEstimation";

type GenerateTextArgs = {
  request: WritingRequest;
  signal: AbortSignal;
  emitChunk: (delta: string, accumulatedTokens: number) => void;
  onApiCallStarted?: () => void;
  messages?: Array<{ role: string; content: string; toolCallId?: string }>;
};

type GenerateTextResult = {
  fullText: string;
  usage: AiTokenUsage;
  finishReason?: "stop" | "tool_use" | null;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
};

type GenerateTextFn = (args: GenerateTextArgs) => Promise<GenerateTextResult>;

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Resolve the effective input string for a WritingRequest input.
 *
 * For document-window skills (continue), the primary input is the
 * cursor-preceding text.  Selection-based skills use selectedText.
 */
function resolveWritingRequestInput(request: {
  skillId: string;
  input: { selectedText?: string; precedingText?: string };
  selection?: { text: string };
}): string {
  const leafId = request.skillId.split(":").at(-1) ?? request.skillId;
  if (leafId === "continue") {
    return request.input.precedingText ?? request.input.selectedText ?? "";
  }
  return request.selection?.text ?? request.input.selectedText ?? "";
}

// ── Factory ─────────────────────────────────────────────────────────────

export type WritingGenerateTextDeps = {
  /** AiService used for agentic rounds 2+ where accumulated messages must be forwarded. */
  aiService: AiService;
  /** SkillExecutor handling first-round execution with full context assembly. */
  skillExecutor: SkillExecutor;
};

/**
 * Creates the `generateText` callback for `OrchestratorConfig`.
 *
 * Two code paths:
 *
 * **F1 – First call (no accumulated messages)**
 * Uses `skillExecutor.execute()` which runs the full Skill pipeline:
 * manifest lookup → context assembly → prompt rendering → AI call.
 * This path is the INV-6-compliant path.
 *
 * **F2 – Subsequent agentic rounds (messages provided)**
 * Bypasses `skillExecutor` because accumulated tool-result messages must
 * be forwarded directly to the AI without re-running context assembly.
 * Calls `aiService.runSkill()` with `overrideMessages` to forward the
 * accumulated message thread.  Cost and abort tracking are handled by the
 * orchestrator's `recordUsage` and abort-controller chain.
 */
export function createWritingGenerateText(deps: WritingGenerateTextDeps): GenerateTextFn {
  const { aiService, skillExecutor } = deps;

  return async ({
    request,
    signal,
    emitChunk,
    onApiCallStarted,
    messages,
  }: GenerateTextArgs): Promise<GenerateTextResult> => {
    let outputText = "";
    let usage: AiTokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
    let capturedFinishReason: "stop" | "tool_use" | undefined;
    let capturedToolCalls:
      | Array<{ id: string; name: string; arguments: Record<string, unknown> }>
      | undefined;
    let sawStreamChunk = false;
    let streamTerminalSeen = false;
    let settleStreamCompletion: (() => void) | null = null;
    let rejectStreamCompletion: ((error: Error) => void) | null = null;
    const streamCompletion = new Promise<void>((resolve, reject) => {
      settleStreamCompletion = resolve;
      rejectStreamCompletion = reject;
    });

    const onDoneEvent = (event: {
      type: "done";
      outputText: string;
      terminal: string;
      error?: { message?: string; code?: string };
      result?: {
        metadata: {
          promptTokens: number;
          completionTokens: number;
          cachedTokens?: number;
        };
      };
      finishReason?: "stop" | "tool_use";
      toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
    }) => {
      if (!sawStreamChunk && event.outputText.length > 0) {
        outputText = event.outputText;
        emitChunk(event.outputText, estimateTokens(event.outputText));
        sawStreamChunk = true;
      } else {
        outputText = event.outputText;
      }
      const promptTokens =
        event.result?.metadata.promptTokens ??
        estimateTokens(resolveWritingRequestInput(request));
      const completionTokens =
        event.result?.metadata.completionTokens ?? estimateTokens(event.outputText);
      usage = {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        cachedTokens: event.result?.metadata.cachedTokens ?? 0,
      };
      if (event.finishReason !== undefined) {
        capturedFinishReason = event.finishReason;
      }
      if (event.toolCalls !== undefined) {
        capturedToolCalls = event.toolCalls;
      }
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
    };

    // F2: subsequent agentic rounds — forward accumulated messages directly.
    // Bypasses skillExecutor because context assembly must not re-run;
    // tool-result messages carry the state that ties the round sequence together.
    if (messages && messages.length > 0) {
      onApiCallStarted?.();
      const res = await aiService.runSkill({
        skillId: request.skillId,
        input: messages[messages.length - 1]?.content ?? "",
        mode: "ask",
        model: request.modelId ?? "default",
        context: {
          projectId: request.projectId,
          documentId: request.documentId,
        },
        stream: true,
        ts: nowTs(),
        overrideMessages: messages,
        emitEvent: (event) => {
          if (signal.aborted) return;
          if (event.type === "chunk") {
            sawStreamChunk = true;
            outputText += event.chunk;
            const accumulatedTokens = estimateTokens(outputText);
            emitChunk(event.chunk, accumulatedTokens);
            return;
          }
          if (event.type === "done") {
            onDoneEvent(event as Parameters<typeof onDoneEvent>[0]);
          }
        },
      });
      if (!res.ok) throw res.error;
      if (!streamTerminalSeen) await streamCompletion;
      if (!sawStreamChunk && (res.data.outputText?.length ?? 0) > 0) {
        const finalOutput = res.data.outputText ?? "";
        outputText = finalOutput;
        emitChunk(finalOutput, estimateTokens(finalOutput));
      }
      return {
        fullText: outputText || res.data.outputText || "",
        usage,
        finishReason: capturedFinishReason,
        toolCalls: capturedToolCalls,
      };
    }

    // F1: first call — use skillExecutor for full context assembly
    let apiStartedFired = false;
    const res = await skillExecutor.execute({
      skillId: request.skillId,
      hasSelection: Boolean(request.selection),
      input: resolveWritingRequestInput(request),
      selectedText:
        request.selection?.text ??
        request.input.selectedText ??
        resolveWritingRequestInput(request),
      ...(request.cursorPosition === undefined
        ? {}
        : { cursorPosition: request.cursorPosition }),
      mode: "ask",
      model: request.modelId ?? "default",
      ...(request.userInstruction === undefined
        ? {}
        : { userInstruction: request.userInstruction }),
      context: {
        projectId: request.projectId,
        documentId: request.documentId,
      },
      ...(messages
        ? { messages: messages as SkillExecutorRunArgs["messages"] }
        : {}),
      stream: true,
      ts: nowTs(),
      emitEvent: (event) => {
        if (!apiStartedFired) {
          apiStartedFired = true;
          onApiCallStarted?.();
        }
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
          onDoneEvent(event as Parameters<typeof onDoneEvent>[0]);
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
      finishReason: capturedFinishReason,
      toolCalls: capturedToolCalls,
    };
  };
}
