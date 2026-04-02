import { Fragment, Node as ProseMirrorNode, Slice } from "prosemirror-model";
import { Transform } from "prosemirror-transform";

import { editorSchema } from "../editor/prosemirrorSchema";

export type DocumentWritebackResult =
  | { ok: true; data: { contentJson: unknown } }
  | {
      ok: false;
      error: { code: "WRITE_BACK_FAILED"; message: string; details?: unknown };
    };

function fail(message: string, details?: unknown): DocumentWritebackResult {
  return {
    ok: false,
    error: {
      code: "WRITE_BACK_FAILED",
      message,
      ...(details === undefined ? {} : { details }),
    },
  };
}

function createParagraphNodes(text: string) {
  const normalized = text.replace(/\r\n/g, "\n");
  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.replace(/^\n+|\n+$/g, ""))
    .filter((block) => block.length > 0);

  if (blocks.length === 0) {
    return [];
  }

  return blocks.map((block) =>
    editorSchema.nodes.paragraph.create(
      null,
      block.length > 0 ? editorSchema.text(block) : undefined,
    ),
  );
}

export function appendSuggestionToDocument(args: {
  contentJson: unknown;
  cursorPosition?: number;
  suggestion: string;
}): DocumentWritebackResult {
  try {
    const doc = ProseMirrorNode.fromJSON(editorSchema, args.contentJson);
    const normalizedSuggestion = args.suggestion.replace(/\r\n/g, "\n");
    const appendedNodes = createParagraphNodes(normalizedSuggestion);
    if (appendedNodes.length === 0) {
      return {
        ok: true,
        data: {
          contentJson: doc.toJSON(),
        },
      };
    }

    const tr = new Transform(doc);
    if (
      typeof args.cursorPosition === "number" &&
      Number.isSafeInteger(args.cursorPosition) &&
      args.cursorPosition >= 0
    ) {
      const insertionPoint = Math.min(args.cursorPosition, doc.content.size);
      if (appendedNodes.length === 1) {
        tr.replaceWith(
          insertionPoint,
          insertionPoint,
          editorSchema.text(normalizedSuggestion),
        );
      } else {
        tr.replace(
          insertionPoint,
          insertionPoint,
          new Slice(Fragment.fromArray(appendedNodes), 1, 1),
        );
      }
    } else {
      tr.insert(doc.content.size, Fragment.fromArray(appendedNodes));
    }

    return {
      ok: true,
      data: {
        contentJson: tr.doc.toJSON(),
      },
    };
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Failed to append AI continuation",
    );
  }
}
