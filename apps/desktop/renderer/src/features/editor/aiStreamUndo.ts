/**
 * AI Stream Undo — checkpoint helper for atomic undo of streamed AI output.
 *
 * When an AI stream writes incrementally into the editor, each chunk
 * creates a separate history entry. This module provides helpers to
 * checkpoint the pre-stream state so that a single Ctrl+Z can revert
 * the entire streamed round.
 *
 * Usage:
 *   1. Before streaming starts → buildAiStreamUndoCheckpoint(...)
 *   2. During streaming → editor transactions use `addToHistory: false`
 *   3. After streaming ends → call undoAiStream() to revert, or leave the
 *      content in place (the checkpoint ensures atomic revert is possible).
 */

export type AiStreamCheckpoint = {
  /** Editor text content before the AI stream began */
  preStreamContent: string;
  /** Full document JSON for restoration via setContent */
  docJson: Record<string, unknown>;
  /** Cursor position before the stream */
  cursorPos: number;
  /** Monotonic timestamp (Date.now()) when the checkpoint was created */
  timestamp: number;
};

/** Minimal editor interface required for undo operations */
export type UndoableEditor = {
  commands: {
    setContent: (content: Record<string, unknown>) => boolean;
    focus: (position: number) => boolean;
  };
};

/**
 * Build a checkpoint that captures the pre-stream editor state.
 *
 * This checkpoint can later be used to restore the document if the
 * user triggers undo after a stream completes.
 */
export function buildAiStreamUndoCheckpoint(args: {
  preStreamContent: string;
  docJson: Record<string, unknown>;
  cursorPos: number;
  /** Optional injection point for deterministic timestamps in tests. */
  now?: number;
}): AiStreamCheckpoint {
  return {
    preStreamContent: args.preStreamContent,
    docJson: args.docJson,
    cursorPos: args.cursorPos,
    timestamp: args.now ?? Date.now(),
  };
}

/**
 * Undo the AI stream by restoring the editor to the checkpoint state.
 * Returns true if the restore was performed, false if no checkpoint exists.
 */
export function undoAiStream(
  editor: UndoableEditor,
  checkpoint: AiStreamCheckpoint | null,
): boolean {
  if (!checkpoint) return false;
  const restored = editor.commands.setContent(checkpoint.docJson);
  if (restored) {
    editor.commands.focus(checkpoint.cursorPos);
  }
  return restored;
}
