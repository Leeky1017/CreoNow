import assert from "node:assert/strict";

import type { AiStreamDoneEvent, AiStreamEvent } from "@shared/types/ai";
import { describe, it } from "vitest";
import type { Logger } from "../../../logging/logger";
import { createAiService } from "../aiService";

function nopLogger(): Logger {
  return { logPath: "<test>", info: () => {}, error: () => {} };
}

type CapturedBody = {
  stream?: boolean;
  system?: string;
  messages?: unknown[];
};

function makeDoneWaiter() {
  let expectedExecId: string | null = null;
  let buffered: AiStreamDoneEvent | null = null;
  let resolve: (e: AiStreamDoneEvent) => void = () => undefined;
  const promise = new Promise<AiStreamDoneEvent>((r) => {
    resolve = r;
  });
  const maybeResolve = () => {
    if (expectedExecId && buffered && buffered.executionId === expectedExecId) {
      resolve(buffered);
    }
  };
  return {
    promise,
    setExecutionId(id: string) {
      expectedExecId = id;
      maybeResolve();
    },
    onEvent(ev: AiStreamEvent) {
      if (ev.type !== "done") {
        return;
      }
      buffered = ev;
      maybeResolve();
    },
  };
}

describe("aiService overrideMessages tool history", () => {
  it("保留 OpenAI tool message 的 tool_call_id", async () => {
    const captured: CapturedBody[] = [];
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async (_url, init) => {
        const body = JSON.parse(
          typeof init?.body === "string" ? init.body : "{}",
        ) as CapturedBody;
        captured.push(body);
        if (body.stream) {
          return new Response(
            `data: ${JSON.stringify({ choices: [{ delta: { content: "ok" } }] })}\n\n` +
              "data: [DONE]\n\n",
            { status: 200, headers: { "content-type": "text/event-stream" } },
          );
        }
        return new Response(
          JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }) as typeof fetch;

      const svc = createAiService({
        logger: nopLogger(),
        env: {
          CREONOW_AI_PROVIDER: "openai",
          CREONOW_AI_BASE_URL: "https://api.openai.com",
          CREONOW_AI_API_KEY: "sk-test",
        },
        sleep: async () => {},
        rateLimitPerMinute: 1_000,
      });

      const waiter = makeDoneWaiter();
      const res = await svc.runSkill({
        skillId: "builtin:polish",
        input: "continue",
        mode: "ask",
        model: "gpt-5.2",
        stream: true,
        ts: Date.now(),
        emitEvent: waiter.onEvent,
        overrideMessages: [
          { role: "system", content: "You are a writing assistant." },
          { role: "user", content: "Please do X." },
          { role: "assistant", content: "I will call a tool." },
          { role: "tool", content: '{"result":"done"}', toolCallId: "call_abc123" },
          { role: "user", content: "continue" },
        ],
      });

      assert.equal(res.ok, true, `runSkill failed: ${JSON.stringify(!res.ok && res)}`);
      if (res.ok) {
        waiter.setExecutionId(res.data.executionId);
      }
      await waiter.promise;

      const msgs = captured[0]?.messages as
        | Array<{ role?: string; tool_call_id?: string; content?: string }>
        | undefined;
      assert.ok(Array.isArray(msgs), "OpenAI request must include messages array");

      const toolMsg = msgs?.find((m) => m.role === "tool");
      assert.ok(toolMsg, "tool message must be present in OpenAI request");
      assert.equal(toolMsg?.tool_call_id, "call_abc123");
      assert.equal(toolMsg?.content, '{"result":"done"}');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("保留多个 OpenAI tool message 的各自 tool_call_id", async () => {
    const captured: CapturedBody[] = [];
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async (_url, init) => {
        const body = JSON.parse(
          typeof init?.body === "string" ? init.body : "{}",
        ) as CapturedBody;
        captured.push(body);
        return new Response(
          JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }) as typeof fetch;

      const svc = createAiService({
        logger: nopLogger(),
        env: {
          CREONOW_AI_PROVIDER: "openai",
          CREONOW_AI_BASE_URL: "https://api.openai.com",
          CREONOW_AI_API_KEY: "sk-test",
        },
        sleep: async () => {},
        rateLimitPerMinute: 1_000,
      });

      await svc.runSkill({
        skillId: "builtin:polish",
        input: "go",
        mode: "ask",
        model: "gpt-5.2",
        stream: false,
        ts: Date.now(),
        emitEvent: () => {},
        overrideMessages: [
          { role: "user", content: "call two tools" },
          { role: "assistant", content: "ok" },
          { role: "tool", content: "result-1", toolCallId: "call_t1" },
          { role: "tool", content: "result-2", toolCallId: "call_t2" },
          { role: "user", content: "go" },
        ],
      });

      const msgs = (captured[0]?.messages ?? []) as Array<{
        role?: string;
        tool_call_id?: string;
      }>;
      const toolMsgs = msgs.filter((m) => m.role === "tool");
      assert.equal(toolMsgs.length, 2);
      assert.equal(toolMsgs[0]?.tool_call_id, "call_t1");
      assert.equal(toolMsgs[1]?.tool_call_id, "call_t2");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("将 Anthropic tool history 转成 tool_result block", async () => {
    const captured: CapturedBody[] = [];
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async (_url, init) => {
        const body = JSON.parse(
          typeof init?.body === "string" ? init.body : "{}",
        ) as CapturedBody;
        captured.push(body);
        if (body.stream) {
          return new Response(
            "event: content_block_delta\n" +
              `data: ${JSON.stringify({ delta: { text: "ok" } })}\n\n` +
              "event: message_stop\ndata: {}\n\n",
            { status: 200, headers: { "content-type": "text/event-stream" } },
          );
        }
        return new Response(
          JSON.stringify({ content: [{ text: "ok" }] }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }) as typeof fetch;

      const svc = createAiService({
        logger: nopLogger(),
        env: {
          CREONOW_AI_PROVIDER: "anthropic",
          CREONOW_AI_BASE_URL: "https://api.anthropic.com",
          CREONOW_AI_API_KEY: "sk-ant-test",
        },
        sleep: async () => {},
        rateLimitPerMinute: 1_000,
      });

      const waiter = makeDoneWaiter();
      const res = await svc.runSkill({
        skillId: "builtin:polish",
        input: "continue",
        mode: "ask",
        model: "claude-3-5-sonnet",
        stream: true,
        ts: Date.now(),
        emitEvent: waiter.onEvent,
        overrideMessages: [
          { role: "user", content: "call a tool please" },
          { role: "assistant", content: "Calling the tool." },
          { role: "tool", content: '{"text":"fetched content"}', toolCallId: "toolu_xyz" },
          { role: "user", content: "continue" },
        ],
      });

      assert.equal(res.ok, true, `runSkill failed: ${JSON.stringify(!res.ok && res)}`);
      if (res.ok) {
        waiter.setExecutionId(res.data.executionId);
      }
      await waiter.promise;

      const msgs = (captured[0]?.messages ?? []) as Array<{
        role?: string;
        content?: string | Array<{ type?: string; tool_use_id?: string; content?: string }>;
      }>;
      const toolResultMsg = msgs.find(
        (m) =>
          m.role === "user" &&
          Array.isArray(m.content) &&
          m.content.some((b) => b.type === "tool_result"),
      );
      assert.ok(toolResultMsg, "Anthropic request must contain tool_result block");
      const blocks = toolResultMsg?.content as Array<{
        type?: string;
        tool_use_id?: string;
        content?: string;
      }>;
      const toolResultBlock = blocks.find((b) => b.type === "tool_result");
      assert.ok(toolResultBlock);
      assert.equal(toolResultBlock?.tool_use_id, "toolu_xyz");
      assert.equal(toolResultBlock?.content, '{"text":"fetched content"}');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("将连续 Anthropic tool history 分组到同一条 user message", async () => {
    const captured: CapturedBody[] = [];
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async (_url, init) => {
        const body = JSON.parse(
          typeof init?.body === "string" ? init.body : "{}",
        ) as CapturedBody;
        captured.push(body);
        return new Response(
          JSON.stringify({ content: [{ text: "ok" }] }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }) as typeof fetch;

      const svc = createAiService({
        logger: nopLogger(),
        env: {
          CREONOW_AI_PROVIDER: "anthropic",
          CREONOW_AI_BASE_URL: "https://api.anthropic.com",
          CREONOW_AI_API_KEY: "sk-ant-test",
        },
        sleep: async () => {},
        rateLimitPerMinute: 1_000,
      });

      await svc.runSkill({
        skillId: "builtin:polish",
        input: "go",
        mode: "ask",
        model: "claude-3-5-sonnet",
        stream: false,
        ts: Date.now(),
        emitEvent: () => {},
        overrideMessages: [
          { role: "user", content: "q" },
          { role: "assistant", content: "calling two" },
          { role: "tool", content: "r1", toolCallId: "t1" },
          { role: "tool", content: "r2", toolCallId: "t2" },
          { role: "user", content: "go" },
        ],
      });

      const msgs = (captured[0]?.messages ?? []) as Array<{
        role?: string;
        content?: string | Array<{ type?: string; tool_use_id?: string }>;
      }>;
      const toolResultMsgs = msgs.filter(
        (m) =>
          m.role === "user" &&
          Array.isArray(m.content) &&
          m.content.some((b) => b.type === "tool_result"),
      );
      assert.equal(toolResultMsgs.length, 1);
      const blocks = toolResultMsgs[0]?.content as Array<{ type?: string }>;
      assert.equal(blocks.filter((b) => b.type === "tool_result").length, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("缺失 toolCallId 时不崩溃，并回退为空字符串", async () => {
    const captured: CapturedBody[] = [];
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async (_url, init) => {
        const body = JSON.parse(
          typeof init?.body === "string" ? init.body : "{}",
        ) as CapturedBody;
        captured.push(body);
        return new Response(
          JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }) as typeof fetch;

      const svc = createAiService({
        logger: nopLogger(),
        env: {
          CREONOW_AI_PROVIDER: "openai",
          CREONOW_AI_BASE_URL: "https://api.openai.com",
          CREONOW_AI_API_KEY: "sk-test",
        },
        sleep: async () => {},
        rateLimitPerMinute: 1_000,
      });

      const res = await svc.runSkill({
        skillId: "builtin:polish",
        input: "go",
        mode: "ask",
        model: "gpt-5.2",
        stream: false,
        ts: Date.now(),
        emitEvent: () => {},
        overrideMessages: [
          { role: "user", content: "q" },
          { role: "tool", content: "result" },
          { role: "user", content: "go" },
        ],
      });

      assert.equal(res.ok, true);
      const toolMsg = ((captured[0]?.messages ?? []) as Array<{
        role?: string;
        tool_call_id?: string;
      }>).find((m) => m.role === "tool");
      assert.ok(toolMsg);
      assert.equal(toolMsg?.tool_call_id, "");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
