import type { Editor } from "@tiptap/react";

import type { IpcError } from "../../../../../../packages/shared/types/ipc-generated";

export type SelectionRange = {
  from: number;
  to: number;
};

export type SelectionRef = {
  range: SelectionRange;
  selectionTextHash: string;
};

export type CaptureSelectionResult =
  | { ok: true; data: { selectionText: string; selectionRef: SelectionRef } }
  | { ok: false; error: IpcError };

export type ApplySelectionResult =
  | { ok: true; data: { applied: true } }
  | { ok: false; error: IpcError };

function ipcError(code: IpcError["code"], message: string): IpcError {
  return { code, message };
}

function hashText(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function safeTextBetween(
  editor: Editor,
  range: SelectionRange,
): { ok: true; data: string } | { ok: false; error: IpcError } {
  try {
    return {
      ok: true,
      data: editor.state.doc.textBetween(range.from, range.to, "\n"),
    };
  } catch {
    return {
      ok: false,
      error: ipcError(
        "CONFLICT",
        "Selection range is no longer valid; regenerate the diff and retry",
      ),
    };
  }
}

/**
 * Capture a selection reference (range + text hash) for conflict detection.
 *
 * Why: Apply must fail with `CONFLICT` if the target selection content has
 * changed since the diff was generated.
 */
export function captureSelectionRef(editor: Editor): CaptureSelectionResult {
  const range: SelectionRange = {
    from: editor.state.selection.from,
    to: editor.state.selection.to,
  };

  if (range.from === range.to) {
    return {
      ok: false,
      error: ipcError("INVALID_ARGUMENT", "Selection is empty"),
    };
  }
  if (range.from > range.to) {
    return {
      ok: false,
      error: ipcError("INVALID_ARGUMENT", "Invalid selection range"),
    };
  }

  const selectionTextRes = safeTextBetween(editor, range);
  if (!selectionTextRes.ok) {
    return selectionTextRes;
  }

  const selectionText = selectionTextRes.data;
  const selectionRef: SelectionRef = {
    range,
    selectionTextHash: hashText(selectionText),
  };
  return { ok: true, data: { selectionText, selectionRef } };
}

/**
 * Apply a selection replacement with conflict detection.
 *
 * Why: the editor SSOT must not be silently overwritten when the user edits the
 * document after the diff was generated.
 */
export function applySelection(args: {
  editor: Editor;
  selectionRef: SelectionRef;
  replacementText: string;
}): ApplySelectionResult {
  const range = args.selectionRef.range;
  if (range.from === range.to) {
    return {
      ok: false,
      error: ipcError("INVALID_ARGUMENT", "Selection is empty"),
    };
  }

  const currentTextRes = safeTextBetween(args.editor, range);
  if (!currentTextRes.ok) {
    return currentTextRes;
  }
  const currentText = currentTextRes.data;
  const currentHash = hashText(currentText);
  if (currentHash !== args.selectionRef.selectionTextHash) {
    return {
      ok: false,
      error: ipcError(
        "CONFLICT",
        "Selection content changed; regenerate the diff and retry",
      ),
    };
  }

  try {
    const tr = args.editor.state.tr.insertText(
      args.replacementText,
      range.from,
      range.to,
    );
    args.editor.view.dispatch(tr);
  } catch {
    return {
      ok: false,
      error: ipcError("INTERNAL", "Failed to apply selection replacement"),
    };
  }
  return { ok: true, data: { applied: true } };
}
