import { ipcRenderer } from "electron";

import {
  CONTEXT_COMPACT_CIRCUIT_BREAKER_CHANNEL,
  SKILL_QUEUE_STATUS_CHANNEL,
  SKILL_STREAM_CHUNK_CHANNEL,
  SKILL_STREAM_DONE_CHANNEL,
  SKILL_TOOL_USE_CHANNEL,
  type AiStreamEvent,
  type ContextCompactCircuitBreakerEvent,
  type SkillToolUseEvent,
} from "@shared/types/ai";
import {
  JUDGE_RESULT_CHANNEL,
  type JudgeResultEvent,
} from "@shared/types/judge";
import type { IpcResponse } from "@shared/types/ipc-generated";
import { COST_ALERT_CHANNEL, type CostAlertEvent } from "@shared/types/cost";
import { createAiStreamSubscriptionRegistry } from "./aiStreamSubscriptions";

type UnknownRecord = Record<string, unknown>;

/**
 * Narrow an unknown value to a record.
 */
function isRecord(x: unknown): x is UnknownRecord {
  return typeof x === "object" && x !== null;
}

/**
 * Best-effort runtime validation for stream payload.
 *
 * Why: preload must never crash on malformed IPC events.
 */
function isAiStreamEvent(x: unknown): x is AiStreamEvent {
  if (!isRecord(x)) {
    return false;
  }
  if (
    (x.type !== "chunk" && x.type !== "done" && x.type !== "queue") ||
    typeof x.executionId !== "string" ||
    typeof x.runId !== "string" ||
    typeof x.traceId !== "string" ||
    typeof x.ts !== "number"
  ) {
    return false;
  }

  if (x.type === "chunk") {
    return typeof x.seq === "number" && typeof x.chunk === "string";
  }

  if (x.type === "queue") {
    return (
      (x.status === "queued" ||
        x.status === "started" ||
        x.status === "completed" ||
        x.status === "failed" ||
        x.status === "cancelled" ||
        x.status === "timeout") &&
      typeof x.queuePosition === "number" &&
      typeof x.queued === "number" &&
      typeof x.globalRunning === "number"
    );
  }

  return (
    (x.terminal === "completed" ||
      x.terminal === "cancelled" ||
      x.terminal === "error") &&
    typeof x.outputText === "string"
  );
}

function isSkillToolUseEvent(x: unknown): x is SkillToolUseEvent {
  if (!isRecord(x)) {
    return false;
  }
  if (
    (x.type !== "tool-use-started" &&
      x.type !== "tool-use-completed" &&
      x.type !== "tool-use-failed") ||
    typeof x.executionId !== "string" ||
    typeof x.runId !== "string" ||
    typeof x.round !== "number" ||
    typeof x.ts !== "number"
  ) {
    return false;
  }

  if (x.type === "tool-use-started") {
    return Array.isArray(x.toolNames) && x.toolNames.every((item) => typeof item === "string");
  }

  if (x.type === "tool-use-completed") {
    return (
      Array.isArray(x.results) &&
      x.results.every(
        (item) =>
          isRecord(item) &&
          typeof item.callId === "string" &&
          typeof item.toolName === "string" &&
          typeof item.success === "boolean" &&
          typeof item.durationMs === "number",
      ) &&
      typeof x.hasNextRound === "boolean"
    );
  }

  return (
    isRecord(x.error) &&
    typeof x.error.code === "string" &&
    typeof x.error.message === "string" &&
    typeof x.error.retryable === "boolean"
  );
}

/**
 * Best-effort runtime validation for judge result push payload.
 *
 * Why: malformed push payloads must be ignored safely in preload.
 */
function isJudgeResultEvent(x: unknown): x is JudgeResultEvent {
  if (!isRecord(x)) {
    return false;
  }

  const severity = x.severity;
  if (severity !== "high" && severity !== "medium" && severity !== "low") {
    return false;
  }

  return (
    typeof x.projectId === "string" &&
    typeof x.traceId === "string" &&
    Array.isArray(x.labels) &&
    x.labels.every((item) => typeof item === "string") &&
    typeof x.summary === "string" &&
    typeof x.partialChecksSkipped === "boolean" &&
    typeof x.ts === "number"
  );
}

function isCostAlertEvent(x: unknown): x is CostAlertEvent {
  if (!isRecord(x)) {
    return false;
  }

  return (
    (x.kind === "warning" || x.kind === "hard-stop") &&
    typeof x.currentCost === "number" &&
    typeof x.threshold === "number" &&
    typeof x.message === "string" &&
    typeof x.timestamp === "number"
  );
}

function isContextCompactCircuitBreakerEvent(
  x: unknown,
): x is ContextCompactCircuitBreakerEvent {
  if (!isRecord(x)) {
    return false;
  }

  return (
    typeof x.open === "boolean" &&
    typeof x.consecutiveFailures === "number" &&
    (x.openedAt === null || typeof x.openedAt === "number") &&
    typeof x.cooldownMs === "number" &&
    (x.reason === "threshold-reached"
      || x.reason === "half-open-probe-failed"
      || x.reason === "half-open-probe-succeeded"
      || x.reason === "manual-reset")
  );
}


