/**
 * Features - Complex UI Components
 *
 * This module exports feature-level components that compose multiple
 * primitives and patterns into complete UI features.
 *
 * Features are organized by domain:
 * - KnowledgeGraph: Entity relationship visualization
 *
 * @example
 * ```tsx
 * import { KnowledgeGraph } from '@/components/features';
 *
 * <KnowledgeGraph data={graphData} onNodeSelect={handleSelect} />
 * ```
 */

export {
  KnowledgeGraph,
  GraphNode,
  GraphEdge,
  EdgeMarkerDefs,
  GraphCanvas,
  GraphToolbar,
  GraphLegend,
  NodeDetailCard,
} from "./KnowledgeGraph";

export type {
  NodeType,
  GraphNodeData,
  GraphEdgeData,
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
} from "./KnowledgeGraph";
