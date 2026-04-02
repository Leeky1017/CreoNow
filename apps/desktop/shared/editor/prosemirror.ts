import { InputRule, inputRules, textblockTypeInputRule, wrappingInputRule } from "prosemirror-inputrules";
import {
  Fragment,
  Schema,
  type MarkType,
  type Node as ProseMirrorNode,
} from "prosemirror-model";
import {
  Plugin,
  Selection,
  type EditorState,
  type Transaction,
} from "prosemirror-state";

import { sha256Hex } from "../sha256";

export type ProseMirrorJson = ReturnType<ProseMirrorNode["toJSON"]>;

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
      parseDOM: [1, 2, 3, 4, 5, 6].map((level) => ({
        tag: `h${level}`,
        attrs: { level },
      })),
      toDOM(node: ProseMirrorNode) {
        return [`h${String(node.attrs.level)}`, 0];
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
      parseDOM: [
        {
          tag: "ol",
          getAttrs(dom: HTMLElement) {
            return { order: dom.hasAttribute("start") ? Number(dom.getAttribute("start")) : 1 };
          },
        },
      ],
      toDOM(node: ProseMirrorNode) {
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
      parseDOM: [{ tag: "strong" }, { tag: "b" }, { style: "font-weight=bold" }],
      toDOM() {
        return ["strong", 0];
      },
    },
    italic: {
      parseDOM: [{ tag: "em" }, { tag: "i" }, { style: "font-style=italic" }],
      toDOM() {
        return ["em", 0];
      },
    },
    underline: {
      parseDOM: [{ tag: "u" }, { style: "text-decoration=underline" }],
      toDOM() {
        return ["u", 0];
      },
    },
    strikethrough: {
      parseDOM: [{ tag: "s" }, { tag: "del" }, { style: "text-decoration=line-through" }],
      toDOM() {
        return ["s", 0];
      },
    },
    code: {
      excludes: "_",
      parseDOM: [{ tag: "code" }],
      toDOM() {
        return ["code", 0];
      },
    },
  },
});

export interface SelectionRef {
  from: number;
  to: number;
  text: string;
  selectionTextHash: string;
}

export function computeSelectionTextHash(text: string): string {
  return sha256Hex(text);
}

export function createSelectionRef(params: {
  from: number;
  to: number;
  text: string;
}): SelectionRef | null {
  if (params.from === params.to && params.text === "") {
    return null;
  }

  return {
    from: params.from,
    to: params.to,
    text: params.text,
    selectionTextHash: computeSelectionTextHash(params.text),
  };
}

export function verifySelectionHash(ref: SelectionRef, currentText: string): boolean {
  return ref.selectionTextHash === computeSelectionTextHash(currentText);
}

export interface InputRuleDescriptor {
  name: string;
  pattern: RegExp;
}

