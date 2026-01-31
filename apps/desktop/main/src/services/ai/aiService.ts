import { randomUUID } from "node:crypto";

import type {
  IpcError,
  IpcErrorCode,
} from "../../../../../../packages/shared/types/ipc-generated";
import type { AiStreamEvent } from "../../../../../../packages/shared/types/ai";
import type { Logger } from "../../logging/logger";
import { startFakeAiServer, type FakeAiServer } from "./fakeAiServer";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: IpcError };
export type ServiceResult<T> = Ok<T> | Err;

export type AiProvider = "anthropic" | "openai" | "proxy";

export type AiService = {
  runSkill: (args: {
    skillId: string;
    input: string;
    context?: { projectId?: string; documentId?: string };
    stream: boolean;
    ts: number;
    emitEvent: (event: AiStreamEvent) => void;
  }) => Promise<ServiceResult<{ runId: string; outputText?: string }>>;
  cancel: (args: { runId: string; ts: number }) => ServiceResult<{
    canceled: true;
  }>;
  feedback: (args: {
    runId: string;
    rating: "up" | "down";
    comment?: string;
    ts: number;
  }) => ServiceResult<{ recorded: true }>;
};

type JsonObject = Record<string, unknown>;

type ProviderConfig = {
  provider: AiProvider;
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
};

type RunEntry = {
  runId: string;
  controller: AbortController;
  timeoutTimer: NodeJS.Timeout | null;
  stream: boolean;
  startedAt: number;
  terminal: "completed" | "failed" | "canceled" | null;
  emitEvent: (event: AiStreamEvent) => void;
};

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Narrow an unknown value to a JSON object.
 */
function asObject(x: unknown): JsonObject | null {
  if (typeof x !== "object" || x === null) {
    return null;
  }
  return x as JsonObject;
}

/**
 * Return a stable IPC error wrapper.
 *
 * Why: errors must be deterministic for E2E assertions and must not leak secrets.
 */
function ipcError(code: IpcErrorCode, message: string, details?: unknown): Err {
  return { ok: false, error: { code, message, details } };
}

/**
 * Parse timeout (ms) from env with a safe default.
 */
function parseTimeoutMs(env: NodeJS.ProcessEnv): number {
  const raw = env.CREONOW_AI_TIMEOUT_MS;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return DEFAULT_TIMEOUT_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }
  return parsed;
}

/**
 * Check whether the current process is running in E2E mode.
 */
function isE2E(env: NodeJS.ProcessEnv): boolean {
  return env.CREONOW_E2E === "1";
}

/**
 * Parse AI provider enum from env.
 */
function parseProvider(env: NodeJS.ProcessEnv): AiProvider | null {
  const raw = env.CREONOW_AI_PROVIDER;
  if (raw === "anthropic" || raw === "openai" || raw === "proxy") {
    return raw;
  }
  return null;
}

/**
 * Read SSE messages from a fetch response body.
 *
 * Why: both OpenAI and Anthropic streaming are delivered as SSE.
 */
async function* readSse(args: {
  body: ReadableStream<Uint8Array>;
}): AsyncGenerator<{ event: string | null; data: string }> {
  const decoder = new TextDecoder();
  const reader = args.body.getReader();

  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const sepIndex = buffer.indexOf("\n\n");
      if (sepIndex < 0) {
        break;
      }

      const rawEvent = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);

      const lines = rawEvent.split("\n");
      let event: string | null = null;
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice("event:".length).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          dataLines.push(line.slice("data:".length).trimStart());
        }
      }

      if (dataLines.length === 0) {
        continue;
      }

      yield { event, data: dataLines.join("\n") };
    }
  }
}

/**
 * Extract assistant text from an OpenAI non-stream response.
 */
function extractOpenAiText(json: unknown): string | null {
  const obj = asObject(json);
  const choices = obj ? obj.choices : null;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }
  const first = asObject(choices[0]);
  const message = asObject(first?.message);
  const content = message?.content;
  return typeof content === "string" ? content : null;
}

