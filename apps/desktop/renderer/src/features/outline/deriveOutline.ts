import type { JSONContent } from "@tiptap/react";
import type { OutlineItem, OutlineLevel } from "./OutlinePanel";

/**
 * Represents a heading node from the ProseMirror document.
 */
interface HeadingNode {
  type: "heading";
  attrs?: { level?: number };
  content?: Array<{ type: string; text?: string }>;
}

/**
 * Map heading level number (1-6) to OutlineLevel type.
 * We only support H1-H3 for outline display.
 */
function mapLevelToOutlineLevel(level: number): OutlineLevel | null {
  switch (level) {
    case 1:
      return "h1";
    case 2:
      return "h2";
    case 3:
      return "h3";
    default:
      // H4-H6 are not displayed in outline
      return null;
  }
}

/**
 * Extract text content from a heading node.
 * Handles nested text nodes and concatenates them.
 */
function extractHeadingText(node: HeadingNode): string {
  if (!node.content || node.content.length === 0) {
    return "(untitled heading)";
  }

  const text = node.content
    .filter((child) => child.type === "text" && child.text)
    .map((child) => child.text)
    .join("");

  return text.trim() || "(untitled heading)";
}

/**
 * Generate a stable unique ID for a heading.
 *
 * Uses a combination of:
 * - Heading level
 * - Position (index) in the document
 * - Hash of the title text (for stability when content changes)
 *
 * This ensures IDs don't change on re-render unless the heading itself changes.
 */
function generateHeadingId(
  level: OutlineLevel,
  position: number,
  title: string,
): string {
  // Simple hash for title to help with stability
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    const char = title.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hashStr = Math.abs(hash).toString(36).slice(0, 6);

  return `${level}-${position}-${hashStr}`;
}

/**
 * Derive outline items from a ProseMirror/TipTap document.
 *
 * Extracts all H1-H3 headings from the document and returns them as
 * a flat array of OutlineItem objects suitable for the OutlinePanel.
 *
 * Features:
 * - Stable IDs that don't change on re-render (unless content changes)
 * - Position tracking for scroll-to-heading navigation
 * - Graceful handling of empty/malformed headings
 * - Support for emoji and non-ASCII characters
 *
 * @param doc - The TipTap/ProseMirror document JSON
 * @returns Array of outline items, empty if no headings found
 */
export function deriveOutline(
  doc: JSONContent | null | undefined,
): OutlineItem[] {
  if (!doc || !doc.content || !Array.isArray(doc.content)) {
    return [];
  }

  const items: OutlineItem[] = [];
  let headingIndex = 0;

  for (let i = 0; i < doc.content.length; i++) {
    const node = doc.content[i];

    if (node.type !== "heading") {
      continue;
    }

    const headingNode = node as unknown as HeadingNode;
    const level = headingNode.attrs?.level ?? 1;
    const outlineLevel = mapLevelToOutlineLevel(level);

    // Skip H4-H6
    if (!outlineLevel) {
      continue;
    }

    const title = extractHeadingText(headingNode);
    const id = generateHeadingId(outlineLevel, headingIndex, title);

    items.push({
      id,
      title,
      level: outlineLevel,
    });

    headingIndex++;
  }

  return items;
}

/**
 * Find the outline item that should be active based on the current
 * cursor position in the editor.
 *
 * Returns the ID of the heading that the cursor is currently under
 * (i.e., the most recent heading before the cursor position).
 *
 * @param doc - The TipTap/ProseMirror document JSON
 * @param cursorPos - The current cursor position in the document
 * @returns The ID of the active outline item, or null if none
 */
export function findActiveOutlineItem(
  doc: JSONContent | null | undefined,
  cursorPos: number,
): string | null {
  if (!doc || !doc.content || !Array.isArray(doc.content) || cursorPos < 0) {
    return null;
  }

  const items = deriveOutline(doc);
  if (items.length === 0) {
    return null;
  }

  // Calculate cumulative positions for each node
  let currentPos = 0;
  let headingIndex = 0;
  let lastHeadingId: string | null = null;

  for (const node of doc.content) {
    if (node.type === "heading") {
      const headingNode = node as unknown as HeadingNode;
      const level = headingNode.attrs?.level ?? 1;
      const outlineLevel = mapLevelToOutlineLevel(level);

      if (outlineLevel && headingIndex < items.length) {
        // If cursor is at or after this heading, update lastHeadingId
        if (cursorPos >= currentPos) {
          lastHeadingId = items[headingIndex].id;
        }
        headingIndex++;
      }
    }

    // Estimate node size (simplified - actual ProseMirror uses nodeSize)
    // Add 2 for the node boundaries
    const nodeSize = estimateNodeSize(node);
    currentPos += nodeSize;
  }

  return lastHeadingId;
}

/**
 * Estimate the size of a node for position calculation.
 * This is a simplified version - actual ProseMirror tracks this precisely.
 */
function estimateNodeSize(node: JSONContent): number {
  if (!node.content || !Array.isArray(node.content)) {
    // Empty node (like empty paragraph)
    return 2; // Opening and closing boundaries
  }

  let size = 2; // Opening and closing boundaries
  for (const child of node.content) {
    if (child.type === "text" && child.text) {
      size += child.text.length;
    } else {
      size += estimateNodeSize(child);
    }
  }

  return size;
}

/**
 * Find the document position of a heading by its outline item ID.
 *
 * Used for scroll-to-heading navigation.
 *
 * @param doc - The TipTap/ProseMirror document JSON
 * @param outlineItems - The derived outline items
 * @param itemId - The ID of the outline item to find
 * @returns The document position of the heading, or null if not found
 */
export function findHeadingPosition(
  doc: JSONContent | null | undefined,
  outlineItems: OutlineItem[],
  itemId: string,
): number | null {
  if (!doc || !doc.content || !Array.isArray(doc.content)) {
    return null;
  }

  const targetIndex = outlineItems.findIndex((item) => item.id === itemId);
  if (targetIndex === -1) {
    return null;
  }

  let currentPos = 0;
  let headingIndex = 0;

  for (const node of doc.content) {
    if (node.type === "heading") {
      const headingNode = node as unknown as HeadingNode;
      const level = headingNode.attrs?.level ?? 1;
      const outlineLevel = mapLevelToOutlineLevel(level);

      if (outlineLevel) {
        if (headingIndex === targetIndex) {
          return currentPos;
        }
        headingIndex++;
      }
    }

    currentPos += estimateNodeSize(node);
  }

  return null;
}
