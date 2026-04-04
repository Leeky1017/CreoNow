/**
 * ToolUseHandler — Agentic Loop
 *
 * Parses AI tool calls, executes with concurrency/safety partitioning,
 * injects results back into messages, enforces maxToolRounds,
 * maxConcurrentTools, read-only constraints, and event emission.
 */

import type { ToolCallInfo } from "../ai/streaming";
import type {
  AgenticToolContext,
  ToolRegistry,
  ToolContext,
  WritingTool,
} from "./toolRegistry";

// ─── Types ──────────────────────────────────────────────────────────

export interface ParsedToolCall {
  callId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  callId: string;
  toolName: string;
  success: boolean;
  data?: unknown;
  error?: { code: string; message: string };
  durationMs: number;
}

export interface ToolUseConfig {
  maxToolRounds: number;
  toolTimeoutMs: number;
  maxConcurrentTools: number;
  agenticLoop?: boolean;
}

export interface ToolUseRoundState {
  round: number;
  totalRounds: number;
  toolCalls: ParsedToolCall[];
  results: ToolCallResult[];
}

interface BatchSummary {
  allFailed: boolean;
  errorCode?: string;
  shouldContinueLoop: boolean;
}

interface ToolUseError extends Error {
  code: string;
}

function makeError(code: string, message: string): ToolUseError {
  const err = new Error(message) as ToolUseError;
  err.code = code;
  return err;
}

interface ToolMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
}

type EventType =
  | "tool-use-started"
  | "tool-use-completed"
  | "tool-use-failed"
  | "tool-use-warning";

type EventCallback = (event: unknown) => void;

export interface ToolUseHandler {
  parseToolCalls(raw: ToolCallInfo[]): ParsedToolCall[];
  executeToolBatch(
    calls: ParsedToolCall[],
    context: ToolContext,
  ): Promise<ToolCallResult[]>;
  injectResults(
    currentMessages: ToolMessage[],
    results: ToolCallResult[],
  ): ToolMessage[];
  getBatchSummary(results: ToolCallResult[]): BatchSummary;
  getLastRoundState(): ToolUseRoundState;
  on(event: EventType, callback: EventCallback): void;
  off(event: EventType, callback: EventCallback): void;
  dispose(): void;
}

// ─── Implementation ─────────────────────────────────────────────────