/**
 * Extract delta text from an OpenAI streaming chunk.
 */
function extractOpenAiDelta(json: unknown): string | null {
  const obj = asObject(json);
  const choices = obj ? obj.choices : null;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }
  const first = asObject(choices[0]);
  const delta = asObject(first?.delta);
  const content = delta?.content;
  return typeof content === "string" ? content : null;
}

/**
 * Extract assistant text from an Anthropic non-stream response.
 */
function extractAnthropicText(json: unknown): string | null {
  const obj = asObject(json);
  const content = obj ? obj.content : null;
  if (!Array.isArray(content) || content.length === 0) {
    return null;
  }
  const first = asObject(content[0]);
  const text = first?.text;
  return typeof text === "string" ? text : null;
}

/**
 * Extract delta text from an Anthropic streaming chunk.
 */
function extractAnthropicDelta(json: unknown): string | null {
  const obj = asObject(json);
  const delta = asObject(obj?.delta);
  const text = delta?.text;
  return typeof text === "string" ? text : null;
}

/**
 * Create an IpcError for upstream failures without leaking secrets.
 */
function upstreamError(args: { status: number; message: string }): IpcError {
  return {
    code: "UPSTREAM_ERROR",
    message: args.message,
    details: { status: args.status },
  };
}

/**
 * Build provider config from env, starting the fake server in E2E by default.
 */
async function resolveProviderConfig(deps: {
  logger: Logger;
  env: NodeJS.ProcessEnv;
  getFakeServer: () => Promise<FakeAiServer>;
}): Promise<ServiceResult<ProviderConfig>> {
  const timeoutMs = parseTimeoutMs(deps.env);

  const proxyEnabled = deps.env.CREONOW_AI_PROXY_ENABLED === "1";
  if (proxyEnabled) {
    const baseUrl = deps.env.CREONOW_AI_PROXY_BASE_URL;
    if (typeof baseUrl !== "string" || baseUrl.trim().length === 0) {
      return ipcError(
        "INVALID_ARGUMENT",
        "CREONOW_AI_PROXY_BASE_URL is required when proxy enabled",
      );
    }
    return {
      ok: true,
      data: {
        provider: "proxy",
        baseUrl,
        apiKey:
          typeof deps.env.CREONOW_AI_PROXY_API_KEY === "string" &&
          deps.env.CREONOW_AI_PROXY_API_KEY.length > 0
            ? deps.env.CREONOW_AI_PROXY_API_KEY
            : undefined,
        timeoutMs,
      },
    };
  }

  const provider =
    parseProvider(deps.env) ?? (isE2E(deps.env) ? "anthropic" : null);
  if (!provider) {
    return ipcError(
      "INVALID_ARGUMENT",
      "CREONOW_AI_PROVIDER is required (anthropic|openai|proxy)",
    );
  }

  const envBaseUrl = deps.env.CREONOW_AI_BASE_URL;
  const baseUrl =
    typeof envBaseUrl === "string" && envBaseUrl.trim().length > 0
      ? envBaseUrl
      : isE2E(deps.env)
        ? (await deps.getFakeServer()).baseUrl
        : null;

  if (!baseUrl) {
    return ipcError(
      "INVALID_ARGUMENT",
      "CREONOW_AI_BASE_URL is required (or set CREONOW_E2E=1 for fake-first)",
    );
  }

  return {
    ok: true,
    data: {
      provider,
      baseUrl,
      apiKey:
        typeof deps.env.CREONOW_AI_API_KEY === "string" &&
        deps.env.CREONOW_AI_API_KEY.length > 0
          ? deps.env.CREONOW_AI_API_KEY
          : undefined,
      timeoutMs,
    },
  };
}

/**
 * Create the main-process AI service.
 *
 * Why: keep secrets + network + error mapping in the main process for stable IPC.
 */
