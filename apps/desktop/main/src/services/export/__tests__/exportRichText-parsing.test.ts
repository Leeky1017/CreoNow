import { describe, it, expect } from "vitest";

import {
  parseStructuredExportDocument,
  renderStructuredMarkdown,
  renderStructuredMarkdownExport,
  buildPdfRenderPlan,
  type StructuredExportDocument,
} from "../exportRichText";

function tiptapDoc(...content: unknown[]): string {
  return JSON.stringify({ type: "doc", content });
}

function paragraph(...textNodes: unknown[]) {
  return { type: "paragraph", content: textNodes };
}

function text(value: string, marks?: Array<{ type: string; attrs?: unknown }>) {
  return { type: "text", text: value, marks };
}

function heading(level: number, ...textNodes: unknown[]) {
  return { type: "heading", attrs: { level }, content: textNodes };
}

describe("parseStructuredExportDocument", () => {
  describe("valid documents", () => {
    it("should parse empty doc", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc(),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.blocks).toEqual([]);
      }
    });

    it("should parse doc with single paragraph", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc(paragraph(text("Hello world"))),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.blocks).toHaveLength(1);
        expect(result.data.blocks[0].type).toBe("paragraph");
      }
    });

    it("should parse doc with heading", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc(heading(2, text("Chapter One"))),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const h = result.data.blocks[0];
        expect(h.type).toBe("heading");
        if (h.type === "heading") {
          expect(h.level).toBe(2);
        }
      }
    });

    it("should parse doc with bold text", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc(
          paragraph(text("bold text", [{ type: "bold" }])),
        ),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const p = result.data.blocks[0];
        if (p.type === "paragraph") {
          const t = p.content[0];
          if (t.type === "text") {
            expect(t.marks).toEqual([{ type: "bold" }]);
          }
        }
      }
    });

    it("should parse horizontal rule", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc({ type: "horizontalRule" }),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.blocks[0].type).toBe("horizontalRule");
      }
    });

    it("should parse horizontal_rule (snake_case)", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc({ type: "horizontal_rule" }),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.blocks[0].type).toBe("horizontalRule");
      }
    });

    it("should parse code block", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc({
          type: "codeBlock",
          attrs: { language: "typescript" },
          content: [{ type: "text", text: "const x = 1;" }],
        }),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const block = result.data.blocks[0];
        if (block.type === "codeBlock") {
          expect(block.text).toBe("const x = 1;");
          expect(block.language).toBe("typescript");
        }
      }
    });

    it("should parse code_block (snake_case)", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc({
          type: "code_block",
          content: [{ type: "text", text: "print('hi')" }],
        }),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const block = result.data.blocks[0];
        expect(block.type).toBe("codeBlock");
        if (block.type === "codeBlock") {
          expect(block.language).toBeNull();
        }
      }
    });

    it("should parse blockquote", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc({
          type: "blockquote",
          content: [paragraph(text("quoted text"))],
        }),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const block = result.data.blocks[0];
        expect(block.type).toBe("blockquote");
      }
    });

    it("should parse bullet list", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc({
          type: "bulletList",
          content: [
            { type: "listItem", content: [paragraph(text("item 1"))] },
            { type: "listItem", content: [paragraph(text("item 2"))] },
          ],
        }),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const block = result.data.blocks[0];
        if (block.type === "bulletList") {
          expect(block.items).toHaveLength(2);
        }
      }
    });

    it("should parse ordered list", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc({
          type: "orderedList",
          content: [
            { type: "listItem", content: [paragraph(text("first"))] },
          ],
        }),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.blocks[0].type).toBe("orderedList");
      }
    });

    it("should parse image node", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc({
          type: "image",
          attrs: {
            src: "https://example.com/img.png",
            alt: "desc",
            title: "title",
            width: 640,
            height: 480,
          },
        }),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const block = result.data.blocks[0];
        if (block.type === "image") {
          expect(block.src).toBe("https://example.com/img.png");
          expect(block.width).toBe(640);
          expect(block.height).toBe(480);
        }
      }
    });

    it("should parse hard break", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc(
          paragraph(text("before"), { type: "hardBreak" }, text("after")),
        ),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const p = result.data.blocks[0];
        if (p.type === "paragraph") {
          expect(p.content).toHaveLength(3);
          expect(p.content[1].type).toBe("hardBreak");
        }
      }
    });

    it("should parse link mark", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc(
          paragraph(
            text("click here", [
              { type: "link", attrs: { href: "https://example.com" } },
            ]),
          ),
        ),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const p = result.data.blocks[0];
        if (p.type === "paragraph") {
          const t = p.content[0];
          if (t.type === "text") {
            expect(t.marks[0]).toEqual({
              type: "link",
              href: "https://example.com",
            });
          }
        }
      }
    });
  });

  describe("error handling", () => {
    it("should reject invalid JSON", () => {
      const result = parseStructuredExportDocument({
        contentJson: "not json",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.unsupported).toContain("contentJson:invalid-json");
      }
    });

    it("should reject non-doc root", () => {
      const result = parseStructuredExportDocument({
        contentJson: JSON.stringify({ type: "paragraph" }),
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.unsupported).toContain("contentJson:doc-root");
      }
    });

    it("should reject non-object root", () => {
      const result = parseStructuredExportDocument({
        contentJson: JSON.stringify("just a string"),
      });
      expect(result.ok).toBe(false);
    });

    it("should report unsupported node types", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc({ type: "table" }),
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.unsupported.some((u) => u.includes("table"))).toBe(true);
      }
    });

    it("should report unsupported mark types", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc(
          paragraph(text("highlight", [{ type: "highlight" }])),
        ),
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(
          result.unsupported.some((u) => u.includes("highlight")),
        ).toBe(true);
      }
    });

    it("should reject image with empty src", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc({
          type: "image",
          attrs: { src: "", alt: "x" },
        }),
      });
      expect(result.ok).toBe(false);
    });

    it("should reject link with empty href", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc(
          paragraph(text("link", [{ type: "link", attrs: { href: "" } }])),
        ),
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should default heading level to 1 when invalid", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc({
          type: "heading",
          attrs: { level: "invalid" },
          content: [text("Title")],
        }),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const block = result.data.blocks[0];
        if (block.type === "heading") {
          expect(block.level).toBe(1);
        }
      }
    });

    it("should default image dimensions when missing", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc({
          type: "image",
          attrs: { src: "/img.png" },
        }),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const block = result.data.blocks[0];
        if (block.type === "image") {
          expect(block.width).toBe(320);
          expect(block.height).toBe(180);
        }
      }
    });

    it("should normalize CRLF to LF in text", () => {
      const result = parseStructuredExportDocument({
        contentJson: tiptapDoc(paragraph(text("line1\r\nline2"))),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const p = result.data.blocks[0];
        if (p.type === "paragraph") {
          const t = p.content[0];
          if (t.type === "text") {
            expect(t.text).toBe("line1\nline2");
          }
        }
      }
    });
  });
});

