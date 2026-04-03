import type { IpcError } from "./ipc-generated";

export const SKILL_STREAM_CHUNK_CHANNEL = "skill:stream:chunk" as const;
export const SKILL_STREAM_DONE_CHANNEL = "skill:stream:done" as const;
export const SKILL_QUEUE_STATUS_CHANNEL = "skill:queue:status" as const;
export const SKILL_TOOL_USE_CHANNEL = "skill:tool-use" as const;

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

export type AiToolUseStartedEvent = {
  type: "tool-use-started";
  executionId: string;
  runId: string;
  traceId: string;
  round: number;
  toolNames: string[];
  ts: number;
};

export type AiToolUseCompletedEvent = {
  type: "tool-use-completed";
  executionId: string;
  runId: string;
  traceId: string;
  round: number;
  results: Array<{
    toolName: string;
    success: boolean;
    durationMs: number;
  }>;
  hasNextRound: boolean;
  ts: number;
};

export type AiToolUseFailedEvent = {
  type: "tool-use-failed";
  executionId: string;
  runId: string;
  traceId: string;
  round: number;
  error: IpcError;
  ts: number;
};

export type AiToolUseWarningEvent = {
  type: "tool-use-warning";
  executionId: string;
  runId: string;
  traceId: string;
  message: string;
  discardedToolNames?: string[];
  ts: number;
};

export type AiStreamEvent =
  | AiStreamChunkEvent
  | AiStreamDoneEvent
  | AiQueueStatusEvent;

export type AiToolUseEvent =
  | AiToolUseStartedEvent
  | AiToolUseCompletedEvent
  | AiToolUseFailedEvent
  | AiToolUseWarningEvent;
