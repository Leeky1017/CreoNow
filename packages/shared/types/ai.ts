import type { IpcError } from "./ipc-generated";

export const SKILL_STREAM_CHUNK_CHANNEL = "skill:stream:chunk" as const;
export const SKILL_STREAM_DONE_CHANNEL = "skill:stream:done" as const;
export const SKILL_QUEUE_STATUS_CHANNEL = "skill:queue:status" as const;
/** P2: Agentic Loop tool-use event channel */
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
  finishReason?: "stop" | "tool_use" | null;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
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

/** P2: Tool-use event sent when an Agentic Loop tool call starts */
export type SkillToolUseStartedEvent = {
  type: "tool-use-started";
  executionId: string;
  runId: string;
  round: number;
  toolNames: string[];
  ts: number;
};

/** P2: Tool-use event sent when an Agentic Loop round completes */
export type SkillToolUseCompletedEvent = {
  type: "tool-use-completed";
  executionId: string;
  runId: string;
  round: number;
  results: Array<{ toolName: string; success: boolean; durationMs: number }>;
  hasNextRound: boolean;
  ts: number;
};

/** P2: Tool-use event sent when an Agentic Loop round fails */
export type SkillToolUseFailedEvent = {
  type: "tool-use-failed";
  executionId: string;
  runId: string;
  round: number;
  error: { code: string; message: string; retryable: boolean };
  ts: number;
};

export type SkillToolUseEvent =
  | SkillToolUseStartedEvent
  | SkillToolUseCompletedEvent
  | SkillToolUseFailedEvent;
