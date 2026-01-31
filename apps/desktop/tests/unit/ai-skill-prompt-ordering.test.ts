import assert from "node:assert/strict";

import type { Logger } from "../../main/src/logging/logger";
import { startFakeAiServer } from "../../main/src/services/ai/fakeAiServer";

type JsonObject = Record<string, unknown>;

type ResponseText = { text: string };

/**
 * Narrow an unknown value to a plain JSON object.
 */
function asObject(x: unknown): JsonObject | null {
  if (typeof x !== "object" || x === null || Array.isArray(x)) {
    return null;
  }
  return x as JsonObject;
}

/**
 * Extract `content[0].text` from an Anthropic message response.
 */
function extractAnthropicText(json: unknown): ResponseText | null {
  const obj = asObject(json);
  const content = obj?.content;
  if (!Array.isArray(content) || content.length === 0) {
    return null;
  }
  const first = asObject(content[0]);
  const text = first?.text;
  return typeof text === "string" ? { text } : null;
}

/**
 * Post a non-stream Anthropic request to the Fake AI server.
 */
async function postAnthropic(args: {
  baseUrl: string;
  userText: string;
}): Promise<ResponseText> {
  const res = await fetch(new URL("/v1/messages", args.baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "fake",
      max_tokens: 256,
      messages: [{ role: "user", content: args.userText }],
      stream: false,
    }),
  });
  assert.equal(res.ok, true);
  const parsed = extractAnthropicText(await res.json());
  assert.ok(parsed, "Expected Anthropic JSON response with content[0].text");
  return parsed;
}

/**
 * Create a no-op logger for Fake AI tests.
 */
function createNoopLogger(): Logger {
  return {
    logPath: "(unit-test)",
    info: () => {},
    error: () => {},
  };
}

{
  const server = await startFakeAiServer({
    logger: createNoopLogger(),
    env: {},
  });

  try {
    {
      const wrapped = [
        "Polish the following text for clarity and style.",
        "",
        "<text>",
        "replace-world",
        "</text>",
        "",
      ].join("\n");
      const res = await postAnthropic({
        baseUrl: server.baseUrl,
        userText: wrapped,
      });
      assert.equal(res.text, "E2E_RESULT: replace-world");
    }

    {
      const contextPrompt = [
        "# CreoNow Context (v1)",
        "",
        "## Immediate",
        "### immediate:ai_panel_input",
        "replace-world",
        "",
      ].join("\n");
      const res = await postAnthropic({
        baseUrl: server.baseUrl,
        userText: contextPrompt,
      });
      assert.equal(res.text, "E2E_RESULT: replace-world");
    }

    {
      const redacted = [
        "# CreoNow Context (v1)",
        "",
        "## Rules",
        "apiKey=***REDACTED***",
        "",
      ].join("\n");
      const res = await postAnthropic({
        baseUrl: server.baseUrl,
        userText: redacted,
      });
      assert.ok(res.text.includes("***REDACTED***"));
    }
  } finally {
    await server.close();
  }
}
