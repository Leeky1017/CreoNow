/**
 * LLM mock helper for deterministic AI tests.
 *
 * All integration and E2E tests MUST use this mock instead of real LLM APIs.
 * Consuming real LLM API quota in tests is a hard prohibition (AGENTS.md §4.11).
 *
 * Usage:
 *   import { createMockLlmClient, FIXED_RESPONSES } from '../helpers/llm-mock'
 *
 *   const llm = createMockLlmClient()
 *   const result = await llm.complete('prompt')
 *   expect(result.text).toBe(FIXED_RESPONSES.continuation)
 */
import { estimateUtf8TokenCount } from "@shared/tokenBudget";

/** Pre-defined deterministic responses keyed by skill type. */
export const FIXED_RESPONSES = {
  continuation:
    "The morning light filtered through the curtains, casting long shadows across the wooden floor.",
  rewrite:
    "She walked slowly toward the old house, her footsteps echoing in the quiet street.",
  expansion:
    "The garden stretched endlessly before her. Rows of chrysanthemums lined the stone path, their petals glistening with morning dew. A gentle breeze carried the scent of osmanthus from the far corner, where an ancient tree stood guard over a moss-covered bench.",
  summary:
    "A character reflects on past events while walking through a garden.",
  error: "Error: LLM service unavailable",
} as const;

export interface MockLlmClient {
  complete: (prompt: string) => Promise<{ text: string; tokens: number }>;
  stream: (
    prompt: string,
    onChunk: (chunk: string) => void,
  ) => Promise<{ totalTokens: number }>;
  callCount: () => number;
  lastPrompt: () => string | null;
  reset: () => void;
}

/**
 * Create a mock LLM client that returns deterministic responses.
 *
 * @param responseOverride - Optional fixed response text. Defaults to continuation.
 * @param latencyMs - Simulated latency in ms. Defaults to 0.
 */
export function createMockLlmClient(
  responseOverride?: string,
  latencyMs = 0,
): MockLlmClient {
  let _callCount = 0;
  let _lastPrompt: string | null = null;
  const responseText = responseOverride ?? FIXED_RESPONSES.continuation;

  const delay = (ms: number) =>
    ms > 0 ? new Promise<void>((r) => setTimeout(r, ms)) : Promise.resolve();

  return {
    async complete(prompt: string) {
      _callCount++;
      _lastPrompt = prompt;
      await delay(latencyMs);
      return {
        text: responseText,
        tokens: estimateUtf8TokenCount(responseText),
      };
    },

    async stream(prompt: string, onChunk: (chunk: string) => void) {
      _callCount++;
      _lastPrompt = prompt;
      await delay(latencyMs);
      const words = responseText.length === 0 ? [] : responseText.split(" ");
      for (const word of words) {
        onChunk(word + " ");
      }
      return { totalTokens: estimateUtf8TokenCount(responseText) };
    },

    callCount: () => _callCount,
    lastPrompt: () => _lastPrompt,
    reset: () => {
      _callCount = 0;
      _lastPrompt = null;
    },
  };
}
