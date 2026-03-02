/**
 * Drag Handle extension — pure-function contract shape.
 *
 * Produces decoration descriptors for block-level nodes so that the
 * rendering layer can position a drag handle to the left of each block.
 * Read-only editors suppress all decorations.
 */

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

export type DragHandleExtensionContract = {
  name: "dragHandle";
  decorations: DragHandleDecoration[];
};

/**
 * Stable extension contract shape — mirroring the inlineDiff pattern.
 * Actual TipTap Extension integration deferred to editor bootstrap.
 */
export const DragHandleExtension: DragHandleExtensionContract = {
  name: "dragHandle",
  decorations: [],
};
