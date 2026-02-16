type JsonObject = Record<string, unknown>;

export type AiProvider = "anthropic" | "openai" | "proxy";

function asObject(x: unknown): JsonObject | null {
  if (typeof x !== "object" || x === null) {
    return null;
  }
  return x as JsonObject;
}

/**
 * Extract assistant text from an OpenAI non-stream response.
 */
export function extractOpenAiText(json: unknown): string | null {
  const obj = asObject(json);
  const choices = obj ? obj.choices : null;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }
  const first = asObject(choices[0]);
  const message = asObject(first?.message);
  const content = message?.content;
  return extractOpenAiContentText(content);
}

/**
 * Extract delta text from an OpenAI streaming chunk.
 */
export function extractOpenAiDelta(json: unknown): string | null {
  const obj = asObject(json);
  const choices = obj ? obj.choices : null;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }
  const first = asObject(choices[0]);
  const delta = asObject(first?.delta);
  const content = delta?.content;
  return extractOpenAiContentText(content);
}

/**
 * Extract human-readable text from OpenAI-compatible content payloads.
 */
export function extractOpenAiContentText(content: unknown): string | null {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const parts: string[] = [];
  for (const item of content) {
    if (typeof item === "string") {
      if (item.length > 0) {
        parts.push(item);
      }
      continue;
    }

    const row = asObject(item);
    if (!row) {
      continue;
    }

    const text = row.text;
    if (typeof text === "string" && text.length > 0) {
      parts.push(text);
      continue;
    }

    const nested = row.content;
    if (typeof nested === "string" && nested.length > 0) {
      parts.push(nested);
    }
  }

  if (parts.length === 0) {
    return null;
  }
  return parts.join("");
}

/**
 * Extract assistant text from an Anthropic non-stream response.
 */
export function extractAnthropicText(json: unknown): string | null {
  const obj = asObject(json);
  const content = obj ? obj.content : null;
  if (!Array.isArray(content) || content.length === 0) {
    return null;
  }
  const first = asObject(content[0]);
  const text = first?.text;
  return typeof text === "string" ? text : null;
}

/**
 * Extract delta text from an Anthropic streaming chunk.
 */
export function extractAnthropicDelta(json: unknown): string | null {
  const obj = asObject(json);
  const delta = asObject(obj?.delta);
  const text = delta?.text;
  return typeof text === "string" ? text : null;
}

/**
 * Build a stable provider display name for model catalog results.
 */
export function providerDisplayName(provider: AiProvider): string {
  if (provider === "proxy") {
    return "Proxy";
  }
  if (provider === "openai") {
    return "OpenAI";
  }
  return "Anthropic";
}

/**
 * Extract model items from an OpenAI-compatible `/v1/models` response.
 */
export function extractOpenAiModels(
  json: unknown,
): Array<{ id: string; name: string }> {
  const obj = asObject(json);
  const data = obj?.data;
  if (!Array.isArray(data)) {
    return [];
  }

  const seen = new Set<string>();
  const items: Array<{ id: string; name: string }> = [];
  for (const raw of data) {
    const row = asObject(raw);
    const id = typeof row?.id === "string" ? row.id.trim() : "";
    if (id.length === 0 || seen.has(id)) {
      continue;
    }

    const displayName =
      typeof row?.name === "string" && row.name.trim().length > 0
        ? row.name.trim()
        : typeof row?.display_name === "string" &&
            row.display_name.trim().length > 0
          ? row.display_name.trim()
          : id;

    seen.add(id);
    items.push({ id, name: displayName });
  }

  return items.sort((a, b) => a.name.localeCompare(b.name));
}
