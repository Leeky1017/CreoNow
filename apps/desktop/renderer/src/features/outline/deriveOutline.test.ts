import { describe, it, expect } from "vitest";
import type { JSONContent } from "@tiptap/react";
import {
  deriveOutline,
  findActiveOutlineItem,
  findHeadingPosition,
} from "./deriveOutline";

describe("deriveOutline", () => {
  // ==========================================================================
  // Empty/Null Document Cases
  // ==========================================================================

  it("returns empty array for null document", () => {
    expect(deriveOutline(null)).toEqual([]);
  });

  it("returns empty array for undefined document", () => {
    expect(deriveOutline(undefined)).toEqual([]);
  });

  it("returns empty array for empty document", () => {
    const doc: JSONContent = { type: "doc", content: [] };
    expect(deriveOutline(doc)).toEqual([]);
  });

  it("returns empty array for document without content property", () => {
    const doc = { type: "doc" } as JSONContent;
    expect(deriveOutline(doc)).toEqual([]);
  });

  it("returns empty array for document with no headings", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello world" }] },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Another paragraph" }],
        },
      ],
    };
    expect(deriveOutline(doc)).toEqual([]);
  });

  // ==========================================================================
  // Basic Heading Extraction
  // ==========================================================================

  it("extracts single H1 heading", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "My Title" }],
        },
      ],
    };

    const result = deriveOutline(doc);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("My Title");
    expect(result[0].level).toBe("h1");
    expect(result[0].id).toBeDefined();
  });

  it("extracts H2 and H3 headings", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Section" }],
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Subsection" }],
        },
      ],
    };

    const result = deriveOutline(doc);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Section");
    expect(result[0].level).toBe("h2");
    expect(result[1].title).toBe("Subsection");
    expect(result[1].level).toBe("h3");
  });

  it("extracts multi-level headings in correct order", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Document Title" }],
        },
        { type: "paragraph", content: [{ type: "text", text: "Intro text" }] },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Chapter 1" }],
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Section 1.1" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Chapter 2" }],
        },
      ],
    };

    const result = deriveOutline(doc);

    expect(result).toHaveLength(4);
    expect(result[0]).toMatchObject({ title: "Document Title", level: "h1" });
    expect(result[1]).toMatchObject({ title: "Chapter 1", level: "h2" });
    expect(result[2]).toMatchObject({ title: "Section 1.1", level: "h3" });
    expect(result[3]).toMatchObject({ title: "Chapter 2", level: "h2" });
  });

  // ==========================================================================
  // H4-H6 Exclusion
  // ==========================================================================

  it("ignores H4 headings", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 4 },
          content: [{ type: "text", text: "H4 Heading" }],
        },
      ],
    };

    expect(deriveOutline(doc)).toEqual([]);
  });

  it("ignores H5 and H6 headings", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 5 },
          content: [{ type: "text", text: "H5 Heading" }],
        },
        {
          type: "heading",
          attrs: { level: 6 },
          content: [{ type: "text", text: "H6 Heading" }],
        },
      ],
    };

    expect(deriveOutline(doc)).toEqual([]);
  });

  it("extracts H1-H3 but ignores H4-H6", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
        {
          type: "heading",
          attrs: { level: 4 },
          content: [{ type: "text", text: "Detail" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Section" }],
        },
      ],
    };

    const result = deriveOutline(doc);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Title");
    expect(result[1].title).toBe("Section");
  });

  // ==========================================================================
  // Edge Cases: Empty/Malformed Headings
  // ==========================================================================

  it("handles heading with empty content", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [],
        },
      ],
    };

    const result = deriveOutline(doc);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("(untitled heading)");
  });

  it("handles heading with no content property", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
        },
      ],
    };

    const result = deriveOutline(doc);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("(untitled heading)");
  });

  it("handles heading with whitespace-only text", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "   " }],
        },
      ],
    };

    const result = deriveOutline(doc);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("(untitled heading)");
  });

  it("handles heading without level attribute (defaults to h1)", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          content: [{ type: "text", text: "No Level" }],
        },
      ],
    };

    const result = deriveOutline(doc);

    expect(result).toHaveLength(1);
    expect(result[0].level).toBe("h1");
  });

  // ==========================================================================
  // Special Characters
  // ==========================================================================

  it("handles headings with emoji", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "🚀 Getting Started" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "📖 Chapter 1 📚" }],
        },
      ],
    };

    const result = deriveOutline(doc);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("🚀 Getting Started");
    expect(result[1].title).toBe("📖 Chapter 1 📚");
  });

  it("handles headings with Chinese characters", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "第一章：序言" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "背景介绍" }],
        },
      ],
    };

    const result = deriveOutline(doc);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("第一章：序言");
    expect(result[1].title).toBe("背景介绍");
  });

  it("handles headings with special characters", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "C++ & JavaScript: A Comparison" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: 'Using "quotes" & <brackets>' }],
        },
      ],
    };

    const result = deriveOutline(doc);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("C++ & JavaScript: A Comparison");
    expect(result[1].title).toBe('Using "quotes" & <brackets>');
  });

  // ==========================================================================
  // Long Titles
  // ==========================================================================

  it("handles very long titles without truncation", () => {
    const longTitle = "A".repeat(500);
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: longTitle }],
        },
      ],
    };

    const result = deriveOutline(doc);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe(longTitle);
  });

  // ==========================================================================
  // Duplicate Titles - Unique IDs
  // ==========================================================================

  it("generates unique IDs for duplicate titles", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Introduction" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Introduction" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Introduction" }],
        },
      ],
    };

    const result = deriveOutline(doc);

    expect(result).toHaveLength(3);
    // All titles are the same
    expect(result[0].title).toBe("Introduction");
    expect(result[1].title).toBe("Introduction");
    expect(result[2].title).toBe("Introduction");
    // But IDs must be unique (they include position)
    const ids = new Set(result.map((item) => item.id));
    expect(ids.size).toBe(3);
  });

  // ==========================================================================
  // ID Stability
  // ==========================================================================

  it("generates stable IDs for the same content", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "My Title" }],
        },
      ],
    };

    const result1 = deriveOutline(doc);
    const result2 = deriveOutline(doc);

    expect(result1[0].id).toBe(result2[0].id);
  });

  // ==========================================================================
  // Complex Content within Headings
  // ==========================================================================

  it("concatenates multiple text nodes in a heading", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [
            { type: "text", text: "Part " },
            { type: "text", text: "One" },
            { type: "text", text: ": Introduction" },
          ],
        },
      ],
    };

    const result = deriveOutline(doc);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Part One: Introduction");
  });

  it("ignores non-text nodes in heading content", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [
            { type: "text", text: "Title with " },
            { type: "hardBreak" }, // Non-text node
            { type: "text", text: "break" },
          ],
        },
      ],
    };

    const result = deriveOutline(doc);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Title with break");
  });
});

