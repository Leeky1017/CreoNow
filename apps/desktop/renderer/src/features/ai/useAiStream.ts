import React from "react";

import type { AiStreamEvent } from "../../../../../../packages/shared/types/ai";
import { AI_SKILL_STREAM_CHANNEL } from "../../../../../../packages/shared/types/ai";
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
  if (typeof x.type !== "string" || typeof x.runId !== "string") {
    return false;
  }
  if (typeof x.ts !== "number") {
    return false;
  }
  return true;
}

/**
 * Subscribe to `ai:skill:stream` and forward events into the aiStore.
 *
 * Why: the UI must update from push events (delta/completed/failed/canceled).
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

    window.addEventListener(AI_SKILL_STREAM_CHANNEL, onEvent);
    return () => {
      window.removeEventListener(AI_SKILL_STREAM_CHANNEL, onEvent);
      if (subscriptionId && streamApi) {
        streamApi.releaseAiStreamConsumer(subscriptionId);
      }
    };
  }, [onStreamEvent]);
}
