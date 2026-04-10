import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";

import type { Logger } from "../../../logging/logger";
import { createAiServiceBridge } from "../aiServiceBridge";
import { createCostTracker, type ModelPricingTable } from "../costTracker";
import * as modelRouterModule from "../modelRouter";
import type { ModelRouter } from "../modelRouter";

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: vi.fn(),
    error: vi.fn(),
  };
}

function createDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE settings (
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (scope, key)
    );

    CREATE TABLE cost_records (
      id TEXT PRIMARY KEY,
      session_id TEXT,
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

function putSetting(db: Database.Database, key: string, value: unknown): void {
  db.prepare(
    "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?)",
  ).run("app", key, JSON.stringify(value), Date.now());
}

function createPricingTable(): ModelPricingTable {
  return {
    currency: "USD",
    lastUpdated: "2026-01-01T00:00:00.000Z",
    prices: {
      "gpt-4.1-mini": {
        modelId: "gpt-4.1-mini",
        displayName: "GPT-4.1 mini",
        inputPricePer1K: 0.003,
        outputPricePer1K: 0.009,
        effectiveDate: "2026-01-01",
      },
    },
  };
}

describe("aiServiceBridge", () => {
  it("wires settings -> router -> api call -> cost_records", async () => {
    const db = createDb();
    putSetting(db, "creonow.ai.model.primary", "gpt-4.1");
    putSetting(db, "creonow.ai.model.auxiliary", "gpt-4.1-mini");
    const onApiCallStarted = vi.fn();

    const fetchMock = vi.fn(
      async (_url: URL | RequestInfo, init?: RequestInit) => {
        expect(onApiCallStarted).toHaveBeenCalledTimes(1);
        const payload = JSON.parse(String(init?.body)) as {
          model: string;
          stream: boolean;
        };
        expect(payload.model).toBe("gpt-4.1-mini");
        expect(payload.stream).toBe(true);
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(
                  [
                    'data: {"choices":[{"delta":{"content":"bridge "}}]}',
                    "",
                    'data: {"choices":[{"delta":{"content":"ok"}}]}',
                    "",
                    'data: {"usage":{"prompt_tokens":11,"completion_tokens":4}}',
                    "",
                    "data: [DONE]",
                    "",
                  ].join("\n"),
                ),
              );
              controller.close();
            },
          }),
          { status: 200, headers: { "content-type": "text/event-stream" } },
        );
      },
    );

    const logger = createLogger();
    const bridge = createAiServiceBridge({
      db,
      logger,
      costTracker: createCostTracker({
        pricingTable: createPricingTable(),
        budgetPolicy: {
          warningThreshold: 10,
          hardStopLimit: 100,
          enabled: false,
        },
        estimateTokens: () => 0,
      }),
      env: {
        CREONOW_AI_PROVIDER: "openai",
        CREONOW_AI_BASE_URL: "https://api.openai.com",
        CREONOW_AI_API_KEY: "sk-test",
      },
      runtimeAiTimeoutMs: 30_000,
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 1_000,
    });

    const collected: string[] = [];
    const onComplete = vi.fn();
    const onError = vi.fn();
    const abortController = new AbortController();

    for await (const chunk of bridge.streamChat(
      [{ role: "user", content: "summarize this" }],
      {
        signal: abortController.signal,
        onComplete,
        onError,
        onApiCallStarted,
        skillId: "builtin:summarize",
        requestId: "bridge-req-1",
      },
    )) {
      if (chunk.delta.length > 0) {
        collected.push(chunk.delta);
      }
    }

    expect(collected.join("")).toBe("bridge ok");
    expect(onError).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toBe("https://api.openai.com/v1/chat/completions");
    expect(onApiCallStarted).toHaveBeenCalledTimes(1);

    const row = db
      .prepare<
        [string],
        { model: string; inputTokens: number; outputTokens: number }
      >("SELECT model, input_tokens AS inputTokens, output_tokens AS outputTokens FROM cost_records WHERE id = ?")
      .get("bridge-req-1");
    expect(row).toEqual({
      model: "gpt-4.1-mini",
      inputTokens: 11,
      outputTokens: 4,
    });
    expect(logger.info).not.toHaveBeenCalledWith(
      "ai_cost_persistence_degraded",
      expect.anything(),
    );
  });

  it("logs persistenceError and propagates it in onComplete payload", async () => {
    const db = createDb();
    putSetting(db, "creonow.ai.model.primary", "gpt-4.1");
    putSetting(db, "creonow.ai.model.auxiliary", "gpt-4.1-mini");
    db.prepare("DROP TABLE cost_records").run();

    const logger = createLogger();
    const bridge = createAiServiceBridge({
      db,
      logger,
      costTracker: createCostTracker({
        pricingTable: createPricingTable(),
        budgetPolicy: {
          warningThreshold: 10,
          hardStopLimit: 100,
          enabled: false,
        },
        estimateTokens: () => 0,
      }),
      env: {
        CREONOW_AI_PROVIDER: "openai",
        CREONOW_AI_BASE_URL: "https://api.openai.com",
        CREONOW_AI_API_KEY: "sk-test",
      },
      runtimeAiTimeoutMs: 30_000,
      fetchImpl: (async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(
                  [
                    'data: {"choices":[{"delta":{"content":"bridge "}}]}',
                    "",
                    'data: {"choices":[{"delta":{"content":"ok"}}]}',
                    "",
                    'data: {"usage":{"prompt_tokens":11,"completion_tokens":4}}',
                    "",
                    "data: [DONE]",
                    "",
                  ].join("\n"),
                ),
              );
              controller.close();
            },
          }),
          { status: 200, headers: { "content-type": "text/event-stream" } },
        )) as unknown as typeof fetch,
      now: () => 1_000,
    });

    const onComplete = vi.fn();
    for await (const _chunk of bridge.streamChat(
      [{ role: "user", content: "summarize this" }],
      {
        signal: new AbortController().signal,
        onComplete,
        onError: vi.fn(),
        skillId: "builtin:summarize",
        requestId: "bridge-req-persist-err",
      },
    )) {
      // drain
    }

    const completeArg = onComplete.mock.calls[0]?.[0] as
      | { persistenceError?: unknown }
      | undefined;
    expect(completeArg?.persistenceError).toBeDefined();
    expect(logger.info).toHaveBeenCalledWith(
      "ai_cost_persistence_degraded",
      expect.objectContaining({
        requestId: "bridge-req-persist-err",
      }),
    );
  });

  it("maps mid-stream failure with accumulated text to partial-result", async () => {
    const db = createDb();
    putSetting(db, "creonow.ai.model.primary", "gpt-4.1");
    putSetting(db, "creonow.ai.model.auxiliary", "gpt-4.1-mini");

    const bridge = createAiServiceBridge({
      db,
      logger: createLogger(),
      costTracker: createCostTracker({
        pricingTable: createPricingTable(),
        budgetPolicy: {
          warningThreshold: 10,
          hardStopLimit: 100,
          enabled: false,
        },
        estimateTokens: () => 0,
      }),
      env: {
        CREONOW_AI_PROVIDER: "openai",
        CREONOW_AI_BASE_URL: "https://api.openai.com",
        CREONOW_AI_API_KEY: "sk-test",
      },
      runtimeAiTimeoutMs: 30_000,
      fetchImpl: (async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(
                  [
                    'data: {"choices":[{"delta":{"content":"partial "}}]}',
                    "",
                    "data: {broken-json}",
                    "",
                  ].join("\n"),
                ),
              );
              controller.close();
            },
          }),
          { status: 200, headers: { "content-type": "text/event-stream" } },
        )) as unknown as typeof fetch,
    });

    const onComplete = vi.fn();
    const onError = vi.fn();
    const gen = bridge.streamChat([{ role: "user", content: "x" }], {
      signal: new AbortController().signal,
      onComplete,
      onError,
      skillId: "builtin:continue",
      requestId: "bridge-req-partial",
    });

    const firstChunk = await gen.next();
    expect(firstChunk.done).toBe(false);
    expect(firstChunk.value?.delta).toBe("partial ");

    await expect(gen.next()).rejects.toMatchObject({
      kind: "partial-result",
      partialContent: "partial ",
    });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "partial-result",
        partialContent: "partial ",
      }),
    );
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("throws AbortError when signal is already aborted", async () => {
    const db = createDb();
    putSetting(db, "creonow.ai.model.primary", "gpt-4.1");
    putSetting(db, "creonow.ai.model.auxiliary", "gpt-4.1-mini");

    const bridge = createAiServiceBridge({
      db,
      logger: createLogger(),
      costTracker: createCostTracker({
        pricingTable: createPricingTable(),
        budgetPolicy: {
          warningThreshold: 10,
          hardStopLimit: 100,
          enabled: false,
        },
        estimateTokens: () => 0,
      }),
      env: {
        CREONOW_AI_PROVIDER: "openai",
        CREONOW_AI_BASE_URL: "https://api.openai.com",
        CREONOW_AI_API_KEY: "sk-test",
      },
      runtimeAiTimeoutMs: 30_000,
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });

    const abortController = new AbortController();
    abortController.abort();
    const onError = vi.fn();
    const gen = bridge.streamChat([{ role: "user", content: "x" }], {
      signal: abortController.signal,
      onComplete: vi.fn(),
      onError,
    });

    await expect(gen.next()).rejects.toMatchObject({
      name: "AbortError",
      kind: "aborted",
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it("stops before upstream request when signal aborts during provider selection", async () => {
    const db = createDb();
    putSetting(db, "creonow.ai.model.primary", "gpt-4.1");
    putSetting(db, "creonow.ai.model.auxiliary", "gpt-4.1-mini");

    let releaseRoute: () => void = () => {};
    const routeWait = new Promise<void>((resolve) => {
      releaseRoute = resolve;
    });
    const mockedRouter: ModelRouter = {
      selectProvider: async () => {
        await routeWait;
        return {
          ok: true,
          data: {
            provider: "openai",
            baseUrl: "https://api.openai.com",
            apiKey: "sk-test",
            timeoutMs: 30_000,
            model: "gpt-4.1-mini",
            maxTokens: 4096,
            temperature: 0.7,
            taskType: "auxiliary",
          },
        };
      },
    };
    const routerSpy = vi
      .spyOn(modelRouterModule, "createModelRouter")
      .mockReturnValue(mockedRouter);

    try {
      const fetchMock = vi.fn();
      const bridge = createAiServiceBridge({
        db,
        logger: createLogger(),
        costTracker: createCostTracker({
          pricingTable: createPricingTable(),
          budgetPolicy: {
            warningThreshold: 10,
            hardStopLimit: 100,
            enabled: false,
          },
          estimateTokens: () => 0,
        }),
        env: {
          CREONOW_AI_PROVIDER: "openai",
          CREONOW_AI_BASE_URL: "https://api.openai.com",
          CREONOW_AI_API_KEY: "sk-test",
        },
        runtimeAiTimeoutMs: 30_000,
        fetchImpl: fetchMock as unknown as typeof fetch,
      });

      const abortController = new AbortController();
      const onError = vi.fn();
      const onApiCallStarted = vi.fn();
      const gen = bridge.streamChat([{ role: "user", content: "x" }], {
        signal: abortController.signal,
        onComplete: vi.fn(),
        onError,
        onApiCallStarted,
        skillId: "builtin:continue",
      });

      const firstNext = gen.next();
      abortController.abort();
      releaseRoute();

      await expect(firstNext).rejects.toMatchObject({
        name: "AbortError",
        kind: "aborted",
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      expect(onApiCallStarted).not.toHaveBeenCalled();
    } finally {
      routerSpy.mockRestore();
    }
  });

  it("rejects anthropic provider for bridge path", async () => {
    const db = createDb();
    putSetting(db, "creonow.ai.model.primary", "claude-sonnet-4-5");
    putSetting(db, "creonow.ai.model.auxiliary", "claude-sonnet-4-5");

    const fetchMock = vi.fn();
    const bridge = createAiServiceBridge({
      db,
      logger: createLogger(),
      costTracker: createCostTracker({
        pricingTable: createPricingTable(),
        budgetPolicy: {
          warningThreshold: 10,
          hardStopLimit: 100,
          enabled: false,
        },
        estimateTokens: () => 0,
      }),
      env: {
        CREONOW_AI_PROVIDER: "anthropic",
        CREONOW_AI_BASE_URL: "https://api.anthropic.com",
        CREONOW_AI_API_KEY: "ant-test",
      },
      runtimeAiTimeoutMs: 30_000,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const onError = vi.fn();
    const gen = bridge.streamChat([{ role: "user", content: "x" }], {
      signal: new AbortController().signal,
      onComplete: vi.fn(),
      onError,
      skillId: "builtin:continue",
    });

    await expect(gen.next()).rejects.toMatchObject({
      kind: "unsupported-provider",
    });
    expect(onError).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
