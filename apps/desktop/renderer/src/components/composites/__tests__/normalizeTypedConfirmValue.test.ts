import { describe, expect, it } from "vitest";

import { normalizeTypedConfirmValue } from "../ConfirmDialog";

/**
 * Tests for {@link normalizeTypedConfirmValue}.
 *
 * Addresses PR #209 audit finding B2: the typed-confirm equality check must be
 * resilient against:
 * 1. Unicode normalisation forms (NFC vs NFD) — CJK characters can be entered
 *    in decomposed form by some IMEs, which would otherwise break equality.
 * 2. Zero-width / BOM injection attacks — a user (or clipboard) could paste a
 *    name that looks identical but contains invisible separators, bypassing
 *    the confirmation gate.
 */
describe("normalizeTypedConfirmValue", () => {
  describe("CJK / NFC normalisation", () => {
    it("returns CJK input unchanged when already in NFC form", () => {
      expect(normalizeTypedConfirmValue("林黛玉")).toBe("林黛玉");
    });

    it("collapses NFD decomposed Hangul to canonical NFC form", () => {
      // 한 = U+1112 (ᄒ) + U+1161 (ᅡ) + U+11AB (ᆫ) in NFD; NFC composes to U+D55C.
      const decomposed = "\u1112\u1161\u11AB";
      expect(decomposed.normalize("NFC")).toBe("한");
      expect(normalizeTypedConfirmValue(decomposed)).toBe("한");
    });

    it("matches NFC and NFD representations of the same string", () => {
      const nfc = "café";
      const nfd = "cafe\u0301"; // e + combining acute accent
      expect(normalizeTypedConfirmValue(nfc)).toBe(
        normalizeTypedConfirmValue(nfd),
      );
    });

    it("matches mixed CJK + Latin strings across NFC / NFD", () => {
      const nfc = "Project-林黛玉-café";
      const nfd = "Project-林黛玉-cafe\u0301";
      expect(normalizeTypedConfirmValue(nfc)).toBe(
        normalizeTypedConfirmValue(nfd),
      );
    });
  });

  describe("zero-width / BOM attack vectors", () => {
    it("strips zero-width space (U+200B)", () => {
      expect(normalizeTypedConfirmValue("林\u200B黛玉")).toBe("林黛玉");
    });

    it("strips zero-width non-joiner (U+200C)", () => {
      expect(normalizeTypedConfirmValue("林\u200C黛玉")).toBe("林黛玉");
    });

    it("strips zero-width joiner (U+200D)", () => {
      expect(normalizeTypedConfirmValue("林\u200D黛玉")).toBe("林黛玉");
    });

    it("strips BOM / ZWNBSP (U+FEFF)", () => {
      expect(normalizeTypedConfirmValue("\uFEFF林黛玉\uFEFF")).toBe("林黛玉");
    });

    it("strips multiple zero-width characters sprinkled across the string", () => {
      const attack = "\u200B林\u200C黛\u200D玉\uFEFF";
      expect(normalizeTypedConfirmValue(attack)).toBe("林黛玉");
    });

    it("a zero-width-injected input matches the clean target name", () => {
      const target = "林黛玉";
      const attack = "林\u200B黛\u200B玉";
      expect(normalizeTypedConfirmValue(attack)).toBe(
        normalizeTypedConfirmValue(target),
      );
    });
  });

  describe("whitespace", () => {
    it("trims surrounding ASCII whitespace", () => {
      expect(normalizeTypedConfirmValue("   林黛玉   ")).toBe("林黛玉");
    });

    it("preserves interior whitespace", () => {
      expect(normalizeTypedConfirmValue("Red  Dragon")).toBe("Red  Dragon");
    });
  });

  describe("edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(normalizeTypedConfirmValue("")).toBe("");
    });

    it("returns empty string for whitespace-only input", () => {
      expect(normalizeTypedConfirmValue("   ")).toBe("");
    });

    it("returns empty string for a string containing only zero-width chars", () => {
      expect(normalizeTypedConfirmValue("\u200B\u200C\u200D\uFEFF")).toBe("");
    });
  });
});
