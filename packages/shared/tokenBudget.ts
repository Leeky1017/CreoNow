const UTF8_BYTES_PER_TOKEN = 4;

// CJK Unicode ranges: CJK Unified Ideographs, Extension A, Hiragana/Katakana,
// Hangul Syllables, CJK Symbols/Punctuation, Halfwidth/Fullwidth Forms
const CJK_RE =
  /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af\u3000-\u303f\uff00-\uffef]/;

/**
 * CJK-aware token estimation.
 *
 * Why: Chinese/Japanese/Korean characters encode as 3 UTF-8 bytes but consume
 * ~1.5 tokens each, so the naive bytes/4 formula over-estimates by ~2×.
 * This function is safe to use on both renderer and main process paths because
 * it has no Node-only dependencies.
 */
export function estimateCjkAwareTokenCount(text: string): number {
  if (text.length === 0) return 0;

  let cjkCount = 0;
  const chars = [...text];
  for (const char of chars) {
    if (CJK_RE.test(char)) cjkCount++;
  }

  const bytes = new TextEncoder().encode(text).length;
  // CJK chars are 3 bytes each in UTF-8
  const nonCjkBytes = bytes - cjkCount * 3;
  return Math.ceil(cjkCount * 1.5 + nonCjkBytes / UTF8_BYTES_PER_TOKEN);
}

/**
 * Convert token budget into a byte limit using the shared UTF-8 estimator.
 *
 * Why: token budget math must stay identical across renderer/main/test paths.
 */
export function tokenBudgetToUtf8ByteLimit(tokenBudget: number): number {
  return Math.max(0, Math.floor(tokenBudget * UTF8_BYTES_PER_TOKEN));
}

/**
 * Estimate token count from UTF-8 byte length.
 *
 * Why: V1 keeps token estimation deterministic and tokenizer-free.
 * @deprecated Prefer estimateCjkAwareTokenCount for Chinese-writing workloads.
 */
export function estimateUtf8TokenCount(text: string): number {
  const bytes = new TextEncoder().encode(text).length;
  return bytes === 0 ? 0 : Math.ceil(bytes / UTF8_BYTES_PER_TOKEN);
}

/**
 * Trim UTF-8 content to fit into a token budget.
 *
 * Why: all layers must share one truncation rule to avoid drift.
 */
export function trimUtf8ToTokenBudget(
  text: string,
  tokenBudget: number,
): string {
  const maxBytes = tokenBudgetToUtf8ByteLimit(tokenBudget);
  if (maxBytes === 0) {
    return "";
  }

  const encoded = new TextEncoder().encode(text);
  if (encoded.length <= maxBytes) {
    return text;
  }

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const minBytes = Math.max(0, maxBytes - 3);
  for (let byteCount = maxBytes; byteCount >= minBytes; byteCount -= 1) {
    try {
      return decoder.decode(encoded.subarray(0, byteCount));
    } catch {
      // Continue rolling back to reach a valid UTF-8 boundary.
    }
  }

  return "";
}
