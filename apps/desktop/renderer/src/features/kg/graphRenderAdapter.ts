import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { zoomIdentity } from "d3-zoom";

import type {
  CanvasTransform,
  GraphData,
} from "../../components/features/KnowledgeGraph/types";

type ForceNode = SimulationNodeDatum & {
  id: string;
  x: number;
  y: number;
};

type ForceLink = SimulationLinkDatum<ForceNode> & {
  source: string | ForceNode;
  target: string | ForceNode;
};

type ForceLayoutOptions = {
  width?: number;
  height?: number;
  iterations?: number;
};

type ZoomAroundCursorArgs = {
  current: CanvasTransform;
  pointer: { x: number; y: number };
  deltaY: number;
  minScale?: number;
  maxScale?: number;
  step?: number;
};

const DEFAULT_LAYOUT_WIDTH = 860;
const DEFAULT_LAYOUT_HEIGHT = 540;
const DEFAULT_LAYOUT_ITERATIONS = 80;

/**
 * Build force-directed positions for graph nodes.
 *
 * Why: KG2 fixes layout engine to d3-force, while keeping rendering concerns
 * outside of React UI components.
 */
export function buildForceDirectedGraph(
  data: GraphData,
  options: ForceLayoutOptions = {},
): GraphData {
  if (data.nodes.length <= 1) {
    return data;
  }

  const width = options.width ?? DEFAULT_LAYOUT_WIDTH;
  const height = options.height ?? DEFAULT_LAYOUT_HEIGHT;
  const iterations = options.iterations ?? DEFAULT_LAYOUT_ITERATIONS;

  const forceNodes: ForceNode[] = data.nodes.map((node) => ({
    id: node.id,
    x: node.position.x,
    y: node.position.y,
  }));

  const forceLinks: ForceLink[] = data.edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }));

  const simulation = forceSimulation(forceNodes)
    .force(
      "link",
      forceLink<ForceNode, ForceLink>(forceLinks)
        .id((node) => node.id)
        .distance(150)
        .strength(0.5),
    )
    .force("charge", forceManyBody().strength(-420))
    .force("collide", forceCollide<ForceNode>().radius(48).strength(0.9))
    .force("center", forceCenter(width / 2, height / 2))
    .stop();

  for (let tick = 0; tick < iterations; tick += 1) {
    simulation.tick();
  }

  const byId = new Map(
    forceNodes.map((node) => [
      node.id,
      {
        x: typeof node.x === "number" ? node.x : width / 2,
        y: typeof node.y === "number" ? node.y : height / 2,
      },
    ]),
  );

  return {
    edges: data.edges,
    nodes: data.nodes.map((node) => ({
      ...node,
      position: byId.get(node.id) ?? node.position,
    })),
  };
}

function clampScale(scale: number, minScale: number, maxScale: number): number {
  return Math.min(maxScale, Math.max(minScale, scale));
}

/**
 * Calculate the next viewport transform by zooming around the cursor.
 *
 * Why: KG2 requires zoom behavior to anchor on pointer position.
 */
export function zoomAroundCursor(args: ZoomAroundCursorArgs): CanvasTransform {
  const minScale = args.minScale ?? 0.5;
  const maxScale = args.maxScale ?? 2;
  const step = args.step ?? 0.1;
  const zoomFactor = args.deltaY < 0 ? 1 + step : 1 - step;
  const nextScale = clampScale(
    args.current.scale * zoomFactor,
    minScale,
    maxScale,
  );

  if (nextScale === args.current.scale) {
    return args.current;
  }

  const ratio = nextScale / args.current.scale;
  const nextTranslateX =
    args.pointer.x - (args.pointer.x - args.current.translateX) * ratio;
  const nextTranslateY =
    args.pointer.y - (args.pointer.y - args.current.translateY) * ratio;

  const transform = zoomIdentity
    .translate(nextTranslateX, nextTranslateY)
    .scale(nextScale);

  return {
    scale: transform.k,
    translateX: transform.x,
    translateY: transform.y,
  };
}
