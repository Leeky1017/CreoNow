import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  normalizeAssembledContextPrompt,
  resolveContinueValidationInput,
} from "../contextPromptPolicy";

describe("contextPromptPolicy", () => {
  it("document-window prompt preserves trailing whitespace", () => {
    assert.equal(
      normalizeAssembledContextPrompt({
        prompt: "## Immediate\n甲乙 ",
        inputType: "document",
      }),
      "## Immediate\n甲乙 ",
    );
  });

  it("document-window prompt preserves leading whitespace", () => {
    assert.equal(
      normalizeAssembledContextPrompt({
        prompt: "## Immediate\n 甲乙",
        inputType: "document",
      }),
      "## Immediate\n 甲乙",
    );
  });

  it("document-window multi-paragraph prompt preserves newline + trailing whitespace", () => {
    assert.equal(
      normalizeAssembledContextPrompt({
        prompt: "## Immediate\n甲\n乙 ",
        inputType: "document",
      }),
      "## Immediate\n甲\n乙 ",
    );
  });

  it("selection prompt still trims whitespace-only payloads away", () => {
    assert.equal(
      normalizeAssembledContextPrompt({
        prompt: "   \n  ",
        inputType: "selection",
      }),
      undefined,
    );
  });

  it("continue validation input preserves raw whitespace-bearing context prompt", () => {
    assert.equal(
      resolveContinueValidationInput({
        rawInputText: "",
        contextPrompt: "## Immediate\n甲乙 ",
      }),
      "## Immediate\n甲乙 ",
    );
  });
});