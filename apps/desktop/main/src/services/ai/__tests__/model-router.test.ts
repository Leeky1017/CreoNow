/**
 * ModelRouter + ModelConfig + ApiClient — 综合测试
 * Issue: #89 — feat: ModelRouter with OpenAI-compatible API support
 *
 * Covers:
 * - Model config resolution (dual/single/none)
 * - Task-based routing
 * - API request format validation
 * - SSE streaming parse
 * - Error classification (401, 429, 500, network)
 * - Cost recording (known model → price, unknown → cost=0)
 * - Edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  resolveModelConfig,
  getModelForTask,
  ModelConfigError,
  type ModelSettings,
  type TaskType,
} from "../modelConfig";

import {
  createModelRouter,
  ProviderUnavailableError,
  type ProviderResolverLike,
} from "../modelRouter";

import type { ProviderConfig } from "../providerResolver";

import {
  classifyError,
  parseSSELine,
  parseSSEBody,
  buildChatCompletionRequest,
  createApiClient,
  type ChatMessage,
  type StreamChunkPayload,
} from "../apiClient";

import type {
  CostTracker,
  ModelPricingTable,
  BudgetPolicy,
} from "../costTracker";
import { createCostTracker } from "../costTracker";
import { estimateTokens } from "@shared/tokenBudget";

// ─── Test helpers ───────────────────────────────────────────────────

function makeProviderConfig(
  overrides?: Partial<ProviderConfig>,
): ProviderConfig {
  return {
    provider: "proxy",
    baseUrl: "https://api.example.com",
    apiKey: "sk-test-key",
    timeoutMs: 30_000,
    ...overrides,
  };
}

function makeProviderResolver(
  config?: ProviderConfig,
): ProviderResolverLike {
  const primary = config ?? makeProviderConfig();
  return {
    resolve: () => ({ primary, backup: null }),
  };
}

function makePricingTable(): ModelPricingTable {
  return {
    prices: {
      "gpt-4o": {
        modelId: "gpt-4o",
        displayName: "GPT-4o",
        inputPricePer1K: 0.0025,
        outputPricePer1K: 0.01,
        effectiveDate: "2024-01-01T00:00:00Z",
      },
    },
    currency: "USD",
    lastUpdated: new Date().toISOString(),
  };
}

function makeBudgetPolicy(): BudgetPolicy {
  return { warningThreshold: 10, hardStopLimit: 50, enabled: false };
}

function makeCostTracker(): CostTracker {
  return createCostTracker({
    pricingTable: makePricingTable(),
    budgetPolicy: makeBudgetPolicy(),
    estimateTokens,
  });
}

// ─── ModelConfig Tests ──────────────────────────────────────────────

describe("ModelConfig — resolveModelConfig", () => {
  it("dual model → primary for writing/general, auxiliary for judge/embedding", () => {
    const settings: ModelSettings = {
      primaryModel: "gpt-4o",
      auxiliaryModel: "gpt-4o-mini",
    };

    const assignment = resolveModelConfig(settings);

    expect(assignment.writing).toBe("gpt-4o");
    expect(assignment.general).toBe("gpt-4o");
    expect(assignment.judge).toBe("gpt-4o-mini");
    expect(assignment.embedding).toBe("gpt-4o-mini");
  });

  it("only primary → shared across all tasks", () => {
    const settings: ModelSettings = {
      primaryModel: "gpt-4o",
      auxiliaryModel: null,
    };

    const assignment = resolveModelConfig(settings);

    expect(assignment.writing).toBe("gpt-4o");
    expect(assignment.general).toBe("gpt-4o");
    expect(assignment.judge).toBe("gpt-4o");
    expect(assignment.embedding).toBe("gpt-4o");
  });

  it("only auxiliary → shared across all tasks", () => {
    const settings: ModelSettings = {
      primaryModel: undefined,
      auxiliaryModel: "claude-sonnet-4-20250514",
    };

    const assignment = resolveModelConfig(settings);

    expect(assignment.writing).toBe("claude-sonnet-4-20250514");
    expect(assignment.judge).toBe("claude-sonnet-4-20250514");
  });

  it("no model → throws ModelConfigError with clear message", () => {
    const settings: ModelSettings = {
      primaryModel: null,
      auxiliaryModel: null,
    };

    expect(() => resolveModelConfig(settings)).toThrow(ModelConfigError);
    expect(() => resolveModelConfig(settings)).toThrow(/No model configured/);
  });

  it("empty string model → treated as null", () => {
    const settings: ModelSettings = {
      primaryModel: "  ",
      auxiliaryModel: "",
    };

    expect(() => resolveModelConfig(settings)).toThrow(ModelConfigError);
  });

  it("trims whitespace from model names", () => {
    const settings: ModelSettings = {
      primaryModel: "  gpt-4o  ",
      auxiliaryModel: null,
    };

    const assignment = resolveModelConfig(settings);
    expect(assignment.writing).toBe("gpt-4o");
  });

  it("undefined values → treated as null", () => {
    const settings: ModelSettings = {
      primaryModel: undefined,
      auxiliaryModel: undefined,
    };

    expect(() => resolveModelConfig(settings)).toThrow(ModelConfigError);
  });
});

describe("ModelConfig — getModelForTask", () => {
  it("returns correct model for each task type", () => {
    const settings: ModelSettings = {
      primaryModel: "gpt-4o",
      auxiliaryModel: "gpt-4o-mini",
    };

    expect(getModelForTask(settings, "writing")).toBe("gpt-4o");
    expect(getModelForTask(settings, "general")).toBe("gpt-4o");
    expect(getModelForTask(settings, "judge")).toBe("gpt-4o-mini");
    expect(getModelForTask(settings, "embedding")).toBe("gpt-4o-mini");
  });
});

// ─── ModelRouter Tests ──────────────────────────────────────────────

describe("ModelRouter — createModelRouter", () => {
  it("routes writing task to primary model with provider config", () => {
    const router = createModelRouter({
      settings: { primaryModel: "gpt-4o", auxiliaryModel: "gpt-4o-mini" },
      providerResolver: makeProviderResolver(),
    });

    const routed = router.route("writing");

    expect(routed.model).toBe("gpt-4o");
    expect(routed.taskType).toBe("writing");
    expect(routed.provider).toBe("proxy");
    expect(routed.baseUrl).toBe("https://api.example.com");
    expect(routed.apiKey).toBe("sk-test-key");
    expect(routed.timeoutMs).toBe(30_000);
  });

  it("routes judge task to auxiliary model", () => {
    const router = createModelRouter({
      settings: { primaryModel: "gpt-4o", auxiliaryModel: "gpt-4o-mini" },
      providerResolver: makeProviderResolver(),
    });

    const routed = router.route("judge");
    expect(routed.model).toBe("gpt-4o-mini");
  });

  it("single model → all task types get same model", () => {
    const router = createModelRouter({
      settings: { primaryModel: "gpt-4o", auxiliaryModel: null },
      providerResolver: makeProviderResolver(),
    });

    const tasks: TaskType[] = ["writing", "judge", "embedding", "general"];
    for (const task of tasks) {
      expect(router.route(task).model).toBe("gpt-4o");
    }
  });

  it("no model → throws ModelConfigError", () => {
    const router = createModelRouter({
      settings: { primaryModel: null, auxiliaryModel: null },
      providerResolver: makeProviderResolver(),
    });

    expect(() => router.route("writing")).toThrow(ModelConfigError);
  });

  it("provider resolution failure → throws ProviderUnavailableError", () => {
    const failingResolver: ProviderResolverLike = {
      resolve: () => {
        throw new Error("No provider configured");
      },
    };

    const router = createModelRouter({
      settings: { primaryModel: "gpt-4o", auxiliaryModel: null },
      providerResolver: failingResolver,
    });

    expect(() => router.route("writing")).toThrow(ProviderUnavailableError);
    expect(() => router.route("writing")).toThrow(/No provider configured/);
  });

  it("updateSettings → subsequent routes use new settings", () => {
    const router = createModelRouter({
      settings: { primaryModel: "gpt-4o", auxiliaryModel: null },
      providerResolver: makeProviderResolver(),
    });

    expect(router.route("writing").model).toBe("gpt-4o");

    router.updateSettings({
      primaryModel: "gpt-4o-mini",
      auxiliaryModel: "claude-sonnet-4-20250514",
    });

    expect(router.route("writing").model).toBe("gpt-4o-mini");
    expect(router.route("judge").model).toBe("claude-sonnet-4-20250514");
  });
});

// ─── Error Classification Tests ─────────────────────────────────────

describe("ApiClient — classifyError", () => {
  it("401 → auth error, non-retryable", () => {
    const err = classifyError({ status: 401, message: "Unauthorized" });
    expect(err.kind).toBe("auth");
    expect(err.retryable).toBe(false);
  });

  it("403 → auth error, non-retryable", () => {
    const err = classifyError({ status: 403, message: "Forbidden" });
    expect(err.kind).toBe("auth");
    expect(err.retryable).toBe(false);
  });

  it("429 → rate-limit, retryable", () => {
    const err = classifyError({ status: 429, message: "Rate limited" });
    expect(err.kind).toBe("rate-limit");
    expect(err.retryable).toBe(true);
  });

  it("500 → server error, retryable", () => {
    const err = classifyError({
      status: 500,
      message: "Internal Server Error",
    });
    expect(err.kind).toBe("server");
    expect(err.retryable).toBe(true);
  });

  it("502 → server error, retryable", () => {
    const err = classifyError({ status: 502, message: "Bad Gateway" });
    expect(err.kind).toBe("server");
    expect(err.retryable).toBe(true);
  });

  it("null status → network error, retryable", () => {
    const err = classifyError({ status: null, message: "ECONNREFUSED" });
    expect(err.kind).toBe("network");
    expect(err.retryable).toBe(true);
  });

  it("400 → unknown, non-retryable", () => {
    const err = classifyError({ status: 400, message: "Bad request" });
    expect(err.kind).toBe("unknown");
    expect(err.retryable).toBe(false);
  });
});

// ─── SSE Parse Tests ────────────────────────────────────────────────

describe("ApiClient — parseSSELine", () => {
  it("parses data line into StreamChunkPayload", () => {
    const payload: StreamChunkPayload = {
      id: "chatcmpl-123",
      choices: [
        { index: 0, delta: { content: "Hello" }, finish_reason: null },
      ],
    };

    const result = parseSSELine(`data: ${JSON.stringify(payload)}`);
    expect(result).not.toBe("done");
    expect(result).not.toBeNull();

    const parsed = result as StreamChunkPayload;
    expect(parsed.id).toBe("chatcmpl-123");
    expect(parsed.choices[0].delta.content).toBe("Hello");
  });

  it("returns 'done' for [DONE] signal", () => {
    expect(parseSSELine("data: [DONE]")).toBe("done");
  });

  it("returns null for empty lines", () => {
    expect(parseSSELine("")).toBeNull();
    expect(parseSSELine("  ")).toBeNull();
  });

  it("returns null for comment lines", () => {
    expect(parseSSELine(": this is a comment")).toBeNull();
  });

  it("returns null for non-data lines", () => {
    expect(parseSSELine("event: message")).toBeNull();
  });

  it("handles data line with extra whitespace", () => {
    const payload: StreamChunkPayload = {
      id: "test",
      choices: [
        { index: 0, delta: { content: "x" }, finish_reason: null },
      ],
    };
    const result = parseSSELine(`data:   ${JSON.stringify(payload)}  `);
    expect(result).not.toBeNull();
    expect((result as StreamChunkPayload).id).toBe("test");
  });

  it("throws on invalid JSON after data:", () => {
    expect(() => parseSSELine("data: {invalid json}")).toThrow();
  });
});

describe("ApiClient — parseSSEBody", () => {
  it("parses multi-line SSE body into chunks", () => {
    const chunk1: StreamChunkPayload = {
      id: "1",
      choices: [
        { index: 0, delta: { content: "Hello" }, finish_reason: null },
      ],
    };
    const chunk2: StreamChunkPayload = {
      id: "2",
      choices: [
        { index: 0, delta: { content: " world" }, finish_reason: "stop" },
      ],
    };

    const body = [
      `data: ${JSON.stringify(chunk1)}`,
      "",
      `data: ${JSON.stringify(chunk2)}`,
      "",
      "data: [DONE]",
      "",
    ].join("\n");

    const chunks = parseSSEBody(body);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].choices[0].delta.content).toBe("Hello");
    expect(chunks[1].choices[0].delta.content).toBe(" world");
  });

  it("stops at [DONE] — ignores lines after", () => {
    const chunk: StreamChunkPayload = {
      id: "1",
      choices: [
        { index: 0, delta: { content: "text" }, finish_reason: null },
      ],
    };
    const afterDone: StreamChunkPayload = {
      id: "2",
      choices: [
        {
          index: 0,
          delta: { content: "should not appear" },
          finish_reason: null,
        },
      ],
    };

    const body = [
      `data: ${JSON.stringify(chunk)}`,
      "data: [DONE]",
      `data: ${JSON.stringify(afterDone)}`,
    ].join("\n");

    const chunks = parseSSEBody(body);
    expect(chunks).toHaveLength(1);
  });

  it("handles empty body", () => {
    expect(parseSSEBody("")).toHaveLength(0);
  });
});

// ─── Request Builder Tests ──────────────────────────────────────────

describe("ApiClient — buildChatCompletionRequest", () => {
  const provider = {
    provider: "proxy" as const,
    baseUrl: "https://api.example.com/",
    apiKey: "sk-test",
    timeoutMs: 30_000,
    model: "gpt-4o",
    taskType: "writing" as const,
  };

  it("builds correct URL with trailing slash normalization", () => {
    const { url } = buildChatCompletionRequest({
      provider,
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(url).toBe("https://api.example.com/v1/chat/completions");
  });

  it("includes Authorization header when apiKey is present", () => {
    const { init } = buildChatCompletionRequest({
      provider,
      messages: [{ role: "user", content: "Hello" }],
    });

    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-test");
  });

  it("omits Authorization header when apiKey is undefined", () => {
    const { init } = buildChatCompletionRequest({
      provider: { ...provider, apiKey: undefined },
      messages: [{ role: "user", content: "Hello" }],
    });

    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("sets stream=true and Accept header for streaming", () => {
    const { init } = buildChatCompletionRequest({
      provider,
      messages: [{ role: "user", content: "Hello" }],
      stream: true,
    });

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.stream).toBe(true);

    const headers = init.headers as Record<string, string>;
    expect(headers["Accept"]).toBe("text/event-stream");
  });

  it("includes model in request body", () => {
    const { init } = buildChatCompletionRequest({
      provider,
      messages: [{ role: "user", content: "Hello" }],
    });

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.model).toBe("gpt-4o");
  });

  it("includes temperature and max_tokens when specified", () => {
    const { init } = buildChatCompletionRequest({
      provider,
      messages: [{ role: "user", content: "Hello" }],
      temperature: 0.5,
      maxTokens: 1024,
    });

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.temperature).toBe(0.5);
    expect(body.max_tokens).toBe(1024);
  });

  it("omits temperature and max_tokens when not specified", () => {
    const { init } = buildChatCompletionRequest({
      provider,
      messages: [{ role: "user", content: "Hello" }],
    });

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.temperature).toBeUndefined();
    expect(body.max_tokens).toBeUndefined();
  });

  it("includes messages in correct format", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Hello" },
    ];

    const { init } = buildChatCompletionRequest({ provider, messages });

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.messages).toEqual(messages);
  });
});

// ─── ApiClient Integration Tests ────────────────────────────────────

describe("ApiClient — chatCompletion", () => {
  let costTracker: CostTracker;

  beforeEach(() => {
    costTracker = makeCostTracker();
  });

  afterEach(() => {
    costTracker.dispose();
  });

  it("successful request → returns response and records cost", async () => {
    const mockResponse = {
      id: "chatcmpl-123",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "Hi there!" },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
      model: "gpt-4o",
    };

    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createApiClient({ costTracker, fetchFn });

    const provider = {
      provider: "proxy" as const,
      baseUrl: "https://api.example.com",
      apiKey: "sk-test",
      timeoutMs: 30_000,
      model: "gpt-4o",
      taskType: "writing" as const,
    };

    const result = await client.chatCompletion({
      provider,
      messages: [{ role: "user", content: "Hello" }],
      skillId: "test-skill",
    });

    expect(result.response.choices[0].message.content).toBe("Hi there!");
    expect(result.cost.modelId).toBe("gpt-4o");
    expect(result.cost.inputTokens).toBe(10);
    expect(result.cost.outputTokens).toBe(5);

    // Verify session cost updated (INV-9)
    const session = costTracker.getSessionCost();
    expect(session.totalRequests).toBe(1);
  });

  it("network error → throws with apiError.kind=network", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const client = createApiClient({ costTracker, fetchFn });

    const provider = {
      provider: "proxy" as const,
      baseUrl: "https://api.example.com",
      apiKey: "sk-test",
      timeoutMs: 30_000,
      model: "gpt-4o",
      taskType: "writing" as const,
    };

    await expect(
      client.chatCompletion({
        provider,
        messages: [{ role: "user", content: "Hello" }],
        skillId: "test-skill",
      }),
    ).rejects.toThrow("ECONNREFUSED");
  });

  it("401 response → throws with apiError.kind=auth", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "Invalid API key" } }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createApiClient({ costTracker, fetchFn });

    const provider = {
      provider: "proxy" as const,
      baseUrl: "https://api.example.com",
      apiKey: "sk-bad",
      timeoutMs: 30_000,
      model: "gpt-4o",
      taskType: "writing" as const,
    };

    try {
      await client.chatCompletion({
        provider,
        messages: [{ role: "user", content: "Hello" }],
        skillId: "test-skill",
      });
      expect.fail("should have thrown");
    } catch (err: unknown) {
      const e = err as Error & {
        apiError: { kind: string; retryable: boolean };
      };
      expect(e.apiError.kind).toBe("auth");
      expect(e.apiError.retryable).toBe(false);
    }
  });

  it("429 response → throws with apiError.kind=rate-limit", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "Rate limited" } }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createApiClient({ costTracker, fetchFn });

    const provider = {
      provider: "proxy" as const,
      baseUrl: "https://api.example.com",
      apiKey: "sk-test",
      timeoutMs: 30_000,
      model: "gpt-4o",
      taskType: "writing" as const,
    };

    try {
      await client.chatCompletion({
        provider,
        messages: [{ role: "user", content: "Hello" }],
        skillId: "test-skill",
      });
      expect.fail("should have thrown");
    } catch (err: unknown) {
      const e = err as Error & {
        apiError: { kind: string; retryable: boolean };
      };
      expect(e.apiError.kind).toBe("rate-limit");
      expect(e.apiError.retryable).toBe(true);
    }
  });

  it("500 response → throws with apiError.kind=server", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response("Internal Server Error", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    const client = createApiClient({ costTracker, fetchFn });

    const provider = {
      provider: "proxy" as const,
      baseUrl: "https://api.example.com",
      apiKey: "sk-test",
      timeoutMs: 30_000,
      model: "gpt-4o",
      taskType: "writing" as const,
    };

    try {
      await client.chatCompletion({
        provider,
        messages: [{ role: "user", content: "Hello" }],
        skillId: "test-skill",
      });
      expect.fail("should have thrown");
    } catch (err: unknown) {
      const e = err as Error & {
        apiError: { kind: string; retryable: boolean };
      };
      expect(e.apiError.kind).toBe("server");
      expect(e.apiError.retryable).toBe(true);
    }
  });

  it("unknown model → cost=0 recorded (INV-9)", async () => {
    const mockResponse = {
      id: "chatcmpl-456",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "Ok" },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
      model: "unknown-model-xyz",
    };

    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createApiClient({ costTracker, fetchFn });

    const provider = {
      provider: "proxy" as const,
      baseUrl: "https://api.example.com",
      apiKey: "sk-test",
      timeoutMs: 30_000,
      model: "unknown-model-xyz",
      taskType: "general" as const,
    };

    const result = await client.chatCompletion({
      provider,
      messages: [{ role: "user", content: "Hello" }],
      skillId: "test-skill",
    });

    // Unknown model → CostTracker returns cost=0 with warning
    expect(result.cost.cost).toBe(0);
    expect(result.cost.warning).toBe("COST_MODEL_NOT_FOUND");
    expect(result.cost.inputTokens).toBe(100);
    expect(result.cost.outputTokens).toBe(50);
  });

  it("known model → cost correctly calculated (INV-9)", async () => {
    const mockResponse = {
      id: "chatcmpl-789",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "Ok" },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 1000,
        completion_tokens: 500,
        total_tokens: 1500,
      },
      model: "gpt-4o",
    };

    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createApiClient({ costTracker, fetchFn });

    const provider = {
      provider: "proxy" as const,
      baseUrl: "https://api.example.com",
      apiKey: "sk-test",
      timeoutMs: 30_000,
      model: "gpt-4o",
      taskType: "general" as const,
    };

    const result = await client.chatCompletion({
      provider,
      messages: [{ role: "user", content: "Hello" }],
      skillId: "test-skill",
    });

    // gpt-4o: input 0.0025/1K, output 0.01/1K
    // cost = (1000/1000)*0.0025 + (500/1000)*0.01 = 0.0025 + 0.005 = 0.0075
    expect(result.cost.cost).toBeCloseTo(0.0075, 6);
    expect(result.cost.warning).toBeUndefined();
  });
});

describe("ApiClient — streamChatCompletion", () => {
  let costTracker: CostTracker;

  beforeEach(() => {
    costTracker = makeCostTracker();
  });

  afterEach(() => {
    costTracker.dispose();
  });

  function makeSSEStream(lines: string[]): ReadableStream<Uint8Array> {
    const text = lines.join("\n") + "\n";
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });
  }

  it("yields parsed chunks from SSE stream", async () => {
    const chunk1: StreamChunkPayload = {
      id: "1",
      choices: [
        { index: 0, delta: { content: "Hello" }, finish_reason: null },
      ],
    };
    const chunk2: StreamChunkPayload = {
      id: "2",
      choices: [
        { index: 0, delta: { content: " world" }, finish_reason: "stop" },
      ],
      usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
    };

    const sseBody = makeSSEStream([
      `data: ${JSON.stringify(chunk1)}`,
      "",
      `data: ${JSON.stringify(chunk2)}`,
      "",
      "data: [DONE]",
    ]);

    const fetchFn = vi.fn().mockResolvedValue(
      new Response(sseBody, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const client = createApiClient({ costTracker, fetchFn });

    const provider = {
      provider: "proxy" as const,
      baseUrl: "https://api.example.com",
      apiKey: "sk-test",
      timeoutMs: 30_000,
      model: "gpt-4o",
      taskType: "writing" as const,
    };

    const chunks: StreamChunkPayload[] = [];
    for await (const chunk of client.streamChatCompletion({
      provider,
      messages: [{ role: "user", content: "Hello" }],
      skillId: "stream-skill",
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[0].choices[0].delta.content).toBe("Hello");
    expect(chunks[1].choices[0].delta.content).toBe(" world");

    // Cost should be recorded at stream end (INV-9)
    const session = costTracker.getSessionCost();
    expect(session.totalRequests).toBe(1);
  });

  it("network error in streaming → throws with apiError", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValue(new Error("Connection reset"));

    const client = createApiClient({ costTracker, fetchFn });

    const provider = {
      provider: "proxy" as const,
      baseUrl: "https://api.example.com",
      apiKey: "sk-test",
      timeoutMs: 30_000,
      model: "gpt-4o",
      taskType: "writing" as const,
    };

    await expect(async () => {
      for await (const _chunk of client.streamChatCompletion({
        provider,
        messages: [{ role: "user", content: "Hello" }],
        skillId: "stream-skill",
      })) {
        // should not reach here
      }
    }).rejects.toThrow("Connection reset");
  });

  it("401 in streaming → throws with auth error", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "Bad key" } }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createApiClient({ costTracker, fetchFn });

    const provider = {
      provider: "proxy" as const,
      baseUrl: "https://api.example.com",
      apiKey: "sk-bad",
      timeoutMs: 30_000,
      model: "gpt-4o",
      taskType: "writing" as const,
    };

    try {
      for await (const _chunk of client.streamChatCompletion({
        provider,
        messages: [{ role: "user", content: "Hello" }],
        skillId: "stream-skill",
      })) {
        // should not reach here
      }
      expect.fail("should have thrown");
    } catch (err: unknown) {
      const e = err as Error & { apiError: { kind: string } };
      expect(e.apiError.kind).toBe("auth");
    }
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────

describe("Edge Cases", () => {
  it("ModelRouter updateSettings to empty → throws on next route", () => {
    const router = createModelRouter({
      settings: { primaryModel: "gpt-4o", auxiliaryModel: null },
      providerResolver: makeProviderResolver(),
    });

    expect(router.route("writing").model).toBe("gpt-4o");

    router.updateSettings({ primaryModel: null, auxiliaryModel: null });

    expect(() => router.route("writing")).toThrow(ModelConfigError);
  });

  it("buildChatCompletionRequest with baseUrl without trailing slash", () => {
    const provider = {
      provider: "proxy" as const,
      baseUrl: "https://api.example.com",
      apiKey: "sk-test",
      timeoutMs: 30_000,
      model: "gpt-4o",
      taskType: "writing" as const,
    };

    const { url } = buildChatCompletionRequest({
      provider,
      messages: [],
    });

    expect(url).toBe("https://api.example.com/v1/chat/completions");
  });

  it("buildChatCompletionRequest with multiple trailing slashes", () => {
    const provider = {
      provider: "proxy" as const,
      baseUrl: "https://api.example.com///",
      apiKey: "sk-test",
      timeoutMs: 30_000,
      model: "gpt-4o",
      taskType: "writing" as const,
    };

    const { url } = buildChatCompletionRequest({
      provider,
      messages: [],
    });

    expect(url).toBe("https://api.example.com/v1/chat/completions");
  });

  it("resolveModelConfig preserves exact model strings", () => {
    const settings: ModelSettings = {
      primaryModel: "deepseek-chat-v3-0324",
      auxiliaryModel: null,
    };

    const assignment = resolveModelConfig(settings);
    expect(assignment.writing).toBe("deepseek-chat-v3-0324");
  });

  it("classifyError with edge status codes", () => {
    // 418 I'm a Teapot → unknown
    const err = classifyError({ status: 418, message: "Teapot" });
    expect(err.kind).toBe("unknown");
    expect(err.retryable).toBe(false);

    // 503 → server, retryable
    const err2 = classifyError({
      status: 503,
      message: "Service Unavailable",
    });
    expect(err2.kind).toBe("server");
    expect(err2.retryable).toBe(true);
  });

  it("parseSSELine handles data: with no space", () => {
    const payload: StreamChunkPayload = {
      id: "x",
      choices: [
        { index: 0, delta: { content: "y" }, finish_reason: null },
      ],
    };
    const result = parseSSELine(`data:${JSON.stringify(payload)}`);
    expect(result).not.toBeNull();
    expect((result as StreamChunkPayload).id).toBe("x");
  });
});
/**
 * ModelRouter + ModelConfig + ApiClient — 综合测试
 * Issue: #89 — feat: ModelRouter with OpenAI-compatible API support
 *
 * Covers:
 * - Model config resolution (dual/single/none)
 * - Task-based routing
 * - API request format validation
 * - SSE streaming parse
 * - Error classification (401, 429, 500, network)
 * - Cost recording (known model → price, unknown → cost=0)
 * - Edge cases
 */

