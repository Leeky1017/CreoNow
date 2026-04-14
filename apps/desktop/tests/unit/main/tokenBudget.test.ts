/**
 * Unit tests for packages/shared/tokenBudget.ts — INV-3 compliance.
 *
 * INV-3: CJK characters require ~1.5 tokens/char; Latin/ASCII is ~1 token per
 * 4 chars.  The old UTF8_BYTES/4 shortcut is forbidden because it
 * under-counts Chinese-heavy prompts by ~40%.
 *
 * Regression note: UTF8_BYTES/4 for "你好世界" (4 chars, 12 UTF-8 bytes) would
 * give ceil(12/4)=3 tokens, but the correct CJK-aware answer is ceil(4*1.5)=6.
 */

import { describe, expect, it } from "vitest";

import {
  estimateTokens,
  estimateTokensAscii,
  estimateTokensCjk,
  isWithinBudget,
  tokenBudgetToUtf8ByteLimit,
  trimUtf8ToTokenBudget,
} from "@shared/tokenBudget";

// ---------------------------------------------------------------------------
// estimateTokens
// ---------------------------------------------------------------------------

describe("estimateTokens — INV-3 CJK-aware estimation", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("ASCII-only: ceil(11 chars × 0.25) = 3 for 'hello world'", () => {
    // 11 ASCII bytes × 0.25 = 2.75 → ceil = 3
    expect(estimateTokens("hello world")).toBe(3);
  });

  it("pure CJK: ceil(4 chars × 1.5) = 6 for '你好世界'", () => {
    expect(estimateTokens("你好世界")).toBe(6);
  });

  it("mixed text: ceil(6 ASCII × 0.25 + 2 CJK × 1.5) = 5 for 'hello 你好'", () => {
    // 'h','e','l','l','o',' ' = 6 ASCII = 1.5  tokens
    // '你','好'             = 2 CJK   = 3.0 tokens
    // total raw = 4.5 → ceil = 5
    expect(estimateTokens("hello 你好")).toBe(5);
  });

  it("INV-3 regression: CJK must not use UTF8_BYTES/4 shortcut", () => {
    // '你好世界' → 12 UTF-8 bytes; UTF8_BYTES/4 = 3 (WRONG)
    // Correct CJK-aware answer: 4 × 1.5 = 6.0 → ceil = 6
    const cjk = "你好世界";
    const encoder = new TextEncoder();
    const wrongAnswer = Math.ceil(encoder.encode(cjk).length / 4);
    const correctAnswer = estimateTokens(cjk);
    expect(correctAnswer).toBe(6);
    // The wrong formula gives 3 — less than the correct answer
    expect(correctAnswer).toBeGreaterThan(wrongAnswer);
  });

  it("Hiragana is counted as CJK (≈1.5 tokens/char)", () => {
    // 'あいう' — 3 Hiragana chars → 3 × 1.5 = 4.5 → ceil = 5
    expect(estimateTokens("あいう")).toBe(5);
  });

  it("Katakana is counted as CJK (≈1.5 tokens/char)", () => {
    // 'アイウ' — 3 Katakana chars → 3 × 1.5 = 4.5 → ceil = 5
    expect(estimateTokens("アイウ")).toBe(5);
  });

  it("Hangul syllables are counted as CJK", () => {
    // '안녕' — 2 Hangul chars → 2 × 1.5 = 3.0 → ceil = 3
    expect(estimateTokens("안녕")).toBe(3);
  });

  it("single ASCII char returns ceil(0.25) = 1", () => {
    expect(estimateTokens("a")).toBe(1);
  });

  it("single CJK char returns ceil(1.5) = 2", () => {
    expect(estimateTokens("中")).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// estimateTokensCjk / estimateTokensAscii — sub-counters
// ---------------------------------------------------------------------------

describe("estimateTokensCjk", () => {
  it("returns 0 for ASCII-only text", () => {
    expect(estimateTokensCjk("hello")).toBe(0);
  });

  it("returns ceil(4 × 1.5) = 6 for '你好世界'", () => {
    expect(estimateTokensCjk("你好世界")).toBe(6);
  });

  it("returns 0 for empty string", () => {
    expect(estimateTokensCjk("")).toBe(0);
  });
});

describe("estimateTokensAscii", () => {
  it("returns 0 for CJK-only text", () => {
    expect(estimateTokensAscii("你好")).toBe(0);
  });

  it("returns ceil(5 × 0.25) = 2 for 'hello'", () => {
    // 5 × 0.25 = 1.25 → ceil = 2
    expect(estimateTokensAscii("hello")).toBe(2);
  });

  it("returns 0 for empty string", () => {
    expect(estimateTokensAscii("")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// tokenBudgetToUtf8ByteLimit
// ---------------------------------------------------------------------------

describe("tokenBudgetToUtf8ByteLimit", () => {
  it("converts budget to byte ceiling via UTF8_MAX_BYTES_PER_CODE_POINT=4", () => {
    expect(tokenBudgetToUtf8ByteLimit(10)).toBe(40);
  });

  it("returns 0 for non-finite or non-positive budget", () => {
    expect(tokenBudgetToUtf8ByteLimit(0)).toBe(0);
    expect(tokenBudgetToUtf8ByteLimit(-1)).toBe(0);
    expect(tokenBudgetToUtf8ByteLimit(Infinity)).toBe(0);
    expect(tokenBudgetToUtf8ByteLimit(NaN)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isWithinBudget
// ---------------------------------------------------------------------------

describe("isWithinBudget", () => {
  it("returns true when tokens ≤ budget", () => {
    expect(isWithinBudget("你好世界", 6)).toBe(true);
    expect(isWithinBudget("hello", 10)).toBe(true);
  });

  it("returns false when tokens > budget", () => {
    expect(isWithinBudget("你好世界", 5)).toBe(false);
  });

  it("returns false for invalid budget values", () => {
    expect(isWithinBudget("text", -1)).toBe(false);
    expect(isWithinBudget("text", NaN)).toBe(false);
    expect(isWithinBudget("text", Infinity)).toBe(false);
  });

  it("returns true for empty string regardless of budget", () => {
    expect(isWithinBudget("", 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// trimUtf8ToTokenBudget
// ---------------------------------------------------------------------------

describe("trimUtf8ToTokenBudget", () => {
  it("returns empty string for non-positive or non-finite budget", () => {
    expect(trimUtf8ToTokenBudget("hello", 0)).toBe("");
    expect(trimUtf8ToTokenBudget("hello", -1)).toBe("");
    expect(trimUtf8ToTokenBudget("hello", Infinity)).toBe("");
  });

  it("returns full text when within budget", () => {
    expect(trimUtf8ToTokenBudget("hello", 10)).toBe("hello");
  });

  it("trims CJK text to fit budget", () => {
    // '你好世界' = 6 tokens; trim to budget=3 should give '你' (2 tokens)
    // Actually: '你'=ceil(1.5)=2 token raw=1.5 ≤3, '你好'=raw=3.0 ≤3, '你好世'=4.5>3
    const result = trimUtf8ToTokenBudget("你好世界", 3);
    // raw tokens: '你'=1.5, '好'=1.5; at '世': 1.5+1.5+1.5=4.5 > 3 → stop after '好'
    expect(result).toBe("你好");
  });

  it("trims ASCII text to fit budget", () => {
    // 'hello world' = 11 * 0.25 = 2.75 raw → 3 tokens; budget=1 stops early
    // budget=1: after 'h' raw=0.25 ≤1, after 'e' 0.5 ≤1, ... after 'd' 2.75 > 1
    // grapheme by grapheme: stops after 4 chars ('hell') raw=1.0 ≤1, 'hello'=1.25>1
    const result = trimUtf8ToTokenBudget("hello", 1);
    expect(result).toBe("hell");
  });
});
