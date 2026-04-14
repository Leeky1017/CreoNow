/**
 * Tests for AiService methods: listModels, cancel, feedback, and rate limiting.
 *
 * Validates behavior contracts without reaching into implementation details.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AiStreamEvent } from "@shared/types/ai";
import type { Logger } from "../../../logging/logger";
import { createAiService, type AiService } from "../aiService";
import type { TraceStore } from "../traceStore";

type TestLogger = Logger & {
  warn: ReturnType<typeof vi.fn>;
};

function createTestLogger(): TestLogger {
  return {
    logPath: "<test>",
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

let fetchMock: ReturnType<typeof vi.fn>;
let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function makeService(overrides?: {
  rateLimitPerMinute?: number;
  retryBackoffMs?: readonly number[];
  sessionTokenBudget?: number;
  env?: NodeJS.ProcessEnv;
  logger?: TestLogger;
  traceStore?: Partial<TraceStore>;
}): AiService {
  return createAiService({
    logger: (overrides?.logger ?? createTestLogger()) as Logger,
    env: {
      CREONOW_AI_PROVIDER: "openai",
      CREONOW_AI_BASE_URL: "https://api.openai.com",
      CREONOW_AI_API_KEY: "sk-test-key-12345678",
      ...overrides?.env,
    },
    sleep: async () => {},
    rateLimitPerMinute: overrides?.rateLimitPerMinute ?? 1_000,
    retryBackoffMs: overrides?.retryBackoffMs ?? [0],
    sessionTokenBudget: overrides?.sessionTokenBudget,
    traceStore: overrides?.traceStore as never,
  });
}

function createBrokenSseResponse(message: string): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.error(new Error(message));
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

// ── listModels ──

describe("aiService.listModels", () => {
  it("返回 OpenAI 模型列表", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            { id: "gpt-4o", name: "GPT-4o" },
            { id: "gpt-4o-mini", name: "GPT-4o Mini" },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const svc = makeService();
    const res = await svc.listModels();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.source).toBe("openai");
      expect(res.data.items.length).toBeGreaterThanOrEqual(2);
      expect(res.data.items[0].id).toBe("gpt-4o");
    }
  });

  it("上游返回 401 → 映射为 AI_AUTH_FAILED", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    const svc = makeService();
    const res = await svc.listModels();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("AI_AUTH_FAILED");
    }
  });

  it("上游返回 429 → 映射为 AI_RATE_LIMITED", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Too many requests" } }), {
        status: 429,
        headers: { "content-type": "application/json" },
      }),
    );

    const svc = makeService();
    const res = await svc.listModels();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("AI_RATE_LIMITED");
    }
  });

  it("上游返回 500 → 映射为 LLM_API_ERROR", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Server error" } }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );

    const svc = makeService();
    const res = await svc.listModels();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("LLM_API_ERROR");
    }
  });

  it("上游返回非 JSON → LLM_API_ERROR", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("<!DOCTYPE html><html>...</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    const svc = makeService();
    const res = await svc.listModels();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("LLM_API_ERROR");
    }
  });

  it("网络故障重试后仍失败 → LLM_API_ERROR", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const svc = makeService({ retryBackoffMs: [0] });
    const res = await svc.listModels();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("LLM_API_ERROR");
      expect(res.error.message).toContain("ECONNREFUSED");
    }
  });

  it("Anthropic provider 使用 x-api-key 头", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ data: [{ id: "claude-3-5-sonnet", name: "Claude" }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const svc = makeService({
      env: {
        CREONOW_AI_PROVIDER: "anthropic",
        CREONOW_AI_BASE_URL: "https://api.anthropic.com",
        CREONOW_AI_API_KEY: "sk-ant-test-12345678",
      },
    });
    await svc.listModels();

    const calledInit = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = calledInit.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-test-12345678");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
  });
});

// ── cancel ──

describe("aiService.cancel", () => {
  it("缺少 executionId → INVALID_ARGUMENT", () => {
    const svc = makeService();
    const res = svc.cancel({ ts: Date.now() });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("空白 executionId → INVALID_ARGUMENT", () => {
    const svc = makeService();
    const res = svc.cancel({ executionId: "   ", ts: Date.now() });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("不存在的 executionId → 幂等成功", () => {
    const svc = makeService();
    const res = svc.cancel({ executionId: "nonexistent-id", ts: Date.now() });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.canceled).toBe(true);
    }
  });

  it("使用 deprecated runId 字段也正常工作", () => {
    const svc = makeService();
    const res = svc.cancel({ runId: "nonexistent-run", ts: Date.now() });
    expect(res.ok).toBe(true);
  });
});

// ── feedback ──

describe("aiService.feedback", () => {
  it("无 traceStore 时也返回成功", () => {
    const svc = makeService();
    const res = svc.feedback({
      runId: "run-1",
      action: "accept",
      evidenceRef: "doc://test",
      ts: Date.now(),
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.recorded).toBe(true);
    }
  });

  it("traceStore 存在时委托并返回成功", () => {
    const recordFn = vi.fn().mockReturnValue({ ok: true, data: { recorded: true } });
    const svc = makeService({
      traceStore: { recordTraceFeedback: recordFn },
    });
    const res = svc.feedback({
      runId: "run-1",
      action: "reject",
      evidenceRef: "doc://test",
      ts: 1234567890,
    });
    expect(res.ok).toBe(true);
    expect(recordFn).toHaveBeenCalledWith({
      runId: "run-1",
      action: "reject",
      evidenceRef: "doc://test",
      ts: 1234567890,
    });
  });

  it("traceStore 持久化失败 → 返回错误", () => {
    const recordFn = vi.fn().mockReturnValue({
      ok: false,
      error: { code: "DB_ERROR", message: "write failed" },
    });
    const svc = makeService({
      traceStore: { recordTraceFeedback: recordFn },
    });
    const res = svc.feedback({
      runId: "run-1",
      action: "accept",
      evidenceRef: "doc://test",
      ts: Date.now(),
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("DB_ERROR");
    }
  });
});

// ── rate limiting ──

describe("aiService rate limiting", () => {
  it("超出每分钟请求限制 → AI_RATE_LIMITED", async () => {
    fetchMock.mockImplementation(async () =>
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const svc = makeService({ rateLimitPerMinute: 2 });

    const r1 = await svc.listModels();
    expect(r1.ok).toBe(true);

    const r2 = await svc.listModels();
    expect(r2.ok).toBe(true);

    const r3 = await svc.listModels();
    expect(r3.ok).toBe(false);
    if (!r3.ok) {
      expect(r3.error.code).toBe("AI_RATE_LIMITED");
    }
  });
});

// ── retry ──

describe("aiService retry logic", () => {
  it("网络错误后重试成功", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [{ id: "gpt-4o", name: "GPT-4o" }] }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    const svc = makeService({ retryBackoffMs: [0, 0] });
    const res = await svc.listModels();
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retryBackoffMs 耗尽后放弃 → LLM_API_ERROR", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const svc = makeService({ retryBackoffMs: [0, 0] });
    const res = await svc.listModels();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("LLM_API_ERROR");
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

// ── runSkill basic validation ──

describe("aiService.runSkill basics", () => {
  it("正常 non-stream 请求返回 executionId 和文本", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Hello world" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const events: AiStreamEvent[] = [];
    const svc = makeService();
    const res = await svc.runSkill({
      skillId: "test",
      input: "Test prompt",
      mode: "ask",
      model: "gpt-4o",
      stream: false,
      ts: Date.now(),
      emitEvent: (e) => events.push(e),
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.executionId).toBeTruthy();
      expect(res.data.runId).toBeTruthy();
      expect(res.data.traceId).toBeTruthy();
      expect(res.data.outputText).toBe("Hello world");
    }
  });

  it("fetch 重试前记录可关联的请求上下文", async () => {
    const logger = createTestLogger();
    fetchMock
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "Hello world" } }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    const svc = makeService({ logger, retryBackoffMs: [0, 0] });
    const res = await svc.runSkill({
      skillId: "test",
      input: "Test prompt",
      mode: "ask",
      model: "gpt-4o",
      stream: false,
      ts: Date.now(),
      emitEvent: () => {},
    });

    expect(res.ok).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      "ai_fetch_transient_failure",
      expect.objectContaining({
        attempt: 0,
        provider: "openai",
        model: "gpt-4o",
        url: "https://api.openai.com/v1/chat/completions",
        executionId: expect.any(String),
        runId: expect.any(String),
        traceId: expect.any(String),
        message: "ECONNRESET",
      }),
    );
  });

  it("stream 模式返回成功结果", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        [
          `data: ${JSON.stringify({ choices: [{ delta: { content: "He" } }] })}\n\n`,
          `data: ${JSON.stringify({ choices: [{ delta: { content: "llo" } }] })}\n\n`,
          "data: [DONE]\n\n",
        ].join(""),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      ),
    );

    const events: AiStreamEvent[] = [];
    const svc = makeService();
    const res = await svc.runSkill({
      skillId: "test",
      input: "Test prompt",
      mode: "ask",
      model: "gpt-4o",
      stream: true,
      ts: Date.now(),
      emitEvent: (e) => events.push(e),
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.executionId).toBeTruthy();
      expect(res.data.runId).toBeTruthy();
      expect(res.data.traceId).toBeTruthy();
    }
  });

  it("stream 读取失败时记录 run/trace 级上下文", async () => {
    const logger = createTestLogger();
    const events: AiStreamEvent[] = [];
    fetchMock
      .mockResolvedValueOnce(createBrokenSseResponse("stream exploded"))
      .mockResolvedValueOnce(createBrokenSseResponse("stream exploded again"));

    const svc = makeService({ logger, retryBackoffMs: [0] });
    const res = await svc.runSkill({
      skillId: "test",
      input: "Test prompt",
      mode: "ask",
      model: "gpt-4o",
      stream: true,
      ts: Date.now(),
      emitEvent: (event) => events.push(event),
    });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const doneEvent = events.find(
      (event): event is AiStreamEvent & { type: "done" } => event.type === "done",
    );
    expect(doneEvent).toBeDefined();
    expect(doneEvent?.terminal).toBe("error");
    expect(doneEvent?.error).toEqual(
      expect.objectContaining({
        code: "LLM_API_ERROR",
        details: expect.objectContaining({
          reason: "STREAM_DISCONNECTED",
          retryable: true,
        }),
      }),
    );
    expect(res.ok).toBe(true);
    expect(logger.error).toHaveBeenCalledWith(
      "ai_stream_read_failed",
      expect.objectContaining({
        provider: "openai",
        model: "gpt-4o",
        url: "https://api.openai.com/v1/chat/completions",
        executionId: expect.any(String),
        runId: expect.any(String),
        traceId: expect.any(String),
        message: "stream exploded again",
      }),
    );
  });

  it("anthropic stream 读取失败时保持断连错误契约并记录上下文", async () => {
    const logger = createTestLogger();
    const events: AiStreamEvent[] = [];
    fetchMock
      .mockResolvedValueOnce(createBrokenSseResponse("anthropic stream exploded"))
      .mockResolvedValueOnce(
        createBrokenSseResponse("anthropic stream exploded again"),
      );

    const svc = makeService({
      logger,
      retryBackoffMs: [0],
      env: {
        CREONOW_AI_PROVIDER: "anthropic",
        CREONOW_AI_BASE_URL: "https://api.anthropic.com",
        CREONOW_AI_API_KEY: "sk-ant-test-12345678",
      },
    });
    const res = await svc.runSkill({
      skillId: "test",
      input: "Test prompt",
      mode: "ask",
      model: "claude-3-5-sonnet",
      stream: true,
      ts: Date.now(),
      emitEvent: (event) => events.push(event),
    });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const doneEvent = events.find(
      (event): event is AiStreamEvent & { type: "done" } => event.type === "done",
    );
    expect(doneEvent).toBeDefined();
    expect(doneEvent?.terminal).toBe("error");
    expect(doneEvent?.error).toEqual(
      expect.objectContaining({
        code: "LLM_API_ERROR",
        details: expect.objectContaining({
          reason: "STREAM_DISCONNECTED",
          retryable: true,
        }),
      }),
    );
    expect(res.ok).toBe(true);
    expect(logger.error).toHaveBeenCalledWith(
      "ai_anthropic_stream_read_failed",
      expect.objectContaining({
        provider: "anthropic",
        model: "claude-3-5-sonnet",
        url: "https://api.anthropic.com/v1/messages",
        executionId: expect.any(String),
        runId: expect.any(String),
        traceId: expect.any(String),
        message: "anthropic stream exploded again",
      }),
    );
  });

  it("stream completion 失败时保持 INTERNAL 终态并记录完整上下文", async () => {
    const logger = createTestLogger();
    const events: AiStreamEvent[] = [];
    const traceStore: TraceStore = {
      persistGenerationTrace: vi.fn(() => {
        throw new Error("trace store exploded");
      }),
      recordTraceFeedback: vi.fn(() => ({
        ok: true as const,
        data: { feedbackId: "feedback-1" },
      })),
      getTraceIdByRunId: vi.fn(() => null),
    };
    fetchMock.mockResolvedValueOnce(
      new Response(
        [
          `data: ${JSON.stringify({ choices: [{ delta: { content: "He" } }] })}\n\n`,
          `data: ${JSON.stringify({ choices: [{ delta: { content: "llo" } }] })}\n\n`,
          "data: [DONE]\n\n",
        ].join(""),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      ),
    );

    const svc = makeService({ logger, traceStore });
    const res = await svc.runSkill({
      skillId: "test",
      input: "Test prompt",
      mode: "ask",
      model: "gpt-4o",
      stream: true,
      ts: Date.now(),
      emitEvent: (event) => events.push(event),
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const doneEvent = events.find(
      (event): event is AiStreamEvent & { type: "done" } => event.type === "done",
    );
    expect(doneEvent).toBeDefined();
    expect(doneEvent?.terminal).toBe("error");
    expect(doneEvent?.error).toEqual(
      expect.objectContaining({
        code: "INTERNAL",
        message: "AI request failed",
        details: expect.objectContaining({
          message: "trace store exploded",
        }),
      }),
    );
    expect(res.ok).toBe(true);
    expect(logger.error).toHaveBeenCalledWith(
      "ai_stream_completion_failed",
      expect.objectContaining({
        provider: "openai",
        model: "gpt-4o",
        url: "https://api.openai.com/v1/chat/completions",
        executionId: expect.any(String),
        runId: expect.any(String),
        traceId: expect.any(String),
        message: "trace store exploded",
      }),
    );
  });

  it("tool call 参数 JSON 解析失败时记录 warning 并降级为 null arguments", async () => {
    const logger = createTestLogger();
    fetchMock.mockResolvedValueOnce(
      new Response(
        [
          `data: ${JSON.stringify({
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: "call_1",
                      function: { name: "lookup", arguments: "{" },
                    },
                  ],
                },
                finish_reason: "tool_calls",
              },
            ],
          })}\n\n`,
          "data: [DONE]\n\n",
        ].join(""),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      ),
    );

    const events: AiStreamEvent[] = [];
    const svc = makeService({ logger });
    const res = await svc.runSkill({
      skillId: "test",
      input: "Test prompt",
      mode: "ask",
      model: "gpt-4o",
      stream: true,
      ts: Date.now(),
      emitEvent: (e) => events.push(e),
    });

    expect(res.ok).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(
      "tool_call_json_parse_failed",
      expect.objectContaining({
        module: "ai-service",
        provider: "openai",
        toolCallId: "call_1",
        toolName: "lookup",
        rawJson: "{",
      }),
    );
  });
});
