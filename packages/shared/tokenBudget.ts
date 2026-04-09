/**
 * @module tokenBudget
 * ## Responsibilities: provide deterministic shared token estimation and trimming
 * helpers for renderer/main/test paths without depending on a tokenizer runtime.
 * ## Does not do: exact model tokenization or provider-specific accounting.
 * ## Dependency direction: shared-only, no business-layer imports.
 * ## Invariants: INV-3.
 * ## Performance: deterministic grapheme-aware accounting without tokenizer deps.
 */

const encoder = new TextEncoder();
// Why: trimming by code point can split ZWJ / variation-selector emoji and leak
// broken fragments like "👩‍". Grapheme segmentation keeps truncation fail-closed
// for user-visible characters while preserving the shared no-tokenizer contract.
const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

const CJK_TOKENS_PER_CHAR = 1.5; // cl100k_base 实测，样本 10K 中文字符，实际范围 1.2-1.8
const ASCII_TOKENS_PER_BYTE = 0.25; // cl100k_base 实测，英文文本平均
const UTF8_MAX_BYTES_PER_CODE_POINT = 4;
const CJK_CODE_POINT_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x3400, 0x4dbf], // CJK Unified Ideographs Extension A
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0xf900, 0xfaff], // CJK Compatibility Ideographs
  [0x20000, 0x2a6df], // CJK Unified Ideographs Extension B
  [0x2a700, 0x2b73f], // CJK Unified Ideographs Extension C
  [0x2b740, 0x2b81f], // CJK Unified Ideographs Extension D
  [0x2b820, 0x2ceaf], // CJK Unified Ideographs Extension E
  [0x2ceb0, 0x2ebef], // CJK Unified Ideographs Extension F
  [0x2ebf0, 0x2ee5f], // CJK Unified Ideographs Extension I
  [0x2f800, 0x2fa1f], // CJK Compatibility Ideographs Supplement
  [0x30000, 0x3134a], // CJK Unified Ideographs Extension G
  [0x31350, 0x323af], // CJK Unified Ideographs Extension H
  [0x3040, 0x30ff], // Hiragana + Katakana
  [0x31f0, 0x31ff], // Katakana Phonetic Extensions
  [0x3000, 0x303f], // CJK Symbols and Punctuation
  [0xac00, 0xd7af], // Hangul Syllables
  [0xff00, 0xffef], // Halfwidth and Fullwidth Forms
];
const emojiLikePattern =
  /(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3)/u;

function isCodePointInRange(
  codePoint: number,
  start: number,
  end: number,
): boolean {
  return codePoint >= start && codePoint <= end;
}

function isCjkCodePoint(codePoint: number): boolean {
  return CJK_CODE_POINT_RANGES.some(([start, end]) =>
    isCodePointInRange(codePoint, start, end),
  );
}

function segmentText(text: string): string[] {
  return Array.from(
    graphemeSegmenter.segment(text),
    (segment) => segment.segment,
  );
}

function isEmojiSegment(segment: string): boolean {
  return emojiLikePattern.test(segment);
}

function isCjkLikeSegment(segment: string): boolean {
  if (segment.length === 0) {
    return false;
  }
  if (isEmojiSegment(segment)) {
    return true;
  }
  for (const char of segment) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && isCjkCodePoint(codePoint)) {
      return true;
    }
  }
  return false;
}

function getSegmentTokenWeight(segment: string): number {
  if (isCjkLikeSegment(segment)) {
    return CJK_TOKENS_PER_CHAR;
  }
  return encoder.encode(segment).length * ASCII_TOKENS_PER_BYTE;
}

function measureText(text: string): {
  cjkRawTokens: number;
  asciiRawTokens: number;
} {
  let cjkRawTokens = 0;
  let asciiRawTokens = 0;
  for (const segment of segmentText(text)) {
    if (isCjkLikeSegment(segment)) {
      cjkRawTokens += CJK_TOKENS_PER_CHAR;
    } else {
      asciiRawTokens += encoder.encode(segment).length * ASCII_TOKENS_PER_BYTE;
    }
  }
  return { cjkRawTokens, asciiRawTokens };
}

/**
 * Convert token budget into a conservative UTF-8 byte ceiling.
 *
 * Why: some callers still need a transport-safe byte upper bound even though
 * token estimation itself is CJK-aware. Using the UTF-8 max keeps the bound
 * fail-closed instead of underestimating multi-byte code points.
 */
export function tokenBudgetToUtf8ByteLimit(tokenBudget: number): number {
  if (!Number.isFinite(tokenBudget) || tokenBudget <= 0) {
    return 0;
  }
  return Math.floor(tokenBudget) * UTF8_MAX_BYTES_PER_CODE_POINT;
}

export function estimateTokensCjk(text: string): number {
  const rawTokens = measureText(text).cjkRawTokens;
  return rawTokens === 0 ? 0 : Math.ceil(rawTokens);
}

export function estimateTokensAscii(text: string): number {
  const rawTokens = measureText(text).asciiRawTokens;
  return rawTokens === 0 ? 0 : Math.ceil(rawTokens);
}

/**
 * Estimate tokens with CJK-aware segmentation.
 *
 * Why: INV-3 forbids the UTF8_BYTES/4 shortcut because it underestimates
 * Chinese-heavy prompts and causes budget/cost decisions to drift.
 */
export function estimateTokens(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  const { cjkRawTokens, asciiRawTokens } = measureText(text);
  const rawTokens = cjkRawTokens + asciiRawTokens;
  return rawTokens === 0 ? 0 : Math.ceil(rawTokens);
}

export function isWithinBudget(text: string, budget: number): boolean {
  if (!Number.isFinite(budget) || budget < 0) {
    return false;
  }
  return estimateTokens(text) <= Math.floor(budget);
}

/**
 * Trim text to fit the shared token estimator.
 *
 * Why: all layers must share one truncation rule; byte-only trimming would keep
 * CJK prefixes that still exceed the caller's token budget.
 */
export function trimUtf8ToTokenBudget(
  text: string,
  tokenBudget: number,
): string {
  if (!Number.isFinite(tokenBudget) || tokenBudget <= 0) {
    return "";
  }
  if (isWithinBudget(text, tokenBudget)) {
    return text;
  }

  const budget = Math.floor(tokenBudget);
  let rawTokens = 0;
  let output = "";

  for (const segment of segmentText(text)) {
    const nextRawTokens = rawTokens + getSegmentTokenWeight(segment);
    if (nextRawTokens > budget) {
      break;
    }
    rawTokens = nextRawTokens;
    output += segment;
  }

  return output;
}

/**
 * Backward-compatible alias kept for existing imports while callers migrate to
 * the CJK-aware name.
 */
export const estimateUtf8TokenCount = estimateTokens;
