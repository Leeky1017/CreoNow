/**
 * Features - Complex UI Components
 *
 * This module exports feature-level components that compose multiple
 * primitives and patterns into complete UI features.
 *
 * Features are organized by domain:
 * - KnowledgeGraph: Entity relationship visualization
 * - AiDialogs: AI interaction and system feedback dialogs
 *
 * @example
 * ```tsx
 * import { KnowledgeGraph, AiInlineConfirm, SystemDialog } from '@/components/features';
 *
 * <KnowledgeGraph data={graphData} onNodeSelect={handleSelect} />
 * <AiInlineConfirm originalText="..." suggestedText="..." onAccept={...} onReject={...} />
 * <SystemDialog type="delete" open={isOpen} onOpenChange={setIsOpen} onPrimaryAction={...} />
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

export {
  AiInlineConfirm,
  AiDiffModal,
  DiffText,
  AiErrorCard,
  SystemDialog,
} from "./AiDialogs";

export type {
  AiErrorType,
  AiErrorConfig,
  AiInlineConfirmProps,
  DiffChange,
  AiDiffModalProps,
  AiErrorCardProps,
  SystemDialogType,
  SystemDialogProps,
} from "./AiDialogs";
