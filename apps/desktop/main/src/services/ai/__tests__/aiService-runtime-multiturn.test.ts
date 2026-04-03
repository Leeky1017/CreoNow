import assert from "node:assert/strict";

import { describe, it } from "vitest";

import type { Logger } from "../../../logging/logger";
import type { AiStreamDoneEvent, AiStreamEvent } from "@shared/types/ai";
import { createAiService } from "../aiService";
import type { StreamResult } from "../streaming";

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: () => {},
    error: () => {},
  };
}

function createDoneWaiter(): {
  setExecutionId: (executionId: string) => void;
  onEvent: (event: AiStreamEvent) => void;
  promise: Promise<AiStreamDoneEvent>;
} {
  let expectedExecutionId: string | null = null;
  let bufferedDone: AiStreamDoneEvent | null = null;
  let resolvePromise: (event: AiStreamDoneEvent) => void = () => undefined;

  const promise = new Promise<AiStreamDoneEvent>((resolve) => {
    resolvePromise = resolve;
  });

  const maybeResolve = () => {
    if (!expectedExecutionId || !bufferedDone) {
      return;
    }
    if (bufferedDone.executionId !== expectedExecutionId) {
      return;
    }
    resolvePromise(bufferedDone);
  };

  return {
    promise,
    setExecutionId: (executionId) => {
      expectedExecutionId = executionId;
      maybeResolve();
    },
    onEvent: (event) => {
      if (event.type !== "done") {
        return;
      }
      bufferedDone = event;
      maybeResolve();
    },
  };
}

