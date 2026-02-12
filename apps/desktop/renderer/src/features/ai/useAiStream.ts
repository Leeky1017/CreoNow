import React from "react";

import type { AiStreamEvent } from "../../../../../../packages/shared/types/ai";
import {
  SKILL_QUEUE_STATUS_CHANNEL,
  SKILL_STREAM_CHUNK_CHANNEL,
  SKILL_STREAM_DONE_CHANNEL,
} from "../../../../../../packages/shared/types/ai";
import { useAiStore } from "../../stores/aiStore";

type UnknownRecord = Record<string, unknown>;

/**
 * Narrow an unknown value to a record.
 */
function isRecord(x: unknown): x is UnknownRecord {
  return typeof x === "object" && x !== null;
}

/**
 * Best-effort runtime validation for AI stream events.
 *
 * Why: renderer must not crash if a malformed event crosses the IPC boundary.
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
 * Subscribe to skill stream channels and forward events into the aiStore.
 *
 * Why: the UI must update from push events (chunk/done terminal lifecycle).
 */
export function useAiStream(): void {
  const onStreamEvent = useAiStore((s) => s.onStreamEvent);

  React.useEffect(() => {
    let subscriptionId: string | null = null;
    const streamApi = window.creonow?.stream;
    if (streamApi) {
      const registration = streamApi.registerAiStreamConsumer();
      if (!registration.ok) {
        console.error("ai_stream_subscription_rejected", {
          code: registration.error.code,
          message: registration.error.message,
        });
        return () => undefined;
      }
      subscriptionId = registration.data.subscriptionId;
    }

    function onEvent(evt: Event): void {
      const e = evt as CustomEvent<unknown>;
      const detail = e.detail;
      if (!isAiStreamEvent(detail)) {
        return;
      }
      onStreamEvent(detail);
    }

    window.addEventListener(SKILL_STREAM_CHUNK_CHANNEL, onEvent);
    window.addEventListener(SKILL_STREAM_DONE_CHANNEL, onEvent);
    window.addEventListener(SKILL_QUEUE_STATUS_CHANNEL, onEvent);
    return () => {
      window.removeEventListener(SKILL_STREAM_CHUNK_CHANNEL, onEvent);
      window.removeEventListener(SKILL_STREAM_DONE_CHANNEL, onEvent);
      window.removeEventListener(SKILL_QUEUE_STATUS_CHANNEL, onEvent);
      if (subscriptionId && streamApi) {
        streamApi.releaseAiStreamConsumer(subscriptionId);
      }
    };
  }, [onStreamEvent]);
}