export function createToolUseHandler(
  registry: ToolRegistry,
  config: ToolUseConfig,
): ToolUseHandler {
  let currentRound = 0;
  let lastRequestId: string | null = null;
  let lastRoundState: ToolUseRoundState = {
    round: 0,
    totalRounds: 0,
    toolCalls: [],
    results: [],
  };

  const listeners = new Map<EventType, EventCallback[]>();

  function emit(event: EventType, data: unknown): void {
    const cbs = listeners.get(event);
    if (cbs) {
      for (const cb of cbs) {
        try {
          cb(data);
        } catch {
          // Callback errors must not propagate
        }
      }
    }
  }

  async function executeWithTimeout(
    tool: WritingTool,
    ctx: ToolContext,
    timeoutMs: number,
  ): Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }> {
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({
            success: false,
            error: {
              code: "TOOL_USE_TIMEOUT",
              message: `Tool "${tool.name}" timed out after ${timeoutMs}ms`,
            },
          });
        }
      }, timeoutMs);

      try {
        const resultPromise = tool.execute(ctx);
        resultPromise.then(
          (result) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve(result);
            }
          },
          (err: unknown) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              const message =
                err instanceof Error ? err.message : String(err);
              resolve({
                success: false,
                error: { code: "TOOL_USE_EXECUTION_FAILED", message },
              });
            }
          },
        );
      } catch (err: unknown) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          const message =
            err instanceof Error ? err.message : String(err);
          resolve({
            success: false,
            error: { code: "TOOL_USE_BATCH_FAILED", message },
          });
        }
      }
    });
  }

  async function runWithConcurrencyLimit<T>(
    tasks: Array<() => Promise<T>>,
    maxConcurrent: number,
  ): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    let nextIdx = 0;

    async function runNext(): Promise<void> {
      while (nextIdx < tasks.length) {
        const idx = nextIdx++;
        results[idx] = await tasks[idx]();
      }
    }

    const workers = Math.min(maxConcurrent, tasks.length);
    await Promise.all(Array.from({ length: workers }, () => runNext()));
    return results;
  }

  const handler: ToolUseHandler = {
    parseToolCalls(raw: ToolCallInfo[]): ParsedToolCall[] {
      return raw.map((tc) => {
        if (
          tc.arguments === null ||
          tc.arguments === undefined ||
          typeof tc.arguments !== "object" ||
          Array.isArray(tc.arguments)
        ) {
          throw makeError(
            "TOOL_USE_PARSE_FAILED",
            `Tool call "${tc.id}" has invalid arguments`,
          );
        }
        return {
          callId: tc.id,
          toolName: tc.name,
          arguments: tc.arguments as Record<string, unknown>,
        };
      });
    },

    async executeToolBatch(
      calls: ParsedToolCall[],
      context: ToolContext,
    ): Promise<ToolCallResult[]> {
      // Non-agentic mode: discard tool calls
      if (config.agenticLoop === false) {
        emit("tool-use-warning", {
          type: "tool-use-warning",
          timestamp: Date.now(),
          requestId: context.requestId,
          message:
            "Tool calls discarded: agenticLoop is disabled",
          discardedToolNames: calls.map((c) => c.toolName),
        });
        return [];
      }

      // Reset round counter when a new requestId is seen (D16)
      if (lastRequestId !== context.requestId) {
        currentRound = 0;
        lastRequestId = context.requestId;
      }

      currentRound++;

      // Max rounds check
      if (currentRound > config.maxToolRounds) {
        const maxRoundResults: ToolCallResult[] = calls.map((call) => ({
          callId: call.callId,
          toolName: call.toolName,
          success: false,
          error: {
            code: "TOOL_USE_MAX_ROUNDS_EXCEEDED",
            message: `Maximum tool rounds (${config.maxToolRounds}) exceeded at round ${currentRound}`,
          },
          durationMs: 0,
        }));

        lastRoundState = {
          round: currentRound,
          totalRounds: currentRound,
          toolCalls: calls,
          results: maxRoundResults,
        };

        return maxRoundResults;
      }

      emit("tool-use-started", {
        type: "tool-use-started",
        timestamp: Date.now(),
        requestId: context.requestId,
        round: currentRound,
        toolNames: calls.map((c) => c.toolName),
      });

      // Partition into safe (concurrent) and unsafe (serial)
      const safeCalls: Array<{ idx: number; call: ParsedToolCall }> = [];
      const unsafeCalls: Array<{ idx: number; call: ParsedToolCall }> = [];
      const notFoundCalls: Array<{ idx: number; call: ParsedToolCall }> = [];

      for (let i = 0; i < calls.length; i++) {
        const call = calls[i];
        const tool = registry.get(call.toolName);
        if (!tool) {
          notFoundCalls.push({ idx: i, call });
        } else if (tool.isConcurrencySafe) {
          safeCalls.push({ idx: i, call });
        } else {
          unsafeCalls.push({ idx: i, call });
        }
      }

      const results: ToolCallResult[] = new Array(calls.length);

      // Handle not-found tools immediately
      for (const { idx, call } of notFoundCalls) {
        results[idx] = {
          callId: call.callId,
          toolName: call.toolName,
          success: false,
          error: {
            code: "TOOL_USE_TOOL_NOT_FOUND",
            message: `${call.toolName} 未注册`,
          },
          durationMs: 0,
        };

        emit("tool-use-failed", {
          type: "tool-use-failed",
          timestamp: Date.now(),
          requestId: context.requestId,
          round: currentRound,
          error: { code: "TOOL_USE_TOOL_NOT_FOUND", message: `${call.toolName} 未注册`, retryable: false },
        });
      }

      // Execute safe tools concurrently with limit
      if (safeCalls.length > 0) {
        const tasks = safeCalls.map(({ idx, call }) => async () => {
          const tool = registry.get(call.toolName)!;
          const agenticCtx: AgenticToolContext = {
            ...context,
            args: call.arguments,
          };
          const startTime = Date.now();
          const result = await executeWithTimeout(
            tool,
            agenticCtx,
            config.toolTimeoutMs,
          );
          const durationMs = Date.now() - startTime;

          results[idx] = {
            callId: call.callId,
            toolName: call.toolName,
            success: result.success,
            data: result.data,
            error: result.error,
            durationMs,
          };
        });

        await runWithConcurrencyLimit(tasks, config.maxConcurrentTools);
      }

      // Execute unsafe tools serially
      for (const { idx, call } of unsafeCalls) {
        const tool = registry.get(call.toolName)!;
        const agenticCtx: AgenticToolContext = {
          ...context,
            args: call.arguments,
          };
        const startTime = Date.now();
        const result = await executeWithTimeout(
          tool,
          agenticCtx,
          config.toolTimeoutMs,
        );
        const durationMs = Date.now() - startTime;

        results[idx] = {
          callId: call.callId,
          toolName: call.toolName,
          success: result.success,
          data: result.data,
          error: result.error,
          durationMs,
        };
      }

      lastRoundState = {
        round: currentRound,
        totalRounds: currentRound,
        toolCalls: calls,
        results,
      };

      const summary = handler.getBatchSummary(results);

      emit("tool-use-completed", {
        type: "tool-use-completed",
        timestamp: Date.now(),
        requestId: context.requestId,
        round: currentRound,
        results: results.map((result) => ({
          callId: result.callId,
          toolName: result.toolName,
          success: result.success,
          durationMs: result.durationMs,
          ...(result.error ? { error: result.error } : {}),
        })),
        hasNextRound: summary.shouldContinueLoop,
      });

      return results;
    },

    injectResults(
      currentMessages: ToolMessage[],
      results: ToolCallResult[],
    ): ToolMessage[] {
      const updated = [...currentMessages];

      for (const result of results) {
        let content: string;
        if (result.success) {
          content =
            result.data !== null && result.data !== undefined
              ? JSON.stringify(result.data)
              : "{}";
        } else {
          content = JSON.stringify(result.error ?? { code: "UNKNOWN", message: "Unknown error" });
        }

        const toolMsg: ToolMessage = {
          role: "tool",
          content,
          toolCallId: result.callId,
        };
        updated.push(toolMsg);
      }

      return updated;
    },

    getBatchSummary(results: ToolCallResult[]): BatchSummary {
      if (results.length === 0) {
        return { allFailed: false, shouldContinueLoop: false };
      }

      const allFailed = results.every((r) => !r.success);
      return {
        allFailed,
        errorCode: allFailed ? "TOOL_USE_ALL_FAILED" : undefined,
        shouldContinueLoop: !allFailed,
      };
    },

    getLastRoundState(): ToolUseRoundState {
      return lastRoundState;
    },

    on(event: EventType, callback: EventCallback): void {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)!.push(callback);
    },

    off(event: EventType, callback: EventCallback): void {
      const cbs = listeners.get(event);
      if (cbs) {
        const idx = cbs.indexOf(callback);
        if (idx >= 0) cbs.splice(idx, 1);
      }
    },

    dispose(): void {
      listeners.clear();
      currentRound = 0;
      lastRequestId = null;
      lastRoundState = {
        round: 0,
        totalRounds: 0,
        toolCalls: [],
        results: [],
      };
    },
  };

  return handler;
}
