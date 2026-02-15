import { ipcRenderer } from "electron";

import {
  SKILL_QUEUE_STATUS_CHANNEL,
  SKILL_STREAM_CHUNK_CHANNEL,
  SKILL_STREAM_DONE_CHANNEL,
  type AiStreamEvent,
} from "@shared/types/ai";
import {
  JUDGE_RESULT_CHANNEL,
  type JudgeResultEvent,
} from "@shared/types/judge";
import type { IpcResponse } from "@shared/types/ipc-generated";
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

  ipcRenderer.on(SKILL_STREAM_CHUNK_CHANNEL, onSkillStreamChunk);
  ipcRenderer.on(SKILL_STREAM_DONE_CHANNEL, onSkillStreamDone);
  ipcRenderer.on(SKILL_QUEUE_STATUS_CHANNEL, onSkillQueueStatus);
  ipcRenderer.on(JUDGE_RESULT_CHANNEL, onJudgeResult);

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
      ipcRenderer.removeListener(JUDGE_RESULT_CHANNEL, onJudgeResult);
    },
  };
}
