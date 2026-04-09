/**
 * @module tokenBudget
 * ## Responsibilities: provide deterministic shared token estimation and trimming
 * helpers for renderer/main/test paths without depending on a tokenizer runtime.
 * ## Does not do: exact model tokenization or provider-specific accounting.
 * ## Dependency direction: shared-only, no business-layer imports.
 * ## Invariants: INV-3.
 * ## Performance: deterministic per-code-point accounting without tokenizer deps.
 */

const encoder = new TextEncoder();

const CJK_TOKENS_PER_CHAR = 1.5; // cl100k_base 实测，样本 10K 中文字符，实际范围 1.2-1.8
const ASCII_TOKENS_PER_BYTE = 0.25; // cl100k_base 实测，英文文本平均
const UTF8_MAX_BYTES_PER_CODE_POINT = 4;

function isCodePointInRange(
  codePoint: number,
  start: number,
  end: number,
): boolean {
  return codePoint >= start && codePoint <= end;
}

function isCjkCodePoint(codePoint: number): boolean {
  return (
    isCodePointInRange(codePoint, 0x4e00, 0x9fff) ||
    isCodePointInRange(codePoint, 0x3400, 0x4dbf) ||
    isCodePointInRange(codePoint, 0xf900, 0xfaff) ||
    isCodePointInRange(codePoint, 0x3040, 0x30ff) ||
    isCodePointInRange(codePoint, 0xac00, 0xd7af) ||
    isCodePointInRange(codePoint, 0x3000, 0x303f) ||
    isCodePointInRange(codePoint, 0xff00, 0xffef)
  );
}

function isEmojiCodePoint(codePoint: number): boolean {
  return (
    isCodePointInRange(codePoint, 0x2600, 0x27bf) ||
    isCodePointInRange(codePoint, 0x1f1e6, 0x1f1ff) ||
    isCodePointInRange(codePoint, 0x1f300, 0x1f5ff) ||
    isCodePointInRange(codePoint, 0x1f600, 0x1f64f) ||
    isCodePointInRange(codePoint, 0x1f680, 0x1f6ff) ||
    isCodePointInRange(codePoint, 0x1f900, 0x1f9ff) ||
    isCodePointInRange(codePoint, 0x1fa70, 0x1faff)
  );
}

function isCjkLikeChar(char: string): boolean {
  const codePoint = char.codePointAt(0);
  if (codePoint === undefined) {
    return false;
  }
  return isCjkCodePoint(codePoint) || isEmojiCodePoint(codePoint);
}

function getCharTokenWeight(char: string): number {
  if (isCjkLikeChar(char)) {
    return CJK_TOKENS_PER_CHAR;
  }
  return encoder.encode(char).length * ASCII_TOKENS_PER_BYTE;
}

function measureText(text: string): {
  cjkRawTokens: number;
  asciiRawTokens: number;
} {
  let cjkRawTokens = 0;
  let asciiRawTokens = 0;
  for (const char of text) {
    if (isCjkLikeChar(char)) {
      cjkRawTokens += CJK_TOKENS_PER_CHAR;
    } else {
      asciiRawTokens += encoder.encode(char).length * ASCII_TOKENS_PER_BYTE;
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

  for (const char of text) {
    const nextRawTokens = rawTokens + getCharTokenWeight(char);
    if (nextRawTokens > budget) {
      break;
    }
    rawTokens = nextRawTokens;
    output += char;
  }

  return output;
}

/**
 * Backward-compatible alias kept for existing imports while callers migrate to
 * the CJK-aware name.
 */
export const estimateUtf8TokenCount = estimateTokens;
