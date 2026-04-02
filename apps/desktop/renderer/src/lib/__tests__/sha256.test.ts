import { describe, expect, it } from "vitest";

import { computeSelectionTextHash } from "@/editor/schema";
import { sha256Hex } from "../../../../shared/sha256";

describe("sha256 selection hash", () => {
  it.each([
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    ["你好，世界", "46932f1e6ea5216e77f58b1908d72ec9322ed129318c6d4bd4450b5eaab9d7e7"],
  ])("matches the standard SHA-256 vector for %j", (text: string, expected: string) => {
    expect(sha256Hex(text)).toBe(expected);
    expect(computeSelectionTextHash(text)).toBe(expected);
  });
});