describe("renderStructuredMarkdown", () => {
  it("should render paragraph", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello", marks: [] }],
        },
      ],
    };
    expect(renderStructuredMarkdown(doc)).toBe("Hello");
  });

  it("should render heading", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        {
          type: "heading",
          level: 2,
          content: [{ type: "text", text: "Title", marks: [] }],
        },
      ],
    };
    expect(renderStructuredMarkdown(doc)).toBe("## Title");
  });

  it("should render bold text", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "bold", marks: [{ type: "bold" }] },
          ],
        },
      ],
    };
    expect(renderStructuredMarkdown(doc)).toBe("**bold**");
  });

  it("should render italic text", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "italic", marks: [{ type: "italic" }] },
          ],
        },
      ],
    };
    expect(renderStructuredMarkdown(doc)).toBe("*italic*");
  });

  it("should render code text", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "code", marks: [{ type: "code" }] },
          ],
        },
      ],
    };
    expect(renderStructuredMarkdown(doc)).toBe("`code`");
  });

  it("should render strike text", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "old", marks: [{ type: "strike" }] },
          ],
        },
      ],
    };
    expect(renderStructuredMarkdown(doc)).toBe("~~old~~");
  });

  it("should render underline text", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "under", marks: [{ type: "underline" }] },
          ],
        },
      ],
    };
    expect(renderStructuredMarkdown(doc)).toBe("<u>under</u>");
  });

  it("should render link text", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "click",
              marks: [{ type: "link", href: "https://example.com" }],
            },
          ],
        },
      ],
    };
    expect(renderStructuredMarkdown(doc)).toBe(
      "[click](https://example.com)",
    );
  });

  it("should render horizontal rule", () => {
    const doc: StructuredExportDocument = {
      blocks: [{ type: "horizontalRule" }],
    };
    expect(renderStructuredMarkdown(doc)).toBe("---");
  });

  it("should render code block with language", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        { type: "codeBlock", text: "const x = 1;", language: "ts" },
      ],
    };
    expect(renderStructuredMarkdown(doc)).toBe("```ts\nconst x = 1;\n```");
  });

  it("should render hard break as markdown line break", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "line1", marks: [] },
            { type: "hardBreak" },
            { type: "text", text: "line2", marks: [] },
          ],
        },
      ],
    };
    expect(renderStructuredMarkdown(doc)).toBe("line1  \nline2");
  });

  it("should render blockquote", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        {
          type: "blockquote",
          blocks: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "quote", marks: [] }],
            },
          ],
        },
      ],
    };
    expect(renderStructuredMarkdown(doc)).toBe("> quote");
  });

  it("should render bullet list", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        {
          type: "bulletList",
          items: [
            {
              blocks: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "item", marks: [] }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(renderStructuredMarkdown(doc)).toBe("- item");
  });

  it("should render ordered list", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        {
          type: "orderedList",
          items: [
            {
              blocks: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "first", marks: [] }],
                },
              ],
            },
            {
              blocks: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "second", marks: [] }],
                },
              ],
            },
          ],
        },
      ],
    };
    const md = renderStructuredMarkdown(doc);
    expect(md).toContain("1. first");
    expect(md).toContain("2. second");
  });

  it("should render image with title", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        {
          type: "image",
          src: "/img.png",
          alt: "photo",
          title: "My Photo",
          width: 100,
          height: 100,
        },
      ],
    };
    const md = renderStructuredMarkdown(doc);
    expect(md).toBe('![photo](/img.png "My Photo")');
  });
});

