import type { IpcError } from "./ipc-generated";

export const AI_SKILL_STREAM_CHANNEL = "ai:skill:stream" as const;

export type AiStreamEvent =
  | { type: "run_started"; runId: string; ts: number }
  | { type: "delta"; runId: string; ts: number; delta: string }
  | { type: "run_completed"; runId: string; ts: number; usage?: unknown }
  | { type: "run_failed"; runId: string; ts: number; error: IpcError }
  | { type: "run_canceled"; runId: string; ts: number };
