/**
 * KnowledgeGraph Component
 *
 * A knowledge graph visualization component for displaying and managing
 * relationships between entities (characters, locations, events, items).
 *
 * Features:
 * - Multiple node types with distinct shapes and colors (design tokens)
 * - Directed edges with labels
 * - Node dragging for layout adjustment
 * - Canvas panning and zooming
 * - Filtering by node type
 * - Node selection with detail card
 *
 * @example
 * ```tsx
 * import { KnowledgeGraph } from '@/components/features/KnowledgeGraph';
 *
 * <KnowledgeGraph
 *   data={{
 *     nodes: [
 *       { id: "1", label: "Elara", type: "character", position: { x: 300, y: 200 } },
 *       { id: "2", label: "Shadow Keep", type: "location", position: { x: 500, y: 100 } },
 *     ],
 *     edges: [
 *       { id: "e1", source: "1", target: "2", label: "Travels to" },
 *     ],
 *   }}
 *   onNodeSelect={(id) => console.log("Selected:", id)}
 * />
 * ```
 */

export { KnowledgeGraph } from "./KnowledgeGraph";
export { GraphNode } from "./GraphNode";
export { GraphEdge, EdgeMarkerDefs } from "./GraphEdge";
export { GraphCanvas } from "./GraphCanvas";
export { GraphToolbar } from "./GraphToolbar";
export { GraphLegend } from "./GraphLegend";
export { NodeDetailCard } from "./NodeDetailCard";
export { NodeEditDialog } from "./NodeEditDialog";

export type {
  NodeType,
  GraphNode as GraphNodeData,
  GraphEdge as GraphEdgeData,
  GraphData,
  NodeFilter,
  CanvasTransform,
  KnowledgeGraphProps,
  GraphNodeProps,
  GraphEdgeProps,
  NodeDetailCardProps,
  GraphToolbarProps,
  GraphLegendProps,
  GraphCanvasProps,
  NodeEditDialogProps,
} from "./types";
