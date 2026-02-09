import type { IpcError } from "./ipc-generated";

export const SKILL_STREAM_CHUNK_CHANNEL = "skill:stream:chunk" as const;
export const SKILL_STREAM_DONE_CHANNEL = "skill:stream:done" as const;

export type AiStreamEvent =
  | { type: "run_started"; runId: string; ts: number }
  | { type: "delta"; runId: string; ts: number; delta: string }
  | { type: "run_completed"; runId: string; ts: number; usage?: unknown }
  | { type: "run_failed"; runId: string; ts: number; error: IpcError }
  | { type: "run_canceled"; runId: string; ts: number };
