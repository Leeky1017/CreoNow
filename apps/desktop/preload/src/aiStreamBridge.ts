import { ipcRenderer } from "electron";

import {
  AI_SKILL_STREAM_CHANNEL,
  type AiStreamEvent,
} from "../../../../packages/shared/types/ai";
import type { IpcResponse } from "../../../../packages/shared/types/ipc-generated";
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
  if (typeof x.type !== "string" || typeof x.runId !== "string") {
    return false;
  }
  if (typeof x.ts !== "number") {
    return false;
  }
  return true;
}

export type AiStreamBridgeApi = {
  registerAiStreamConsumer: () => IpcResponse<{ subscriptionId: string }>;
  releaseAiStreamConsumer: (subscriptionId: string) => void;
};

/**
 * Bridge `ai:skill:stream` IPC events into the renderer via DOM CustomEvent.
 *
 * Why: renderer runs with contextIsolation and cannot subscribe to `ipcRenderer`
 * directly, and we must not expand the preload public API surface.
 */
export function registerAiStreamBridge(): AiStreamBridgeApi {
  const subscriptions = createAiStreamSubscriptionRegistry({
    rendererId: `pid-${process.pid}`,
  });

  ipcRenderer.on(AI_SKILL_STREAM_CHANNEL, (_evt, payload: unknown) => {
    if (subscriptions.count() === 0) {
      return;
    }

    if (!isAiStreamEvent(payload)) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<AiStreamEvent>(AI_SKILL_STREAM_CHANNEL, {
        detail: payload,
      }),
    );
  });

  return {
    registerAiStreamConsumer: () => subscriptions.register(),
    releaseAiStreamConsumer: (subscriptionId: string) => {
      subscriptions.release(subscriptionId);
    },
  };
}
