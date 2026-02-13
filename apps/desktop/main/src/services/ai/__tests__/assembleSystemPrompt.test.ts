import assert from "node:assert/strict";

import { createAiService } from "../aiService";
import { assembleSystemPrompt } from "../assembleSystemPrompt";
import { GLOBAL_IDENTITY_PROMPT } from "../identityPrompt";

// --- S1: with no optional layers includes identity blocks ---

{
  const result = assembleSystemPrompt({
    globalIdentity: GLOBAL_IDENTITY_PROMPT,
  });

  assert.ok(result.includes("<identity>"), "must contain <identity>");
  assert.ok(
    result.includes("<writing_awareness>"),
    "must contain <writing_awareness>",
  );
  assert.ok(result.includes("<role_fluidity>"), "must contain <role_fluidity>");
}

// --- S1: never returns null or empty string ---

{
  const result = assembleSystemPrompt({
    globalIdentity: GLOBAL_IDENTITY_PROMPT,
  });

  assert.equal(typeof result, "string");
  assert.ok(result.trim().length > 0, "must be non-empty");
}

// --- S2: skill prompt appears after identity, before context overlay ---

{
  const result = assembleSystemPrompt({
    globalIdentity: GLOBAL_IDENTITY_PROMPT,
    skillSystemPrompt: "Polish the text carefully.",
    contextOverlay: "Current chapter: Chapter 10",
  });

  const identityEnd = result.indexOf("</context_awareness>");
  const skillPos = result.indexOf("Polish the text carefully.");
  const contextPos = result.indexOf("Current chapter: Chapter 10");

  assert.ok(identityEnd > -1, "identity end must be found");
  assert.ok(skillPos > identityEnd, "skill must come after identity");
  assert.ok(contextPos > skillPos, "context must come after skill");
}

// --- S3: memory overlay appears after skill prompt, before context overlay ---

{
  const result = assembleSystemPrompt({
    globalIdentity: GLOBAL_IDENTITY_PROMPT,
    skillSystemPrompt: "Polish the text.",
    memoryOverlay: "偏好短句，节奏紧凑",
    contextOverlay: "Current chapter: Chapter 5",
  });

  const skillPos = result.indexOf("Polish the text.");
  const memoryPos = result.indexOf("偏好短句，节奏紧凑");
  const contextPos = result.indexOf("Current chapter: Chapter 5");

  assert.ok(memoryPos > skillPos, "memory must come after skill");
  assert.ok(contextPos > memoryPos, "context must come after memory");
}

// --- Full order: identity → userRules → skill → mode → memory → context ---

{
  const result = assembleSystemPrompt({
    globalIdentity: GLOBAL_IDENTITY_PROMPT,
    userRules: "USER_RULES_MARKER",
    skillSystemPrompt: "SKILL_PROMPT_MARKER",
    modeHint: "MODE_HINT_MARKER",
    memoryOverlay: "MEMORY_OVERLAY_MARKER",
    contextOverlay: "CONTEXT_OVERLAY_MARKER",
  });

  const positions = [
    result.indexOf("<identity>"),
    result.indexOf("USER_RULES_MARKER"),
    result.indexOf("SKILL_PROMPT_MARKER"),
    result.indexOf("MODE_HINT_MARKER"),
    result.indexOf("MEMORY_OVERLAY_MARKER"),
    result.indexOf("CONTEXT_OVERLAY_MARKER"),
  ];

  for (const pos of positions) {
    assert.ok(pos > -1, "all markers must be found");
  }

  for (let i = 1; i < positions.length; i++) {
    assert.ok(
      positions[i] > positions[i - 1],
      `position[${i}] must be after position[${i - 1}]`,
    );
  }
}

// --- Skips empty/whitespace-only optional layers ---

{
  const result = assembleSystemPrompt({
    globalIdentity: GLOBAL_IDENTITY_PROMPT,
    skillSystemPrompt: "",
    modeHint: "   ",
    memoryOverlay: undefined,
    contextOverlay: "Some context",
  });

  assert.ok(result.includes("<identity>"), "identity must be present");
  assert.ok(result.includes("Some context"), "context must be present");
  assert.ok(
    !result.includes("\n\n\n\n"),
    "no quadruple newlines from skipped layers",
  );
}

