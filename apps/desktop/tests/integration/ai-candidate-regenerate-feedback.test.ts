import assert from "node:assert/strict";

import { createAiStore } from "../../renderer/src/stores/aiStore";

type InvokeCall = {
  channel: string;
  payload: unknown;
};

function asRecord(x: unknown): Record<string, unknown> | null {
  if (typeof x !== "object" || x === null || Array.isArray(x)) {
    return null;
  }
  return x as Record<string, unknown>;
}

{
  const calls: InvokeCall[] = [];
  let runCount = 0;
  const store = createAiStore({
    invoke: async (channel, payload) => {
      calls.push({ channel, payload });

      if (channel === "ai:skill:run") {
        runCount += 1;
        return {
          ok: true,
          data: {
            executionId: `run-${runCount}`,
            runId: `run-${runCount}`,
            outputText: runCount === 1 ? "候选A-初次" : "候选A-重生成",
            candidates: [
              {
                id: "candidate-a",
                runId: `run-${runCount}`,
                text: runCount === 1 ? "候选A-初次" : "候选A-重生成",
              },
              {
                id: "candidate-b",
                runId: `run-${runCount}-b`,
                text: runCount === 1 ? "候选B-初次" : "候选B-重生成",
              },
            ],
            usage: {
              promptTokens: 100,
              completionTokens: 200,
              sessionTotalTokens: runCount === 1 ? 300 : 600,
            },
          },
        } as never;
      }

      if (channel === "ai:skill:feedback") {
        return { ok: true, data: { recorded: true } } as never;
      }

      if (channel === "memory:trace:feedback") {
        return {
          ok: true,
          data: { accepted: true, feedbackId: "fb-1" },
        } as never;
      }

      if (channel === "file:document:save") {
        return {
          ok: true,
          data: {
            savedAt: Date.now(),
          },
        } as never;
      }

      return {
        ok: false,
        error: {
          code: "INTERNAL",
          message: `unexpected channel: ${String(channel)}`,
        },
      } as never;
    },
  });

  store.setState({
    selectedSkillId: "builtin:polish",
    input: "请重写这段文字",
  });

  await store.getState().run({
    context: {
      projectId: "project-1",
      documentId: "doc-1",
    },
    mode: "ask",
    model: "gpt-5.2",
    candidateCount: 3,
    streamOverride: false,
  } as never);

  const firstRunPayload = asRecord(
    calls.find((c) => c.channel === "ai:skill:run")?.payload,
  );
  assert.equal(firstRunPayload?.candidateCount, 3);
  assert.equal(firstRunPayload?.mode, "ask");
  assert.equal(firstRunPayload?.model, "gpt-5.2");
  assert.equal(firstRunPayload?.input, "请重写这段文字");
  assert.equal(firstRunPayload?.stream, false);

  const state = store.getState() as unknown as {
    regenerateWithStrongNegative?: (args: {
      projectId?: string;
    }) => Promise<void>;
  };
  assert.equal(typeof state.regenerateWithStrongNegative, "function");

  await state.regenerateWithStrongNegative?.({ projectId: "project-1" });

  const feedbackPayload = asRecord(
    calls.find((c) => c.channel === "ai:skill:feedback")?.payload,
  );
  assert.equal(feedbackPayload?.runId, "run-1");
  assert.equal(feedbackPayload?.action, "reject");
  assert.equal(typeof feedbackPayload?.evidenceRef, "string");
  assert.match(String(feedbackPayload?.evidenceRef), /strong_negative/);

  const tracePayload = asRecord(
    calls.find((c) => c.channel === "memory:trace:feedback")?.payload,
  );
  assert.equal(tracePayload?.projectId, "project-1");
  assert.equal(tracePayload?.generationId, "run-1");
  assert.equal(tracePayload?.verdict, "incorrect");
  assert.match(String(tracePayload?.reason), /strong_negative/);

  const runCalls = calls.filter((c) => c.channel === "ai:skill:run");
  assert.equal(runCalls.length, 2);

  const secondRunPayload = asRecord(runCalls[1]?.payload);
  assert.equal(secondRunPayload?.candidateCount, 3);
  assert.equal(secondRunPayload?.mode, "ask");
  assert.equal(secondRunPayload?.model, "gpt-5.2");
  assert.equal(secondRunPayload?.input, "请重写这段文字");
}