describe("AI service runtime multi-turn", () => {
  it("passes tools and parses tool_use for OpenAI streaming", async () => {
    const originalFetch = globalThis.fetch;

    try {
      let requestBody: Record<string, unknown> | null = null;

      globalThis.fetch = (async (_input, init) => {
        requestBody = JSON.parse(
          typeof init?.body === "string" ? init.body : JSON.stringify({}),
        ) as Record<string, unknown>;

        return new Response(
          `data: ${JSON.stringify({
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: "call-read-1",
                      function: {
                        name: "documentRead",
                        arguments: "{\"scope\":\"cursor\"}",
                      },
                    },
                  ],
                },
              },
            ],
          })}\n\n`
            + `data: ${JSON.stringify({
              choices: [
                {
                  delta: { content: "查完继续。" },
                  finish_reason: "tool_calls",
                },
              ],
            })}\n\n`
            + "data: [DONE]\n\n",
          {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          },
        );
      }) as typeof fetch;

      const service = createAiService({
        logger: createLogger(),
        env: {
          CREONOW_AI_PROVIDER: "openai",
          CREONOW_AI_BASE_URL: "https://api.openai.com",
          CREONOW_AI_API_KEY: "sk-test",
        },
        sleep: async () => {},
        rateLimitPerMinute: 1_000,
      }) as unknown as {
        streamChat: (
          messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>,
          options: {
            modelId: string;
            tools?: Array<{ name: string; description: string }>;
            onComplete: (result: StreamResult) => void;
            onError: (error: { message: string }) => void;
          },
        ) => AsyncGenerator<{ finishReason: "stop" | "tool_use" | null }>;
      };

      let completed: StreamResult | null = null;
      const finishReasons: Array<"stop" | "tool_use" | null> = [];

      for await (const chunk of service.streamChat(
        [
          { role: "system", content: "你是写作助手" },
          { role: "user", content: "继续写下去" },
        ],
        {
          modelId: "gpt-5.2",
          tools: [
            {
              name: "documentRead",
              description: "Read current document",
            },
          ],
          onComplete: (result) => {
            completed = result;
          },
          onError: (error) => {
            throw new Error(error.message);
          },
        },
      )) {
        finishReasons.push(chunk.finishReason);
      }

      if (requestBody === null) {
        throw new Error("request body should be captured");
      }
      if (completed === null) {
        throw new Error("streamChat should complete with final result");
      }
      const sentBody = requestBody as Record<string, unknown>;
      const result = completed as StreamResult;

      assert.equal(Array.isArray(sentBody.tools), true);
      assert.equal(
        (sentBody.tools as Array<{ function: { name: string } }>)[0]?.function.name,
        "documentRead",
      );
      assert.equal(sentBody.tool_choice, "auto");
      assert.equal(finishReasons.includes("tool_use"), true);
      assert.equal(result.finishReason, "tool_use");
      assert.deepEqual(result.toolCalls, [
        {
          id: "call-read-1",
          name: "documentRead",
          arguments: { scope: "cursor" },
        },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("reuses shared multi-turn chain for OpenAI stream and non-stream requests", async () => {
    const originalFetch = globalThis.fetch;

    try {
      const requestBodies: unknown[] = [];
      let nonStreamReplyNo = 0;
      let streamReplyNo = 0;

      globalThis.fetch = (async (_input, init) => {
        const rawBody =
          typeof init?.body === "string" ? init.body : JSON.stringify({});
        const parsed = JSON.parse(rawBody) as {
          stream?: unknown;
          messages?: Array<{ role?: unknown; content?: unknown }>;
        };
        requestBodies.push(parsed);

        if (parsed.stream === true) {
          streamReplyNo += 1;
          return new Response(
            `data: ${JSON.stringify({
              choices: [{ delta: { content: `oa-stream-${streamReplyNo}` } }],
            })}\n\n` + "data: [DONE]\n\n",
            {
              status: 200,
              headers: { "content-type": "text/event-stream" },
            },
          );
        }

        nonStreamReplyNo += 1;
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: `oa-nonstream-${nonStreamReplyNo}`,
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }) as typeof fetch;

      const service = createAiService({
        logger: createLogger(),
        env: {
          CREONOW_AI_PROVIDER: "openai",
          CREONOW_AI_BASE_URL: "https://api.openai.com",
          CREONOW_AI_API_KEY: "sk-test",
        },
        sleep: async () => {},
        rateLimitPerMinute: 1_000,
      });

      const first = await service.runSkill({
        skillId: "builtin:polish",
        input: "u1",
        mode: "ask",
        model: "gpt-5.2",
        stream: false,
        ts: 1_700_000_000_000,
        emitEvent: () => {},
      });
      assert.equal(first.ok, true);

      const doneWaiter = createDoneWaiter();
      const second = await service.runSkill({
        skillId: "builtin:polish",
        input: "u2",
        mode: "ask",
        model: "gpt-5.2",
        stream: true,
        ts: 1_700_000_000_001,
        emitEvent: doneWaiter.onEvent,
      });
      assert.equal(second.ok, true);
      if (!second.ok) {
        throw new Error("runSkill should return ok result");
      }
      doneWaiter.setExecutionId(second.data.executionId);
      await doneWaiter.promise;

      const third = await service.runSkill({
        skillId: "builtin:polish",
        input: "u3",
        mode: "ask",
        model: "gpt-5.2",
        stream: false,
        ts: 1_700_000_000_002,
        emitEvent: () => {},
      });
      assert.equal(third.ok, true);

      const thirdRequest = requestBodies[2] as {
        messages?: Array<{ role?: unknown; content?: unknown }>;
      };
      const messages = thirdRequest.messages;
      assert.ok(Array.isArray(messages), "OpenAI request must include messages");
      if (!Array.isArray(messages)) {
        throw new Error("messages missing");
      }

      assert.equal(messages[1]?.role, "user");
      assert.equal(messages[1]?.content, "u1");
      assert.equal(messages[2]?.role, "assistant");
      assert.equal(messages[2]?.content, "oa-nonstream-1");
      assert.equal(messages[3]?.role, "user");
      assert.equal(messages[3]?.content, "u2");
      assert.equal(messages[4]?.role, "assistant");
      assert.equal(messages[4]?.content, "oa-stream-1");
      assert.equal(messages[5]?.role, "user");
      assert.equal(messages[5]?.content, "u3");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("reuses shared multi-turn chain for Anthropic stream and non-stream requests", async () => {
    const originalFetch = globalThis.fetch;

    try {
      const requestBodies: unknown[] = [];
      let nonStreamReplyNo = 0;
      let streamReplyNo = 0;

      globalThis.fetch = (async (_input, init) => {
        const rawBody =
          typeof init?.body === "string" ? init.body : JSON.stringify({});
        const parsed = JSON.parse(rawBody) as {
          stream?: unknown;
          system?: unknown;
          messages?: Array<{ role?: unknown; content?: unknown }>;
        };
        requestBodies.push(parsed);

        if (parsed.stream === true) {
          streamReplyNo += 1;
          return new Response(
            `event: content_block_delta\n`
              + `data: ${JSON.stringify({ delta: { text: `an-stream-${streamReplyNo}` } })}\n\n`
              + "event: message_stop\n"
              + "data: {}\n\n",
            {
              status: 200,
              headers: { "content-type": "text/event-stream" },
            },
          );
        }

        nonStreamReplyNo += 1;
        return new Response(
          JSON.stringify({
            content: [{ text: `an-nonstream-${nonStreamReplyNo}` }],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }) as typeof fetch;

      const service = createAiService({
        logger: createLogger(),
        env: {
          CREONOW_AI_PROVIDER: "anthropic",
          CREONOW_AI_BASE_URL: "https://api.anthropic.com",
          CREONOW_AI_API_KEY: "sk-ant-test",
        },
        sleep: async () => {},
        rateLimitPerMinute: 1_000,
      });

      const first = await service.runSkill({
        skillId: "builtin:polish",
        input: "u1",
        mode: "ask",
        model: "claude-3-5-sonnet",
        stream: false,
        ts: 1_700_000_000_100,
        emitEvent: () => {},
      });
      assert.equal(first.ok, true);

      const doneWaiter = createDoneWaiter();
      const second = await service.runSkill({
        skillId: "builtin:polish",
        input: "u2",
        mode: "ask",
        model: "claude-3-5-sonnet",
        stream: true,
        ts: 1_700_000_000_101,
        emitEvent: doneWaiter.onEvent,
      });
      assert.equal(second.ok, true);
      if (!second.ok) {
        throw new Error("runSkill should return ok result");
      }
      doneWaiter.setExecutionId(second.data.executionId);
      await doneWaiter.promise;

      const third = await service.runSkill({
        skillId: "builtin:polish",
        input: "u3",
        mode: "ask",
        model: "claude-3-5-sonnet",
        stream: false,
        ts: 1_700_000_000_102,
        emitEvent: () => {},
      });
      assert.equal(third.ok, true);

      const thirdRequest = requestBodies[2] as {
        system?: unknown;
        messages?: Array<{ role?: unknown; content?: unknown }>;
      };
      assert.equal(typeof thirdRequest.system, "string");

      const messages = thirdRequest.messages;
      assert.ok(
        Array.isArray(messages),
        "Anthropic request must include message array",
      );
      if (!Array.isArray(messages)) {
        throw new Error("messages missing");
      }

      assert.equal(messages[0]?.role, "user");
      assert.equal(messages[0]?.content, "u1");
      assert.equal(messages[1]?.role, "assistant");
      assert.equal(messages[1]?.content, "an-nonstream-1");
      assert.equal(messages[2]?.role, "user");
      assert.equal(messages[2]?.content, "u2");
      assert.equal(messages[3]?.role, "assistant");
      assert.equal(messages[3]?.content, "an-stream-1");
      assert.equal(messages[4]?.role, "user");
      assert.equal(messages[4]?.content, "u3");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