// --- Skips empty identity placeholder when identity is blank ---

{
  const result = assembleSystemPrompt({
    globalIdentity: "   ",
    modeHint: "Mode: agent",
  });

  assert.equal(result, "Mode: agent");
  assert.ok(!result.startsWith("\n\n"), "must not emit leading separators");
}

// --- Always returns string type (never null) ---

{
  const result = assembleSystemPrompt({
    globalIdentity: GLOBAL_IDENTITY_PROMPT,
  });

  assert.notEqual(result, null);
  assert.notEqual(result, undefined);
  assert.equal(typeof result, "string");
}

function extractOpenAiSystemMessage(body: unknown): string {
  if (typeof body !== "object" || body === null) {
    return "";
  }
  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) {
    return "";
  }
  for (const message of messages) {
    if (typeof message !== "object" || message === null) {
      continue;
    }
    const role = (message as { role?: unknown }).role;
    const content = (message as { content?: unknown }).content;
    if (role === "system" && typeof content === "string") {
      return content;
    }
  }
  return "";
}

// --- AIS-RUNTIME-S1/S2: runtime request assembly must include identity layer ---
{
  const originalFetch = globalThis.fetch;
  const requestBodies: unknown[] = [];

  try {
    globalThis.fetch = (async (_input, init) => {
      const rawBody =
        typeof init?.body === "string" ? init.body : JSON.stringify({});
      requestBodies.push(JSON.parse(rawBody) as unknown);

      const parsed = JSON.parse(rawBody) as { stream?: unknown };
      if (parsed.stream === true) {
        return new Response(
          `data: ${JSON.stringify({ choices: [{ delta: { content: "ok" } }] })}\n\n` +
            "data: [DONE]\n\n",
          {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "ok" } }],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }) as typeof fetch;

    const service = createAiService({
      logger: { logPath: "<test>", info: () => {}, error: () => {} },
      env: {
        CREONOW_AI_PROVIDER: "openai",
        CREONOW_AI_BASE_URL: "https://api.openai.com",
        CREONOW_AI_API_KEY: "sk-test",
      },
      sleep: async () => {},
      rateLimitPerMinute: 1_000,
    });

    const nonStreamResult = await service.runSkill({
      skillId: "builtin:polish",
      input: "input",
      mode: "ask",
      model: "gpt-5.2",
      stream: false,
      systemPrompt: "SKILL_PROMPT_MARKER",
      system: "CONTEXT_OVERLAY_MARKER",
      ts: Date.now(),
      emitEvent: () => {},
    });

    assert.equal(nonStreamResult.ok, true);

    const nonStreamSystem = extractOpenAiSystemMessage(requestBodies[0]);
    assert.ok(
      nonStreamSystem.includes("<identity>"),
      "runtime non-stream system prompt must include identity layer",
    );
    assert.ok(
      nonStreamSystem.indexOf("<identity>") <
        nonStreamSystem.indexOf("SKILL_PROMPT_MARKER"),
      "identity layer must be placed before skill layer",
    );
    assert.ok(
      nonStreamSystem.indexOf("SKILL_PROMPT_MARKER") <
        nonStreamSystem.indexOf("CONTEXT_OVERLAY_MARKER"),
      "skill layer must be placed before context layer",
    );

    const streamEvents: Array<{ type: string }> = [];
    const streamResult = await service.runSkill({
      skillId: "builtin:polish",
      input: "input",
      mode: "ask",
      model: "gpt-5.2",
      stream: true,
      systemPrompt: "SKILL_PROMPT_MARKER_STREAM",
      system: "CONTEXT_OVERLAY_MARKER_STREAM",
      ts: Date.now(),
      emitEvent: (event) => {
        streamEvents.push({ type: event.type });
      },
    });
    assert.equal(streamResult.ok, true);

    const startedAt = Date.now();
    while (
      !streamEvents.some((event) => event.type === "done") &&
      Date.now() - startedAt < 1_000
    ) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const streamSystem = extractOpenAiSystemMessage(requestBodies[1]);
    assert.ok(
      streamSystem.includes("<identity>"),
      "runtime stream system prompt must include identity layer",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}
