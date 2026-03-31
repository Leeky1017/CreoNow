/**
 * ProseMirror Schema — CreoNow 编辑器 Schema 定义
 *
 * 节点：doc, paragraph, heading, code_block, blockquote, horizontal_rule,
 *      bullet_list, ordered_list, list_item, text
 * Mark：bold, italic, underline, strikethrough, code
 */

import { Schema } from "prosemirror-model";
import { createHash } from "crypto";

export const editorSchema = new Schema({
  nodes: {
    doc: {
      content: "block+",
    },
    paragraph: {
      group: "block",
      content: "inline*",
      parseDOM: [{ tag: "p" }],
      toDOM() {
        return ["p", 0];
      },
    },
    heading: {
      group: "block",
      content: "inline*",
      attrs: { level: { default: 1 } },
      parseDOM: [
        { tag: "h1", attrs: { level: 1 } },
        { tag: "h2", attrs: { level: 2 } },
        { tag: "h3", attrs: { level: 3 } },
        { tag: "h4", attrs: { level: 4 } },
        { tag: "h5", attrs: { level: 5 } },
        { tag: "h6", attrs: { level: 6 } },
      ],
      toDOM(node) {
        return [`h${node.attrs.level}`, 0];
      },
    },
    code_block: {
      group: "block",
      content: "text*",
      marks: "",
      code: true,
      parseDOM: [{ tag: "pre", preserveWhitespace: "full" as const }],
      toDOM() {
        return ["pre", ["code", 0]];
      },
    },
    blockquote: {
      group: "block",
      content: "block+",
      parseDOM: [{ tag: "blockquote" }],
      toDOM() {
        return ["blockquote", 0];
      },
    },
    horizontal_rule: {
      group: "block",
      parseDOM: [{ tag: "hr" }],
      toDOM() {
        return ["hr"];
      },
    },
    bullet_list: {
      group: "block",
      content: "list_item+",
      parseDOM: [{ tag: "ul" }],
      toDOM() {
        return ["ul", 0];
      },
    },
    ordered_list: {
      group: "block",
      content: "list_item+",
      attrs: { order: { default: 1 } },
      parseDOM: [{
        tag: "ol",
        getAttrs(dom: HTMLElement) {
          return { order: dom.hasAttribute("start") ? +dom.getAttribute("start")! : 1 };
        },
      }],
      toDOM(node) {
        return node.attrs.order === 1 ? ["ol", 0] : ["ol", { start: node.attrs.order }, 0];
      },
    },
    list_item: {
      content: "paragraph block*",
      parseDOM: [{ tag: "li" }],
      toDOM() {
        return ["li", 0];
      },
    },
    text: {
      group: "inline",
    },
  },
  marks: {
    bold: {
      parseDOM: [
        { tag: "strong" },
        { tag: "b" },
        { style: "font-weight=bold" },
      ],
      toDOM() {
        return ["strong", 0];
      },
    },
    italic: {
      parseDOM: [
        { tag: "em" },
        { tag: "i" },
        { style: "font-style=italic" },
      ],
      toDOM() {
        return ["em", 0];
      },
    },
    underline: {
      parseDOM: [
        { tag: "u" },
        { style: "text-decoration=underline" },
      ],
      toDOM() {
        return ["u", 0];
      },
    },
    strikethrough: {
      parseDOM: [
        { tag: "s" },
        { tag: "del" },
        { style: "text-decoration=line-through" },
      ],
      toDOM() {
        return ["s", 0];
      },
    },
    code: {
      parseDOM: [{ tag: "code" }],
      toDOM() {
        return ["code", 0];
      },
    },
  },
});

// ── Selection Ref ──────────────────────────────────────────────────

export interface SelectionRef {
  from: number;
  to: number;
  text: string;
  selectionTextHash: string;
}

export function computeSelectionTextHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function createSelectionRef(params: {
  from: number;
  to: number;
  text: string;
}): SelectionRef | null {
  if (params.from === params.to && params.text === "") return null;

  return {
    from: params.from,
    to: params.to,
    text: params.text,
    selectionTextHash: computeSelectionTextHash(params.text),
  };
}

export function verifySelectionHash(
  ref: SelectionRef,
  currentText: string,
): boolean {
  return ref.selectionTextHash === computeSelectionTextHash(currentText);
}

// ── Input Rules ────────────────────────────────────────────────────

export interface InputRuleDescriptor {
  name: string;
  pattern: RegExp;
}

export function getInputRules(): InputRuleDescriptor[] {
  return [
    {
      name: "bold",
      pattern: /\*\*([^*]+)\*\*/,
    },
    {
      name: "italic",
      pattern: /\*([^*]+)\*/,
    },
    {
      name: "heading",
      pattern: /^(#{1,6})\s/,
    },
    {
      name: "code",
      pattern: /`([^`]+)`/,
    },
    {
      name: "blockquote",
      pattern: /^>\s/,
    },
    {
      name: "bullet_list",
      pattern: /^[-*]\s/,
    },
    {
      name: "ordered_list",
      pattern: /^\d+\.\s/,
    },
    {
      name: "horizontal_rule",
      pattern: /^---$/,
    },
    {
      name: "code_block",
      pattern: /^```/,
    },
  ];
}