describe("renderStructuredMarkdownExport", () => {
  it("should prepend title as h1", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "body", marks: [] }],
        },
      ],
    };
    const result = renderStructuredMarkdownExport({
      title: "My Story",
      document: doc,
    });
    expect(result).toBe("# My Story\n\nbody\n");
  });

  it("should handle empty document body", () => {
    const doc: StructuredExportDocument = { blocks: [] };
    const result = renderStructuredMarkdownExport({
      title: "Empty",
      document: doc,
    });
    expect(result).toBe("# Empty\n");
  });
});

describe("buildPdfRenderPlan", () => {
  it("should start with title heading", () => {
    const doc: StructuredExportDocument = { blocks: [] };
    const plan = buildPdfRenderPlan({ title: "My Novel", document: doc });
    expect(plan[0]).toEqual({
      type: "heading",
      level: 1,
      segments: [{ text: "My Novel", marks: [] }],
    });
  });

  it("should include paragraph ops", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "content", marks: [] }],
        },
      ],
    };
    const plan = buildPdfRenderPlan({ title: "Title", document: doc });
    const paragraphs = plan.filter((op) => op.type === "paragraph");
    expect(paragraphs.length).toBeGreaterThanOrEqual(1);
  });

  it("should include horizontal-rule ops", () => {
    const doc: StructuredExportDocument = {
      blocks: [{ type: "horizontalRule" }],
    };
    const plan = buildPdfRenderPlan({ title: "Title", document: doc });
    const rules = plan.filter((op) => op.type === "horizontal-rule");
    expect(rules).toHaveLength(1);
  });

  it("should include code-block ops", () => {
    const doc: StructuredExportDocument = {
      blocks: [{ type: "codeBlock", text: "x=1", language: "python" }],
    };
    const plan = buildPdfRenderPlan({ title: "Title", document: doc });
    const codeBlocks = plan.filter((op) => op.type === "code-block");
    expect(codeBlocks).toHaveLength(1);
    if (codeBlocks[0].type === "code-block") {
      expect(codeBlocks[0].text).toBe("x=1");
    }
  });

  it("should include list-item ops for bullet list", () => {
    const doc: StructuredExportDocument = {
      blocks: [
        {
          type: "bulletList",
          items: [
            {
              blocks: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "item", marks: [] }],
                },
              ],
            },
          ],
        },
      ],
    };
    const plan = buildPdfRenderPlan({ title: "Title", document: doc });
    const listItems = plan.filter((op) => op.type === "list-item");
    expect(listItems.length).toBeGreaterThanOrEqual(1);
  });
});