export type AiStreamBridgeApi = {
  registerAiStreamConsumer: () => IpcResponse<{ subscriptionId: string }>;
  releaseAiStreamConsumer: (subscriptionId: string) => void;
  dispose: () => void;
};

function resolveRendererId(): string {
  const maybeProcess = (globalThis as { process?: { pid?: number } }).process;
  if (typeof maybeProcess?.pid === "number") {
    return `pid-${maybeProcess.pid}`;
  }

  return "pid-unknown";
}

/**
 * Bridge skill stream IPC events into the renderer via DOM CustomEvent.
 *
 * Why: renderer runs with contextIsolation and cannot subscribe to `ipcRenderer`
 * directly, and we must not expand the preload public API surface.
 */
export function registerAiStreamBridge(): AiStreamBridgeApi {
  const subscriptions = createAiStreamSubscriptionRegistry({
    rendererId: resolveRendererId(),
  });

  function forwardEvent(channel: string, payload: unknown): void {
    if (subscriptions.count() === 0) {
      return;
    }

    if (!isAiStreamEvent(payload)) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<AiStreamEvent>(channel, {
        detail: payload,
      }),
    );
  }

  const onSkillStreamChunk = (_evt: unknown, payload: unknown) => {
    forwardEvent(SKILL_STREAM_CHUNK_CHANNEL, payload);
  };
  const onSkillStreamDone = (_evt: unknown, payload: unknown) => {
    forwardEvent(SKILL_STREAM_DONE_CHANNEL, payload);
  };
  const onSkillQueueStatus = (_evt: unknown, payload: unknown) => {
    forwardEvent(SKILL_QUEUE_STATUS_CHANNEL, payload);
  };
  const onSkillToolUse = (_evt: unknown, payload: unknown) => {
    if (subscriptions.count() === 0) {
      return;
    }
    if (!isSkillToolUseEvent(payload)) {
      return;
    }
    window.dispatchEvent(
      new CustomEvent<SkillToolUseEvent>(SKILL_TOOL_USE_CHANNEL, {
        detail: payload,
      }),
    );
  };
  const onJudgeResult = (_evt: unknown, payload: unknown) => {
    if (subscriptions.count() === 0) {
      return;
    }
    if (!isJudgeResultEvent(payload)) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<JudgeResultEvent>(JUDGE_RESULT_CHANNEL, {
        detail: payload,
      }),
    );
  };
  const onCostAlert = (_evt: unknown, payload: unknown) => {
    if (subscriptions.count() === 0) {
      return;
    }
    if (!isCostAlertEvent(payload)) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<CostAlertEvent>(COST_ALERT_CHANNEL, {
        detail: payload,
      }),
    );
  };
  const onContextCompactCircuitBreaker = (_evt: unknown, payload: unknown) => {
    if (subscriptions.count() === 0) {
      return;
    }
    if (!isContextCompactCircuitBreakerEvent(payload)) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<ContextCompactCircuitBreakerEvent>(
        CONTEXT_COMPACT_CIRCUIT_BREAKER_CHANNEL,
        {
          detail: payload,
        },
      ),
    );
  };

  ipcRenderer.on(SKILL_STREAM_CHUNK_CHANNEL, onSkillStreamChunk);
  ipcRenderer.on(SKILL_STREAM_DONE_CHANNEL, onSkillStreamDone);
  ipcRenderer.on(SKILL_QUEUE_STATUS_CHANNEL, onSkillQueueStatus);
  ipcRenderer.on(SKILL_TOOL_USE_CHANNEL, onSkillToolUse);
  ipcRenderer.on(JUDGE_RESULT_CHANNEL, onJudgeResult);
  ipcRenderer.on(COST_ALERT_CHANNEL, onCostAlert);
  ipcRenderer.on(
    CONTEXT_COMPACT_CIRCUIT_BREAKER_CHANNEL,
    onContextCompactCircuitBreaker,
  );

  return {
    registerAiStreamConsumer: () => subscriptions.register(),
    releaseAiStreamConsumer: (subscriptionId: string) => {
      subscriptions.release(subscriptionId);
    },
    dispose: () => {
      ipcRenderer.removeListener(
        SKILL_STREAM_CHUNK_CHANNEL,
        onSkillStreamChunk,
      );
      ipcRenderer.removeListener(SKILL_STREAM_DONE_CHANNEL, onSkillStreamDone);
      ipcRenderer.removeListener(
        SKILL_QUEUE_STATUS_CHANNEL,
        onSkillQueueStatus,
      );
      ipcRenderer.removeListener(SKILL_TOOL_USE_CHANNEL, onSkillToolUse);
      ipcRenderer.removeListener(JUDGE_RESULT_CHANNEL, onJudgeResult);
      ipcRenderer.removeListener(COST_ALERT_CHANNEL, onCostAlert);
      ipcRenderer.removeListener(
        CONTEXT_COMPACT_CIRCUIT_BREAKER_CHANNEL,
        onContextCompactCircuitBreaker,
      );
    },
  };
}