export function createAiService(deps: {
  logger: Logger;
  env: NodeJS.ProcessEnv;
}): AiService {
  const runs = new Map<string, RunEntry>();
  let fakeServerPromise: Promise<FakeAiServer> | null = null;

  const getFakeServer = async (): Promise<FakeAiServer> => {
    if (!fakeServerPromise) {
      fakeServerPromise = startFakeAiServer({
        logger: deps.logger,
        env: deps.env,
      });
    }
    return await fakeServerPromise;
  };

  /**
   * Emit an AI stream event only while the run is still active.
   *
   * Why: cancel/timeout MUST stop further deltas to keep the UI stable.
   */
  function emitIfActive(entry: RunEntry, event: AiStreamEvent): void {
    if (entry.terminal !== null && event.type === "delta") {
      return;
    }
    entry.emitEvent(event);
  }

  /**
   * Mark a run as terminal and emit a single terminal event.
   */
  function setTerminal(args: {
    entry: RunEntry;
    event: AiStreamEvent;
    logEvent:
      | "ai_run_completed"
      | "ai_run_failed"
      | "ai_run_canceled"
      | "ai_run_timeout";
    errorCode?: IpcErrorCode;
  }): void {
    const entry = args.entry;
    if (entry.terminal !== null) {
      return;
    }

    if (args.event.type === "run_completed") {
      entry.terminal = "completed";
    } else if (args.event.type === "run_canceled") {
      entry.terminal = "canceled";
    } else {
      entry.terminal = "failed";
    }

    emitIfActive(entry, args.event);
    deps.logger.info(args.logEvent, {
      runId: entry.runId,
      code: args.errorCode,
    });
  }

  /**
   * Cleanup run resources.
   */
  function cleanupRun(runId: string): void {
    const entry = runs.get(runId);
    if (!entry) {
      return;
    }
    if (entry.timeoutTimer) {
      clearTimeout(entry.timeoutTimer);
    }
    runs.delete(runId);
  }

  /**
   * Execute a non-stream OpenAI-compatible request.
   */
  async function runOpenAiNonStream(args: {
    entry: RunEntry;
    cfg: ProviderConfig;
    input: string;
  }): Promise<ServiceResult<string>> {
    const url = new URL("/v1/chat/completions", args.cfg.baseUrl).toString();

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(args.cfg.apiKey
          ? { Authorization: `Bearer ${args.cfg.apiKey}` }
          : {}),
      },
      body: JSON.stringify({
        model: "fake",
        messages: [{ role: "user", content: args.input }],
        stream: false,
      }),
      signal: args.entry.controller.signal,
    });

    if (!res.ok) {
      return {
        ok: false,
        error: upstreamError({
          status: res.status,
          message: "AI upstream request failed",
        }),
      };
    }

    const json: unknown = await res.json();
    const text = extractOpenAiText(json);
    if (typeof text !== "string") {
      return ipcError("INTERNAL", "Invalid OpenAI response shape");
    }
    return { ok: true, data: text };
  }

  /**
   * Execute a non-stream Anthropic request.
   */
  async function runAnthropicNonStream(args: {
    entry: RunEntry;
    cfg: ProviderConfig;
    input: string;
  }): Promise<ServiceResult<string>> {
    const url = new URL("/v1/messages", args.cfg.baseUrl).toString();

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(args.cfg.apiKey ? { "x-api-key": args.cfg.apiKey } : {}),
      },
      body: JSON.stringify({
        model: "fake",
        max_tokens: 256,
        messages: [{ role: "user", content: args.input }],
        stream: false,
      }),
      signal: args.entry.controller.signal,
    });

    if (!res.ok) {
      return {
        ok: false,
        error: upstreamError({
          status: res.status,
          message: "AI upstream request failed",
        }),
      };
    }

    const json: unknown = await res.json();
    const text = extractAnthropicText(json);
    if (typeof text !== "string") {
      return ipcError("INTERNAL", "Invalid Anthropic response shape");
    }
    return { ok: true, data: text };
  }

  /**
   * Execute a streaming OpenAI-compatible request and emit delta events.
   */
  async function runOpenAiStream(args: {
    entry: RunEntry;
    cfg: ProviderConfig;
    input: string;
  }): Promise<ServiceResult<true>> {
    const url = new URL("/v1/chat/completions", args.cfg.baseUrl).toString();

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(args.cfg.apiKey
          ? { Authorization: `Bearer ${args.cfg.apiKey}` }
          : {}),
      },
      body: JSON.stringify({
        model: "fake",
        messages: [{ role: "user", content: args.input }],
        stream: true,
      }),
      signal: args.entry.controller.signal,
    });

    if (!res.ok) {
      return {
        ok: false,
        error: upstreamError({
          status: res.status,
          message: "AI upstream request failed",
        }),
      };
    }

    if (!res.body) {
      return ipcError("INTERNAL", "Missing streaming response body");
    }

    for await (const msg of readSse({ body: res.body })) {
      if (args.entry.terminal !== null) {
        break;
      }
      if (msg.data === "[DONE]") {
        break;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(msg.data);
      } catch {
        continue;
      }
      const delta = extractOpenAiDelta(parsed);
      if (typeof delta !== "string" || delta.length === 0) {
        continue;
      }

      emitIfActive(args.entry, {
        type: "delta",
        runId: args.entry.runId,
        ts: Date.now(),
        delta,
      });
    }

    return { ok: true, data: true };
  }

  /**
   * Execute a streaming Anthropic request and emit delta events.
   */
  async function runAnthropicStream(args: {
    entry: RunEntry;
    cfg: ProviderConfig;
    input: string;
  }): Promise<ServiceResult<true>> {
    const url = new URL("/v1/messages", args.cfg.baseUrl).toString();

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(args.cfg.apiKey ? { "x-api-key": args.cfg.apiKey } : {}),
      },
      body: JSON.stringify({
        model: "fake",
        max_tokens: 256,
        messages: [{ role: "user", content: args.input }],
        stream: true,
      }),
      signal: args.entry.controller.signal,
    });

    if (!res.ok) {
      return {
        ok: false,
        error: upstreamError({
          status: res.status,
          message: "AI upstream request failed",
        }),
      };
    }

    if (!res.body) {
      return ipcError("INTERNAL", "Missing streaming response body");
    }

    for await (const msg of readSse({ body: res.body })) {
      if (args.entry.terminal !== null) {
        break;
      }

      if (msg.event !== "content_block_delta") {
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(msg.data);
      } catch {
        continue;
      }
      const delta = extractAnthropicDelta(parsed);
      if (typeof delta !== "string" || delta.length === 0) {
        continue;
      }

      emitIfActive(args.entry, {
        type: "delta",
        runId: args.entry.runId,
        ts: Date.now(),
        delta,
      });
    }

    return { ok: true, data: true };
  }

  const runSkill: AiService["runSkill"] = async (args) => {
    const cfgRes = await resolveProviderConfig({
      logger: deps.logger,
      env: deps.env,
      getFakeServer,
    });
    if (!cfgRes.ok) {
      return cfgRes;
    }
    const cfg = cfgRes.data;

    const runId = randomUUID();
    const controller = new AbortController();
    const entry: RunEntry = {
      runId,
      controller,
      timeoutTimer: null,
      stream: args.stream,
      startedAt: args.ts,
      terminal: null,
      emitEvent: args.emitEvent,
    };
    runs.set(runId, entry);

    deps.logger.info("ai_run_started", {
      runId,
      provider: cfg.provider,
      stream: args.stream,
    });

    emitIfActive(entry, { type: "run_started", runId, ts: args.ts });

    entry.timeoutTimer = setTimeout(() => {
      if (entry.terminal !== null) {
        return;
      }
      controller.abort();

      setTerminal({
        entry,
        event: {
          type: "run_failed",
          runId,
          ts: Date.now(),
          error: { code: "TIMEOUT", message: "AI request timed out" },
        },
        logEvent: "ai_run_timeout",
        errorCode: "TIMEOUT",
      });
      cleanupRun(runId);
    }, cfg.timeoutMs);

    if (args.stream) {
      void (async () => {
        try {
          const res =
            cfg.provider === "anthropic"
              ? await runAnthropicStream({ entry, cfg, input: args.input })
              : await runOpenAiStream({ entry, cfg, input: args.input });

          if (!res.ok) {
            setTerminal({
              entry,
              event: {
                type: "run_failed",
                runId,
                ts: Date.now(),
                error: res.error,
              },
              logEvent: "ai_run_failed",
              errorCode: res.error.code,
            });
            return;
          }

          if (entry.terminal !== null) {
            return;
          }

          setTerminal({
            entry,
            event: { type: "run_completed", runId, ts: Date.now() },
            logEvent: "ai_run_completed",
          });
        } catch (error) {
          if (entry.terminal !== null) {
            return;
          }

          const aborted = controller.signal.aborted;
          if (aborted) {
            setTerminal({
              entry,
              event: { type: "run_canceled", runId, ts: Date.now() },
              logEvent: "ai_run_canceled",
              errorCode: "CANCELED",
            });
            return;
          }

          setTerminal({
            entry,
            event: {
              type: "run_failed",
              runId,
              ts: Date.now(),
              error: {
                code: "INTERNAL",
                message: "AI request failed",
                details: {
                  message:
                    error instanceof Error ? error.message : String(error),
                },
              },
            },
            logEvent: "ai_run_failed",
            errorCode: "INTERNAL",
          });
        } finally {
          cleanupRun(runId);
        }
      })();

      return { ok: true, data: { runId } };
    }

    try {
      const res =
        cfg.provider === "anthropic"
          ? await runAnthropicNonStream({ entry, cfg, input: args.input })
          : await runOpenAiNonStream({ entry, cfg, input: args.input });

      if (!res.ok) {
        setTerminal({
          entry,
          event: {
            type: "run_failed",
            runId,
            ts: Date.now(),
            error: res.error,
          },
          logEvent: "ai_run_failed",
          errorCode: res.error.code,
        });
        return res;
      }

      setTerminal({
        entry,
        event: { type: "run_completed", runId, ts: Date.now() },
        logEvent: "ai_run_completed",
      });
      return { ok: true, data: { runId, outputText: res.data } };
    } catch (error) {
      const aborted = controller.signal.aborted;
      if (aborted) {
        if (entry.terminal === "failed") {
          return ipcError("TIMEOUT", "AI request timed out");
        }
        setTerminal({
          entry,
          event: { type: "run_canceled", runId, ts: Date.now() },
          logEvent: "ai_run_canceled",
          errorCode: "CANCELED",
        });
        return ipcError("CANCELED", "AI request canceled");
      }

      setTerminal({
        entry,
        event: {
          type: "run_failed",
          runId,
          ts: Date.now(),
          error: {
            code: "INTERNAL",
            message: "AI request failed",
            details: {
              message: error instanceof Error ? error.message : String(error),
            },
          },
        },
        logEvent: "ai_run_failed",
        errorCode: "INTERNAL",
      });
      return ipcError("INTERNAL", "AI request failed");
    } finally {
      cleanupRun(runId);
    }
  };

  const cancel: AiService["cancel"] = (args) => {
    const entry = runs.get(args.runId);
    if (!entry) {
      return { ok: true, data: { canceled: true } };
    }

    if (entry.terminal !== null) {
      return { ok: true, data: { canceled: true } };
    }

    entry.terminal = "canceled";
    if (entry.timeoutTimer) {
      clearTimeout(entry.timeoutTimer);
    }
    entry.controller.abort();

    emitIfActive(entry, {
      type: "run_canceled",
      runId: args.runId,
      ts: args.ts,
    });
    deps.logger.info("ai_run_canceled", { runId: args.runId });

    return { ok: true, data: { canceled: true } };
  };

  const feedback: AiService["feedback"] = (args) => {
    deps.logger.info("ai_feedback_received", {
      runId: args.runId,
      rating: args.rating,
      commentLen: typeof args.comment === "string" ? args.comment.length : 0,
    });
    return { ok: true, data: { recorded: true } };
  };

  return { runSkill, cancel, feedback };
}