describe("findActiveOutlineItem", () => {
  it("returns null for empty document", () => {
    expect(findActiveOutlineItem(null, 0)).toBeNull();
    expect(findActiveOutlineItem({ type: "doc", content: [] }, 0)).toBeNull();
  });

  it("returns null for negative cursor position", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
      ],
    };

    expect(findActiveOutlineItem(doc, -1)).toBeNull();
  });

  it("returns null for document without headings", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Just text" }] },
      ],
    };

    expect(findActiveOutlineItem(doc, 0)).toBeNull();
  });

  it("returns first heading ID when cursor is at start", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
        { type: "paragraph", content: [{ type: "text", text: "Text" }] },
      ],
    };

    const items = deriveOutline(doc);
    const activeId = findActiveOutlineItem(doc, 0);

    expect(activeId).toBe(items[0].id);
  });
});

describe("findHeadingPosition", () => {
  it("returns null for empty document", () => {
    expect(findHeadingPosition(null, [], "test-id")).toBeNull();
  });

  it("returns null for non-existent item ID", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
      ],
    };
    const items = deriveOutline(doc);

    expect(findHeadingPosition(doc, items, "non-existent-id")).toBeNull();
  });

  it("returns position for first heading", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
      ],
    };
    const items = deriveOutline(doc);
    const position = findHeadingPosition(doc, items, items[0].id);

    expect(position).toBe(0);
  });

  it("returns position for second heading", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
        { type: "paragraph", content: [{ type: "text", text: "Text" }] },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Section" }],
        },
      ],
    };
    const items = deriveOutline(doc);
    const position = findHeadingPosition(doc, items, items[1].id);

    // Position should be after first heading + paragraph
    expect(position).not.toBeNull();
    expect(position).toBeGreaterThan(0);
  });
});
