import { describe, expect, it } from "vitest";
import { Node as ProseMirrorNode } from "prosemirror-model";

import { appendSuggestionToDocument } from "../documentWriteback";
import { editorSchema } from "../../editor/prosemirrorSchema";

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

  // Alignment regression: lock the PM-pos vs text-offset semantic mismatch described in Issue #37.
  // cursorPosition=3 in a single-paragraph ProseMirror doc "甲乙丙丁" means PM pos 3 = after 乙.
  // Text offset for that PM pos = 2 (two characters before cursor: 甲乙).
  // The context assembly must receive textOffset=2 so the immediate layer shows "甲乙",
  // while writeback still uses PM pos 3 and inserts after 乙 → "甲乙<AI>丙丁".
  describe("PM pos to text offset alignment (cursorPosition=3 / 甲乙丙丁 regression)", () => {
    const singleParaDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "甲乙丙丁" }],
        },
      ],
    };

    it("writeback with cursorPosition=3 inserts at PM pos 3 (between 乙 and 丙)", () => {
      const result = appendSuggestionToDocument({
        contentJson: singleParaDoc,
        cursorPosition: 3,
        suggestion: "续",
      });
      expect(result.ok).toBe(true);
      const text = (result as Extract<typeof result, { ok: true }>).data.contentJson as {
        content: Array<{ content: Array<{ text: string }> }>;
      };
      // PM pos 3 = after 乙 (2nd char) → insertion produces "甲乙续丙丁"
      expect(text.content[0].content[0].text).toBe("甲乙续丙丁");
    });

    it("ProseMirror pos 3 in single-para doc 甲乙丙丁 resolves to text offset 2 (not 3)", () => {
      // This documents the PM pos → text offset relationship.
      // PM structure: [0:before-para][1:start-para][2:after-甲][3:after-乙][4:after-丙][5:after-丁][6:end-para]
      // So PM pos 3 = after 乙 = text offset 2 (two chars: 甲 + 乙).
      const doc = ProseMirrorNode.fromJSON(editorSchema, singleParaDoc);
      let textCharsBeforePos3 = 0;
      doc.nodesBetween(0, 3, (node, nodePos) => {
        if (node.isText && node.text !== undefined) {
          const nodeEnd = nodePos + node.nodeSize;
          const overlapEnd = Math.min(nodeEnd, 3);
          textCharsBeforePos3 += overlapEnd - nodePos;
        }
        return true;
      });
      // PM pos 3 in a single-paragraph doc = text offset 2 (NOT 3)
      expect(textCharsBeforePos3).toBe(2);
    });

    it("context assembly with textOffset=2 shows '甲乙' (aligned with writeback insertion at PM pos 3)", async () => {
      // This is a CROSS-FILE alignment test: writeback at PM pos 3 → "甲乙[AI]丙丁".
      // Context assembly with textOffset=2 → immediate shows "甲乙" → AI sees correct preceding text.
      // If context used cursorPosition=3 directly (plain text offset), it would show "甲乙丙" (WRONG).
      const { createContextLayerAssemblyService } = await import(
        "../../context/layerAssemblyService"
      );
      const service = createContextLayerAssemblyService({
        rules: async () => ({ chunks: [] }),
        settings: async () => ({ chunks: [] }),
        retrieved: async () => ({ chunks: [] }),
      });
      const inspect = await service.inspect({
        projectId: "p",
        documentId: "d",
        cursorPosition: 3,
        textOffset: 2,
        skillId: "builtin:continue",
        additionalInput: "甲乙丙丁",
        debugMode: true,
        requestedBy: "unit-test",
      });
      // With textOffset=2, immediate layer must show "甲乙" — matching PM pos 3 writeback anchor
      expect(inspect.layersDetail.immediate.content).toBe("甲乙");
    });
  });
});
