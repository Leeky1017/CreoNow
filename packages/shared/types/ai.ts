import type { IpcError } from "./ipc-generated";

export const SKILL_STREAM_CHUNK_CHANNEL = "skill:stream:chunk" as const;
export const SKILL_STREAM_DONE_CHANNEL = "skill:stream:done" as const;

export type AiStreamTerminal = "completed" | "cancelled" | "error";

export type AiStreamChunkEvent = {
  type: "chunk";
  executionId: string;
  runId: string;
  traceId: string;
  seq: number;
  chunk: string;
  ts: number;
};

export type AiStreamDoneEvent = {
  type: "done";
  executionId: string;
  runId: string;
  traceId: string;
  terminal: AiStreamTerminal;
  outputText: string;
  error?: IpcError;
  ts: number;
};

export type AiStreamEvent = AiStreamChunkEvent | AiStreamDoneEvent;
