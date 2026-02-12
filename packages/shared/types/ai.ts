import type { IpcError } from "./ipc-generated";

export const SKILL_STREAM_CHUNK_CHANNEL = "skill:stream:chunk" as const;
export const SKILL_STREAM_DONE_CHANNEL = "skill:stream:done" as const;
export const SKILL_QUEUE_STATUS_CHANNEL = "skill:queue:status" as const;

export type AiStreamTerminal = "completed" | "cancelled" | "error";

export type SkillResultMetadata = {
  model: string;
  promptTokens: number;
  completionTokens: number;
};

export type SkillResult = {
  success: boolean;
  output: string;
  metadata: SkillResultMetadata;
  traceId: string;
  error?: IpcError;
};

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
  result?: SkillResult;
  ts: number;
};

export type AiQueueStatusEvent = {
  type: "queue";
  executionId: string;
  runId: string;
  traceId: string;
  status:
    | "queued"
    | "started"
    | "completed"
    | "failed"
    | "cancelled"
    | "timeout";
  queuePosition: number;
  queued: number;
  globalRunning: number;
  ts: number;
};

export type AiStreamEvent =
  | AiStreamChunkEvent
  | AiStreamDoneEvent
  | AiQueueStatusEvent;
