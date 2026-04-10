import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createApiClient } from "../apiClient";
import { createCostTracker, type ModelPricingTable } from "../costTracker";
import type { Logger } from "../../../logging/logger";

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function createDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY
    );

    CREATE TABLE cost_records (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES sessions (id),
      model TEXT NOT NULL,
      input_tokens INTEGER,
      output_tokens INTEGER,
      cache_hit_tokens INTEGER,
      duration_ms INTEGER,
      estimated_cost_usd REAL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

function createPricingTable(): ModelPricingTable {
  return {
    currency: "USD",
    lastUpdated: "2026-01-01T00:00:00.000Z",
    prices: {
      "gpt-4o": {
        modelId: "gpt-4o",
        displayName: "GPT-4o",
        inputPricePer1K: 0.01,
        outputPricePer1K: 0.03,
        effectiveDate: "2026-01-01",
      },
    },
  };
}

function getCostRecord(db: Database.Database, id: string): {
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
} | null {
  const row = db
    .prepare<
      [string],
      {
        model: string;
        inputTokens: number;
        outputTokens: number;
        estimatedCostUsd: number;
      }
    >(
      "SELECT model, input_tokens AS inputTokens, output_tokens AS outputTokens, estimated_cost_usd AS estimatedCostUsd FROM cost_records WHERE id = ?",
    )
    .get(id);
  return row ?? null;
}

describe("apiClient", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends OpenAI-compatible request format and records cost", async () => {
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    const fetchMock = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body)) as {
        model: string;
        stream: boolean;
        temperature: number;
        max_tokens: number;
      };
      expect(payload.model).toBe("gpt-4o");
      expect(payload.stream).toBe(false);
      expect(payload.temperature).toBe(0.2);
      expect(payload.max_tokens).toBe(512);
      expect((init?.headers as Record<string, string>).Authorization).toBe(
        "Bearer sk-test",
      );

      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "hello world" } }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 40,
            cached_tokens: 20,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 1_000,
    });

    const result = await client.createChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-test",
        model: "gpt-4o",
        maxTokens: 512,
        temperature: 0.2,
      },
      messages: [{ role: "user", content: "Say hello" }],
      requestId: "req-1",
      skillId: "builtin:continue",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected request success");
    }
    expect(result.data.content).toBe("hello world");
    expect(result.data.usage.promptTokens).toBe(100);
    expect(result.data.usage.completionTokens).toBe(40);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toBe("https://api.openai.com/v1/chat/completions");

    const row = getCostRecord(db, "req-1");
    expect(row).not.toBeNull();
    expect(row?.model).toBe("gpt-4o");
    expect(row?.estimatedCostUsd).toBeGreaterThan(0);
  });

  it("parses SSE stream chunks and records cost", async () => {
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    const sseBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            [
              'data: {"choices":[{"delta":{"content":"hello "}}]}',
              "",
              'data: {"choices":[{"delta":{"content":"stream"}}]}',
              "",
              'data: {"usage":{"prompt_tokens":10,"completion_tokens":3}}',
              "",
              "data: [DONE]",
              "",
            ].join("\n"),
          ),
        );
        controller.close();
      },
    });

    const fetchMock = vi.fn(
      async (_url: URL | RequestInfo, _init?: RequestInit) =>
        new Response(sseBody, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
    );

    const chunks: string[] = [];
    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 2_000,
    });

    const result = await client.streamChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        apiKey: "sk-test",
        model: "gpt-4o",
        maxTokens: 128,
        temperature: 0.7,
      },
      messages: [{ role: "user", content: "stream please" }],
      requestId: "req-2",
      skillId: "builtin:continue",
      onChunk: (chunk) => {
        if (chunk.delta.length > 0) {
          chunks.push(chunk.delta);
        }
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected stream success");
    }
    expect(chunks.join("")).toBe("hello stream");
    expect(result.data.content).toBe("hello stream");
    expect(result.data.usage.promptTokens).toBe(10);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toBe("https://api.openai.com/v1/chat/completions");

    const row = getCostRecord(db, "req-2");
    expect(row).not.toBeNull();
    expect(row?.outputTokens).toBe(3);
  });

  it("flushes residual SSE event when upstream omits trailing blank line", async () => {
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    const sseBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            [
              'data: {"choices":[{"delta":{"content":"tail"}}]}',
              "",
              'data: {"usage":{"prompt_tokens":4,"completion_tokens":2}}',
            ].join("\n"),
          ),
        );
        controller.close();
      },
    });

    const fetchMock = vi.fn(
      async (_url: URL | RequestInfo, _init?: RequestInit) =>
        new Response(sseBody, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
    );

    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 2_500,
    });

    const result = await client.streamChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        model: "gpt-4o",
        maxTokens: 128,
        temperature: 0.7,
      },
      messages: [{ role: "user", content: "stream please" }],
      requestId: "req-2b",
      skillId: "builtin:continue",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected stream success");
    }
    expect(result.data.content).toBe("tail");
    expect(result.data.usage.completionTokens).toBe(2);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("classifies 429 as retryable AI_RATE_LIMITED and persists zero-cost record", async () => {
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    const fetchMock = vi.fn(
      async (_url: URL | RequestInfo, _init?: RequestInit) =>
        new Response(JSON.stringify({ error: { message: "too many requests" } }), {
          status: 429,
          headers: {
            "content-type": "application/json",
            "Retry-After": "0",
          },
        }),
    );

    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 3_000,
    });

    const result = await client.createChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        apiKey: "sk-test",
        model: "gpt-4o",
        maxTokens: 256,
        temperature: 0.4,
      },
      messages: [{ role: "user", content: "hello" }],
      requestId: "req-3",
      skillId: "builtin:continue",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected 429 failure");
    }
    expect(result.error.code).toBe("AI_RATE_LIMITED");
    expect(result.error.retryable).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(
      (result.error.details as { retryCount?: number } | undefined)?.retryCount,
    ).toBe(3);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toBe("https://api.openai.com/v1/chat/completions");

    const row = getCostRecord(db, "req-3");
    expect(row).not.toBeNull();
    expect(row?.estimatedCostUsd).toBe(0);
  });

  it("records zero cost for unknown model pricing", async () => {
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    const fetchMock = vi.fn(
      async (_url: URL | RequestInfo, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "ok" } }],
            usage: { prompt_tokens: 30, completion_tokens: 12 },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );

    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 4_000,
    });

    const result = await client.createChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        apiKey: "sk-test",
        model: "unknown-model",
        maxTokens: 100,
        temperature: 0.5,
      },
      messages: [{ role: "user", content: "hello" }],
      requestId: "req-4",
      skillId: "builtin:continue",
    });

    expect(result.ok).toBe(true);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toBe("https://api.openai.com/v1/chat/completions");
    const row = getCostRecord(db, "req-4");
    expect(row).not.toBeNull();
    expect(row?.estimatedCostUsd).toBe(0);
  });

  it("retries timed-out request and succeeds on second attempt", async () => {
    vi.useFakeTimers();
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });
    const fetchMock = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      if (fetchMock.mock.calls.length === 1) {
        const signal = init?.signal as AbortSignal | undefined;
        await new Promise<never>((_resolve, reject) => {
          const onAbort = () => {
            const err = new Error("attempt timeout");
            err.name = "AbortError";
            reject(err);
          };
          if (signal?.aborted) {
            onAbort();
            return;
          }
          signal?.addEventListener("abort", onAbort, { once: true });
        });
      }
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "ok after timeout retry" } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 9_000,
    });

    const resultPromise = client.createChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        model: "gpt-4o",
        maxTokens: 64,
        temperature: 0.2,
        timeoutMs: 5,
      },
      messages: [{ role: "user", content: "hi" }],
      requestId: "req-timeout-1",
      skillId: "builtin:continue",
    });
    await vi.advanceTimersByTimeAsync(2_000);
    const result = await resultPromise;

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected retry success");
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.data.content).toBe("ok after timeout retry");
    expect(result.data.retryCount).toBe(1);
  });

  it("returns retryable timeout error after exhausting retries", async () => {
    vi.useFakeTimers();
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    const fetchMock = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal | undefined;
      await new Promise<never>((_resolve, reject) => {
        const onAbort = () => {
          const err = new Error("attempt timeout");
          err.name = "AbortError";
          reject(err);
        };
        if (signal?.aborted) {
          onAbort();
          return;
        }
        signal?.addEventListener("abort", onAbort, { once: true });
      });
      throw new Error("unreachable");
    });

    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 9_500,
    });

    const resultPromise = client.createChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        model: "gpt-4o",
        maxTokens: 64,
        temperature: 0.2,
        timeoutMs: 5,
      },
      messages: [{ role: "user", content: "hi" }],
      requestId: "req-timeout-all-retries",
      skillId: "builtin:continue",
    });
    await vi.advanceTimersByTimeAsync(8_000);
    const result = await resultPromise;

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected timeout failure");
    }
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.error.code).toBe("LLM_API_ERROR");
    expect(result.error.retryable).toBe(true);
    expect(
      (result.error.details as { retryCount?: number } | undefined)?.retryCount,
    ).toBe(3);
  });

  it("marks network exception as retryable and still writes cost record", async () => {
    vi.useFakeTimers();
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    const fetchMock = vi.fn(async (_url: URL | RequestInfo, _init?: RequestInit) => {
      throw new Error("network down");
    });

    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 5_000,
    });

    const resultPromise = client.createChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        model: "gpt-4o",
        maxTokens: 100,
        temperature: 0.5,
      },
      messages: [{ role: "user", content: "hello" }],
      requestId: "req-5",
      skillId: "builtin:continue",
    });
    await vi.advanceTimersByTimeAsync(7_000);
    const result = await resultPromise;

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected network failure");
    }
    expect(result.error.code).toBe("LLM_API_ERROR");
    expect(result.error.retryable).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(
      (result.error.details as { retryCount?: number } | undefined)?.retryCount,
    ).toBe(3);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toBe("https://api.openai.com/v1/chat/completions");
    expect(getCostRecord(db, "req-5")).not.toBeNull();
  });

  it("returns non-retryable error for invalid SSE chunk and still records cost", async () => {
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    const sseBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: {broken-json}\n\n"));
        controller.close();
      },
    });

    const fetchMock = vi.fn(
      async (_url: URL | RequestInfo, _init?: RequestInit) =>
        new Response(sseBody, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
    );

    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 6_000,
    });

    const result = await client.streamChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        model: "gpt-4o",
        maxTokens: 100,
        temperature: 0.5,
      },
      messages: [{ role: "user", content: "hello" }],
      requestId: "req-6",
      skillId: "builtin:continue",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected invalid SSE payload failure");
    }
    expect(result.error.code).toBe("LLM_API_ERROR");
    expect(result.error.retryable).toBe(false);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toBe("https://api.openai.com/v1/chat/completions");
    expect(getCostRecord(db, "req-6")).not.toBeNull();
  });

  it("returns non-retryable error when stream response content-type is not SSE", async () => {
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    const fetchMock = vi.fn(
      async (_url: URL | RequestInfo, _init?: RequestInit) =>
        new Response(JSON.stringify({ choices: [] }), {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" },
        }),
    );

    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 6_500,
    });

    const result = await client.streamChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        model: "gpt-4o",
        maxTokens: 100,
        temperature: 0.5,
      },
      messages: [{ role: "user", content: "hello" }],
      requestId: "req-6b",
      skillId: "builtin:continue",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected non-SSE stream protocol failure");
    }
    expect(result.error.code).toBe("LLM_API_ERROR");
    expect(result.error.retryable).toBe(false);
    expect(getCostRecord(db, "req-6b")).not.toBeNull();
  });

  it("returns non-retryable error when stream ends before any SSE data event", async () => {
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    const emptySseBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("event: ping\n\n"));
        controller.close();
      },
    });

    const fetchMock = vi.fn(
      async (_url: URL | RequestInfo, _init?: RequestInit) =>
        new Response(emptySseBody, {
          status: 200,
          headers: { "content-type": "text/event-stream; charset=utf-8" },
        }),
    );

    const onChunk = vi.fn();
    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 6_800,
    });

    const result = await client.streamChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        model: "gpt-4o",
        maxTokens: 100,
        temperature: 0.5,
      },
      messages: [{ role: "user", content: "hello" }],
      requestId: "req-6c",
      skillId: "builtin:continue",
      onChunk,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected empty SSE stream protocol failure");
    }
    expect(result.error.code).toBe("LLM_API_ERROR");
    expect(result.error.message).toBe(
      "Streaming response ended before any SSE data event was received",
    );
    expect(result.error.retryable).toBe(false);
    expect(onChunk).not.toHaveBeenCalled();
    expect(getCostRecord(db, "req-6c")).not.toBeNull();
  });

  it("classifies 5xx stream response as retryable", async () => {
    vi.useFakeTimers();
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    const fetchMock = vi.fn(
      async (_url: URL | RequestInfo, _init?: RequestInit) =>
        new Response(JSON.stringify({ error: { message: "upstream down" } }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
    );

    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 7_000,
    });

    const resultPromise = client.streamChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        model: "gpt-4o",
        maxTokens: 100,
        temperature: 0.5,
      },
      messages: [{ role: "user", content: "hello" }],
      requestId: "req-7",
      skillId: "builtin:continue",
    });
    await vi.advanceTimersByTimeAsync(7_000);
    const result = await resultPromise;

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected stream upstream failure");
    }
    expect(result.error.code).toBe("LLM_API_ERROR");
    expect(result.error.retryable).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(
      (result.error.details as { retryCount?: number } | undefined)?.retryCount,
    ).toBe(3);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toBe("https://api.openai.com/v1/chat/completions");
    expect(getCostRecord(db, "req-7")).not.toBeNull();
  });

  it("marks stream network exception as retryable and still writes cost record", async () => {
    vi.useFakeTimers();
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    const fetchMock = vi.fn(async (_url: URL | RequestInfo, _init?: RequestInit) => {
      throw new Error("stream network down");
    });

    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 8_000,
    });

    const resultPromise = client.streamChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        model: "gpt-4o",
        maxTokens: 100,
        temperature: 0.5,
      },
      messages: [{ role: "user", content: "hello" }],
      requestId: "req-8",
      skillId: "builtin:continue",
    });
    await vi.advanceTimersByTimeAsync(7_000);
    const result = await resultPromise;

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected stream network failure");
    }
    expect(result.error.code).toBe("LLM_API_ERROR");
    expect(result.error.retryable).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(
      (result.error.details as { retryCount?: number } | undefined)?.retryCount,
    ).toBe(3);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toBe("https://api.openai.com/v1/chat/completions");
    expect(getCostRecord(db, "req-8")).not.toBeNull();
  });

  it("retries 429 using Retry-After and succeeds with retryCount", async () => {
    vi.useFakeTimers();
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    let attempt = 0;
    const fetchMock = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) {
        return new Response(JSON.stringify({ error: { message: "rate limited" } }), {
          status: 429,
          headers: {
            "content-type": "application/json",
            "Retry-After": "2",
          },
        });
      }
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "ok after retry" } }],
          usage: { prompt_tokens: 5, completion_tokens: 2 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 10_000,
    });

    const resultPromise = client.createChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        model: "gpt-4o",
        maxTokens: 100,
        temperature: 0.2,
      },
      messages: [{ role: "user", content: "hello" }],
      requestId: "req-retry-429",
      skillId: "builtin:continue",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2_000);
    const result = await resultPromise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected retry success");
    }
    expect(result.data.content).toBe("ok after retry");
    expect(result.data.retryCount).toBe(1);
  });

  it("retries 500 with exponential backoff and succeeds on final retry", async () => {
    vi.useFakeTimers();
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    let attempt = 0;
    const fetchMock = vi.fn(async () => {
      attempt += 1;
      if (attempt <= 3) {
        return new Response(JSON.stringify({ error: { message: "server error" } }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "recovered" } }],
          usage: { prompt_tokens: 5, completion_tokens: 2 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 11_000,
    });

    const resultPromise = client.createChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        model: "gpt-4o",
        maxTokens: 100,
        temperature: 0.2,
      },
      messages: [{ role: "user", content: "hello" }],
      requestId: "req-retry-500-backoff",
      skillId: "builtin:continue",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(4_000);
    const result = await resultPromise;

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected retry success");
    }
    expect(result.data.content).toBe("recovered");
    expect(result.data.retryCount).toBe(3);
  });

  it("does not retry on non-retryable 401", async () => {
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { message: "unauthorized" } }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
    );

    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 12_000,
    });

    const result = await client.createChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        model: "gpt-4o",
        maxTokens: 100,
        temperature: 0.2,
      },
      messages: [{ role: "user", content: "hello" }],
      requestId: "req-noretry-401",
      skillId: "builtin:continue",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected 401 failure");
    }
    expect(result.error.retryable).toBe(false);
    expect(
      (result.error.details as { retryCount?: number } | undefined)?.retryCount,
    ).toBe(0);
  });

  it("aborts immediately while waiting between retries", async () => {
    vi.useFakeTimers();
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { message: "upstream down" } }), {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
    );

    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 13_000,
    });

    const abortController = new AbortController();
    const resultPromise = client.createChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        model: "gpt-4o",
        maxTokens: 100,
        temperature: 0.2,
      },
      messages: [{ role: "user", content: "hello" }],
      requestId: "req-retry-abort",
      skillId: "builtin:continue",
      signal: abortController.signal,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    abortController.abort();
    await vi.runOnlyPendingTimersAsync();
    const result = await resultPromise;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected abort failure");
    }
    expect(result.error.code).toBe("CANCELED");
    expect(result.error.retryable).toBe(false);
    expect(
      (result.error.details as { retryCount?: number } | undefined)?.retryCount,
    ).toBe(1);
  });

  it("classifies stream user abort as non-retryable CANCELED", async () => {
    const db = createDb();
    const tracker = createCostTracker({
      pricingTable: createPricingTable(),
      budgetPolicy: {
        warningThreshold: 10,
        hardStopLimit: 100,
        enabled: false,
      },
      estimateTokens: () => 0,
    });

    const fetchMock = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal | undefined;
      await new Promise<never>((_resolve, reject) => {
        const onAbort = () => {
          const err = new Error("request canceled");
          err.name = "AbortError";
          reject(err);
        };
        if (signal?.aborted) {
          onAbort();
          return;
        }
        signal?.addEventListener("abort", onAbort, { once: true });
      });
      throw new Error("unreachable");
    });

    const client = createApiClient({
      db,
      costTracker: tracker,
      logger: createLogger(),
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 8_500,
    });

    const abortController = new AbortController();
    const resultPromise = client.streamChatCompletion({
      provider: {
        baseUrl: "https://api.openai.com",
        model: "gpt-4o",
        maxTokens: 100,
        temperature: 0.5,
      },
      messages: [{ role: "user", content: "hello" }],
      requestId: "req-9",
      skillId: "builtin:continue",
      signal: abortController.signal,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    abortController.abort();
    const result = await resultPromise;

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected abort failure");
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.error.code).toBe("CANCELED");
    expect(result.error.retryable).toBe(false);
    expect(getCostRecord(db, "req-9")).not.toBeNull();
  });
});
