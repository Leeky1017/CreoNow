import { ipcRenderer } from "electron";

import {
  AI_SKILL_STREAM_CHANNEL,
  type AiStreamEvent,
} from "../../../../packages/shared/types/ai";

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

/**
 * Bridge `ai:skill:stream` IPC events into the renderer via DOM CustomEvent.
 *
 * Why: renderer runs with contextIsolation and cannot subscribe to `ipcRenderer`
 * directly, and we must not expand the preload public API surface.
 */
export function registerAiStreamBridge(): void {
  ipcRenderer.on(AI_SKILL_STREAM_CHANNEL, (_evt, payload: unknown) => {
    if (!isAiStreamEvent(payload)) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<AiStreamEvent>(AI_SKILL_STREAM_CHANNEL, {
        detail: payload,
      }),
    );
  });
}

