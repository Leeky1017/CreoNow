import { describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";

import { applySelection, captureSelectionRef } from "./applySelection";

function createEditorDouble(args: { text: string; from: number; to: number }) {
  let text = args.text;
  const dispatch = vi.fn(
    (tr: { from: number; to: number; replacementText: string }) => {
      text = `${text.slice(0, tr.from)}${tr.replacementText}${text.slice(tr.to)}`;
    },
  );

  const editor = {
    state: {
      selection: {
        from: args.from,
        to: args.to,
      },
      doc: {
        textBetween: (from: number, to: number) => text.slice(from, to),
      },
      tr: {
        insertText: (replacementText: string, from: number, to: number) => ({
          replacementText,
          from,
          to,
        }),
      },
    },
    view: {
      dispatch,
    },
  } as unknown as Editor;

  return {
    editor,
    dispatch,
    setText(next: string) {
      text = next;
    },
  };
}

describe("applySelection conflict guard", () => {
  it("should return CONFLICT and keep editor content unchanged when selection text changed", () => {
    const double = createEditorDouble({
      text: "Original text for selection",
      from: 0,
      to: 8,
    });

    const captured = captureSelectionRef(double.editor);
    if (!captured.ok) {
      throw new Error("failed to capture selection in test setup");
    }

    double.setText("Changed text for selection");

    const result = applySelection({
      editor: double.editor,
      selectionRef: captured.data.selectionRef,
      replacementText: "AI output",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected CONFLICT result");
    }
    expect(result.error.code).toBe("CONFLICT");
    expect(double.dispatch).not.toHaveBeenCalled();
  });

  it("should apply replacement when selection hash still matches", () => {
    const double = createEditorDouble({
      text: "Original text for selection",
      from: 0,
      to: 8,
    });

    const captured = captureSelectionRef(double.editor);
    if (!captured.ok) {
      throw new Error("failed to capture selection in test setup");
    }

    const result = applySelection({
      editor: double.editor,
      selectionRef: captured.data.selectionRef,
      replacementText: "AI output",
    });

    expect(result).toEqual({ ok: true, data: { applied: true } });
    expect(double.dispatch).toHaveBeenCalledTimes(1);
  });
});
