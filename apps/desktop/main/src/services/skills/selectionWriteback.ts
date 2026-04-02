import { Node as ProseMirrorNode } from "prosemirror-model";
import { Transform } from "prosemirror-transform";

import { editorSchema, verifySelectionHash } from "../editor/prosemirrorSchema";

type SelectionRef = {
  from: number;
  to: number;
  text: string;
  selectionTextHash: string;
};

export type SelectionWritebackResult =
  | { ok: true; data: { contentJson: unknown } }
  | {
      ok: false;
      error: { code: "WRITE_BACK_FAILED"; message: string; details?: unknown };
    };

function fail(
  message: string,
  details?: unknown,
): SelectionWritebackResult {
  return {
    ok: false,
    error: {
      code: "WRITE_BACK_FAILED",
      message,
      ...(details === undefined ? {} : { details }),
    },
  };
}

export function applySuggestionToSelection(args: {
  contentJson: unknown;
  selection: SelectionRef;
  suggestion: string;
}): SelectionWritebackResult {
  try {
    const doc = ProseMirrorNode.fromJSON(editorSchema, args.contentJson);
    const currentText = doc.textBetween(args.selection.from, args.selection.to, "\n", "\n");
    if (!verifySelectionHash(args.selection, currentText)) {
      return fail("Selection changed before AI writeback", {
        expectedHash: args.selection.selectionTextHash,
        currentText,
      });
    }

    const tr = new Transform(doc);
    if (args.suggestion.length > 0) {
      tr.replaceWith(
        args.selection.from,
        args.selection.to,
        editorSchema.text(args.suggestion),
      );
    } else {
      tr.delete(args.selection.from, args.selection.to);
    }

    return {
      ok: true,
      data: {
        contentJson: tr.doc.toJSON(),
      },
    };
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Failed to apply AI suggestion",
    );
  }
}