const inputRuleDescriptors: readonly InputRuleDescriptor[] = [
  {
    name: "bold",
    pattern: /(^|[\s(])\*\*([^*]+)\*\*$/,
  },
  {
    name: "italic",
    pattern: /(^|[\s(])\*([^*]+)\*$/,
  },
  {
    name: "heading",
    pattern: /^(#{1,6})\s$/,
  },
  {
    name: "code",
    pattern: /(^|[\s(])`([^`]+)`$/,
  },
  {
    name: "blockquote",
    pattern: /^>\s$/,
  },
  {
    name: "bullet_list",
    pattern: /^[-*]\s$/,
  },
  {
    name: "ordered_list",
    pattern: /^(\d+)\.\s$/,
  },
  {
    name: "horizontal_rule",
    pattern: /^---$/,
  },
  {
    name: "code_block",
    pattern: /^```$/,
  },
] as const;

function createDelimitedMarkInputRule(
  pattern: RegExp,
  markType: MarkType,
): InputRule {
  return new InputRule(
    pattern,
    (state: EditorState, match: RegExpMatchArray, start: number, end: number): Transaction => {
      const [, prefix = "", text = ""] = match;
      const tr = state.tr;
      const replacement = `${prefix}${text}`;
      const markFrom = start + prefix.length;
      const markTo = markFrom + text.length;

      tr.insertText(replacement, start, end);
      tr.addMark(markFrom, markTo, markType.create());
      tr.removeStoredMark(markType);

      return tr;
    },
  );
}

function createEnterTriggeredBlockTransform(args: {
  schema: Schema;
  state: EditorState;
  marker: string;
}): Transaction | null {
  const { schema, state, marker } = args;
  const { selection } = state;
  if (selection.empty === false) {
    return null;
  }

  const { $from } = selection;
  const parent = $from.parent;
  if (parent.type !== schema.nodes.paragraph) {
    return null;
  }

  const lineText = parent.textContent;
  if (lineText !== marker || $from.parentOffset !== parent.content.size) {
    return null;
  }

  const blockFrom = $from.before();
  const blockTo = $from.after();

  if (marker === "---") {
    const horizontalRule = schema.nodes.horizontal_rule.create();
    const paragraph = schema.nodes.paragraph.create();
    const tr = state.tr.replaceWith(
      blockFrom,
      blockTo,
      Fragment.fromArray([horizontalRule, paragraph]),
    );
    return tr
      .setSelection(
        Selection.near(tr.doc.resolve(blockFrom + horizontalRule.nodeSize), 1),
      )
      .scrollIntoView();
  }

  if (marker === "```") {
    const codeBlock = schema.nodes.code_block.create();
    const tr = state.tr.replaceWith(blockFrom, blockTo, codeBlock);
    return tr
      .setSelection(Selection.near(tr.doc.resolve(blockFrom + 1), 1))
      .scrollIntoView();
  }

  return null;
}

function buildEnterTriggeredMarkdownPlugin(schema: Schema): Plugin {
  return new Plugin({
    props: {
      handleKeyDown(view, event) {
        if (event.key !== "Enter") {
          return false;
        }

        const tr =
          createEnterTriggeredBlockTransform({
            schema,
            state: view.state,
            marker: "---",
          }) ??
          createEnterTriggeredBlockTransform({
            schema,
            state: view.state,
            marker: "```",
          });

        if (tr === null) {
          return false;
        }

        event.preventDefault();
        view.dispatch(tr);
        return true;
      },
    },
  });
}

export function createEditorInputRules(schema: Schema = editorSchema): InputRule[] {
  return [
    createDelimitedMarkInputRule(inputRuleDescriptors[0].pattern, schema.marks.bold),
    createDelimitedMarkInputRule(inputRuleDescriptors[1].pattern, schema.marks.italic),
    createDelimitedMarkInputRule(inputRuleDescriptors[3].pattern, schema.marks.code),
    textblockTypeInputRule(inputRuleDescriptors[2].pattern, schema.nodes.heading, (match: RegExpMatchArray) => ({
      level: match[1].length,
    })),
    wrappingInputRule(inputRuleDescriptors[4].pattern, schema.nodes.blockquote),
    wrappingInputRule(inputRuleDescriptors[5].pattern, schema.nodes.bullet_list),
    wrappingInputRule(inputRuleDescriptors[6].pattern, schema.nodes.ordered_list, (match: RegExpMatchArray) => ({
      order: Number(match[1]),
    })),
  ];
}

export function createEditorInputRulesPlugin(schema: Schema = editorSchema): Plugin {
  return inputRules({
    rules: createEditorInputRules(schema),
  });
}

export function createEnterTriggeredMarkdownPlugin(
  schema: Schema = editorSchema,
): Plugin {
  return buildEnterTriggeredMarkdownPlugin(schema);
}

export function getInputRules(): InputRuleDescriptor[] {
  return inputRuleDescriptors.map((descriptor) => ({
    name: descriptor.name,
    pattern: descriptor.pattern,
  }));
}

export function createEmptyDoc(): ProseMirrorNode {
  return editorSchema.node("doc", null, [editorSchema.node("paragraph")]);
}

export function docFromJson(json: unknown): ProseMirrorNode {
  if (json === null || json === undefined) {
    return createEmptyDoc();
  }

  return editorSchema.nodeFromJSON(json as Parameters<typeof editorSchema.nodeFromJSON>[0]);
}
