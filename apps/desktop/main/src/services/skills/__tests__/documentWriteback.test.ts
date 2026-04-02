import { describe, expect, it } from "vitest";

import { appendSuggestionToDocument } from "../documentWriteback";

describe("appendSuggestionToDocument", () => {
  it("cursorPosition + multi-paragraph suggestion preserves paragraph boundaries", () => {
    const result = appendSuggestionToDocument({
      contentJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "甲乙丙丁" }],
          },
        ],
      },
      cursorPosition: 3,
      suggestion: "续写甲\n\n续写乙",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "甲乙续写甲" }],
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "续写乙丙丁" }],
            },
          ],
        },
      },
    });
  });

  it("cursorPosition + single-paragraph suggestion stays inline", () => {
    const result = appendSuggestionToDocument({
      contentJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "甲乙丙丁" }],
          },
        ],
      },
      cursorPosition: 3,
      suggestion: "续写甲",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "甲乙续写甲丙丁" }],
            },
          ],
        },
      },
    });
  });

  it("without cursorPosition appends new paragraphs at document end", () => {
    const result = appendSuggestionToDocument({
      contentJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "甲乙丙丁" }],
          },
        ],
      },
      suggestion: "续写甲\n\n续写乙",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "甲乙丙丁" }],
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "续写甲" }],
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "续写乙" }],
            },
          ],
        },
      },
    });
  });
});
