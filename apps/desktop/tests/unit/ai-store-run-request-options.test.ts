import assert from "node:assert/strict";

import {
  createAiStore,
  type PromptDiagnostics,
} from "../../renderer/src/stores/aiStore";

type CapturedCall = {
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
  const calls: CapturedCall[] = [];
  const store = createAiStore({
    invoke: async (channel, payload) => {
      calls.push({ channel, payload });
      if (channel === "skill:registry:list") {
        return {
          ok: true,
          data: {
            items: [
              {
                id: "builtin:polish",
                name: "Polish",
                scope: "builtin",
                packageId: "builtin",
                version: "1.0.0",
                enabled: true,
                valid: true,
              },
            ],
          },
        } as never;
      }
      if (channel === "ai:skill:run") {
        return {
          ok: true,
          data: { executionId: "run-1", runId: "run-1", outputText: "ok" },
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
    input: "hello",
  });

  const diagnostics: PromptDiagnostics = {
    stablePrefixHash: "stable-1",
    promptHash: "prompt-1",
  };

  await store.getState().run({
    context: {
      projectId: "project-1",
      documentId: "document-1",
    },
    promptDiagnostics: diagnostics,
    mode: "plan",
    model: "deepseek",
  });

  const runCall = calls.find((c) => c.channel === "ai:skill:run");
  assert.ok(runCall, "expected ai:skill:run invocation");
  const payload = asRecord(runCall?.payload);
  assert.ok(payload, "expected object payload for ai:skill:run");

  assert.equal(payload?.skillId, "builtin:polish");
  assert.equal(payload?.input, "hello");
  assert.equal(payload?.stream, true);
  assert.equal(payload?.mode, "plan");
  assert.equal(payload?.model, "deepseek");

  const context = asRecord(payload?.context);
  assert.equal(context?.projectId, "project-1");
  assert.equal(context?.documentId, "document-1");
}
