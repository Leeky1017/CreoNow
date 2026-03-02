/**
 * Drag Handle extension — pure-function contract shape + TipTap Extension.
 *
 * Produces decoration descriptors for block-level nodes so that the
 * rendering layer can position a drag handle to the left of each block.
 * Read-only editors suppress all decorations.
 *
 * The TipTap Extension computes block positions on every update and stores
 * them in extension storage. CSS renders the visual drag handle via `::before`
 * pseudo-elements on `.ProseMirror > *` when contenteditable="true".
 */

import { Extension } from "@tiptap/react";

export type DragHandleDecoration = {
  /** ProseMirror position of the block node */
  blockPos: number;
  /** Node type name (paragraph, heading, etc.) */
  blockType: string;
};

/**
 * Create drag handle decorations for every provided block node.
 *
 * @returns Empty array when the editor is not editable.
 */
export function createDragHandleDecorations(args: {
  blocks: ReadonlyArray<{ type: string; pos: number }>;
  editable: boolean;
}): DragHandleDecoration[] {
  if (!args.editable) return [];
  return args.blocks.map((block) => ({
    blockPos: block.pos,
    blockType: block.type,
  }));
}

export interface DragHandleStorage {
  /** Computed block positions. Empty when read-only. */
  blockPositions: DragHandleDecoration[];
}

/**
 * Real TipTap Extension for block drag handles.
 *
 * On every editor update, computes the position and type of all top-level
 * text blocks and stores them in `editor.storage.dragHandle.blockPositions`.
 * When the editor is read-only, the storage is emptied (no handles rendered).
 *
 * Visual rendering is handled by CSS (see main.css `.drag-handle-zone`).
 */
export const DragHandleExtension = Extension.create<
  Record<string, never>,
  DragHandleStorage
>({
  name: "dragHandle",

  addStorage(): DragHandleStorage {
    return {
      blockPositions: [],
    };
  },

  onUpdate() {
    if (!this.editor.isEditable) {
      this.storage.blockPositions = [];
      return;
    }

    const blocks: DragHandleDecoration[] = [];
    this.editor.state.doc.descendants((node, pos) => {
      if (node.isBlock && node.isTextblock) {
        blocks.push({ blockPos: pos, blockType: node.type.name });
      }
    });
    this.storage.blockPositions = blocks;
  },
});
