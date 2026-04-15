import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

export type KnowledgeGraphNodeType =
  | "character"
  | "location"
  | "event"
  | "item"
  | "faction"
  | "other";

export interface KnowledgeGraphNode {
  attributes?: Record<string, string>;
  description?: string;
  id: string;
  name: string;
  type: KnowledgeGraphNodeType;
}

export interface KnowledgeGraphEdge {
  id: string;
  label: string;
  sourceId: string;
  targetId: string;
}

interface KnowledgeGraphCanvasProps {
  edges: KnowledgeGraphEdge[];
  height?: number;
  nodeColorMap?: Partial<Record<KnowledgeGraphNodeType, string>>;
  nodes: KnowledgeGraphNode[];
  onNodeSelect?: (nodeId: string | null) => void;
  selectedNodeId: string | null;
  width?: number;
}

interface LayoutNode extends KnowledgeGraphNode {
  vx: number;
  vy: number;
  x: number;
  y: number;
}

interface ViewportState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

type InteractionState =
  | null
  | {
      kind: "pan";
      startClientX: number;
      startClientY: number;
      startOffsetX: number;
      startOffsetY: number;
    }
  | {
      kind: "drag";
      nodeId: string;
    };

const DEFAULT_NODE_COLORS: Record<KnowledgeGraphNodeType, string> = {
  character: "var(--color-node-character, #3f72c8)",
  event: "var(--color-node-event, #ca8a04)",
  faction: "var(--color-node-faction, #6d28d9)",
  item: "var(--color-node-item, #0d9488)",
  location: "var(--color-node-location, #b45309)",
  other: "var(--color-node-other, #4b5563)",
};

const MIN_SCALE = 0.45;
const MAX_SCALE = 2.4;

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function createInitialLayoutNodes(
  nodes: KnowledgeGraphNode[],
  width: number,
  height: number,
  persistedPositions: Map<string, Pick<LayoutNode, "x" | "y">>,
): LayoutNode[] {
  const radius = Math.max(60, Math.min(width, height) * 0.24);
  const angleStep = nodes.length > 0 ? (Math.PI * 2) / nodes.length : 0;
  return nodes.map((node, index) => {
    const cached = persistedPositions.get(node.id);
    if (cached !== undefined) {
      return {
        ...node,
        vx: 0,
        vy: 0,
        x: cached.x,
        y: cached.y,
      };
    }

    const angle = angleStep * index;
    return {
      ...node,
      vx: 0,
      vy: 0,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });
}

function runForceLayout(nodes: LayoutNode[], edges: KnowledgeGraphEdge[]): LayoutNode[] {
  if (nodes.length <= 1) {
    return nodes;
  }

  const nextNodes = nodes.map((node) => ({ ...node }));
  const nodeIndexById = new Map<string, number>();
  nextNodes.forEach((node, index) => {
    nodeIndexById.set(node.id, index);
  });

  const repulsionStrength = 2200;
  const springLength = 125;
  const springStrength = 0.0065;
  const centeringStrength = 0.006;
  const damping = 0.86;
  const timeStep = 0.9;
  const iterations = 120;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let i = 0; i < nextNodes.length; i += 1) {
      const nodeA = nextNodes[i];
      for (let j = i + 1; j < nextNodes.length; j += 1) {
        const nodeB = nextNodes[j];
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distanceSquared = dx * dx + dy * dy;
        const safeDistance = Math.sqrt(Math.max(distanceSquared, 0.01));
        const forceMagnitude = repulsionStrength / Math.max(distanceSquared, 1);
        const fx = (dx / safeDistance) * forceMagnitude;
        const fy = (dy / safeDistance) * forceMagnitude;

        nodeA.vx -= fx;
        nodeA.vy -= fy;
        nodeB.vx += fx;
        nodeB.vy += fy;
      }
    }

    for (const edge of edges) {
      const sourceIndex = nodeIndexById.get(edge.sourceId);
      const targetIndex = nodeIndexById.get(edge.targetId);
      if (sourceIndex === undefined || targetIndex === undefined) {
        continue;
      }

      const source = nextNodes[sourceIndex];
      const target = nextNodes[targetIndex];
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const safeDistance = Math.sqrt(Math.max(dx * dx + dy * dy, 0.01));
      const extension = safeDistance - springLength;
      const forceMagnitude = extension * springStrength;
      const fx = (dx / safeDistance) * forceMagnitude;
      const fy = (dy / safeDistance) * forceMagnitude;

      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }

    for (const node of nextNodes) {
      node.vx += -node.x * centeringStrength;
      node.vy += -node.y * centeringStrength;
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx * timeStep;
      node.y += node.vy * timeStep;
    }
  }

  return nextNodes;
}

export function KnowledgeGraphCanvas(props: KnowledgeGraphCanvasProps) {
  const width = props.width ?? 720;
  const height = props.height ?? 420;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);
  const [viewport, setViewport] = useState<ViewportState>(() => ({
    offsetX: width / 2,
    offsetY: height / 2,
    scale: 1,
  }));
  const [interaction, setInteraction] = useState<InteractionState>(null);

  const nodeColors = useMemo(
    () => ({
      ...DEFAULT_NODE_COLORS,
      ...props.nodeColorMap,
    }),
    [props.nodeColorMap],
  );

  useEffect(() => {
    const persistedPositions = new Map(
      layoutNodes.map((node) => [
        node.id,
        {
          x: node.x,
          y: node.y,
        },
      ]),
    );
    const seededNodes = createInitialLayoutNodes(props.nodes, width, height, persistedPositions);
    setLayoutNodes(runForceLayout(seededNodes, props.edges));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.nodes, props.edges, width, height]);

  const toSvgCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect === undefined || rect.width === 0 || rect.height === 0) {
        return {
          x: clientX,
          y: clientY,
        };
      }
      return {
        x: ((clientX - rect.left) / rect.width) * width,
        y: ((clientY - rect.top) / rect.height) * height,
      };
    },
    [height, width],
  );

  const toWorldCoordinates = useCallback(
    (x: number, y: number) => ({
      x: (x - viewport.offsetX) / viewport.scale,
      y: (y - viewport.offsetY) / viewport.scale,
    }),
    [viewport.offsetX, viewport.offsetY, viewport.scale],
  );

  useEffect(() => {
    if (interaction === null) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (interaction.kind === "pan") {
        setViewport((currentViewport) => ({
          ...currentViewport,
          offsetX: interaction.startOffsetX + (event.clientX - interaction.startClientX),
          offsetY: interaction.startOffsetY + (event.clientY - interaction.startClientY),
        }));
        return;
      }

      const svgPoint = toSvgCoordinates(event.clientX, event.clientY);
      const worldPoint = toWorldCoordinates(svgPoint.x, svgPoint.y);
      setLayoutNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === interaction.nodeId
            ? {
                ...node,
                vx: 0,
                vy: 0,
                x: worldPoint.x,
                y: worldPoint.y,
              }
            : node,
        ),
      );
    };

    const handleMouseUp = () => {
      setInteraction(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [interaction, toSvgCoordinates, toWorldCoordinates]);

  const handleWheel = useCallback(
    (event: ReactWheelEvent<SVGSVGElement>) => {
      event.preventDefault();
      const svgPoint = toSvgCoordinates(event.clientX, event.clientY);
      const zoomDelta = Math.exp(-event.deltaY * 0.0016);
      setViewport((currentViewport) => {
        const nextScale = clamp(currentViewport.scale * zoomDelta, MIN_SCALE, MAX_SCALE);
        const worldX = (svgPoint.x - currentViewport.offsetX) / currentViewport.scale;
        const worldY = (svgPoint.y - currentViewport.offsetY) / currentViewport.scale;
        return {
          offsetX: svgPoint.x - worldX * nextScale,
          offsetY: svgPoint.y - worldY * nextScale,
          scale: nextScale,
        };
      });
    },
    [toSvgCoordinates],
  );

  const handleBackgroundMouseDown = useCallback(
    (event: ReactMouseEvent<SVGSVGElement>) => {
      if (event.button !== 0) {
        return;
      }
      setInteraction({
        kind: "pan",
        startClientX: event.clientX,
        startClientY: event.clientY,
        startOffsetX: viewport.offsetX,
        startOffsetY: viewport.offsetY,
      });
    },
    [viewport.offsetX, viewport.offsetY],
  );

  const handleBackgroundClick = useCallback(() => {
    props.onNodeSelect?.(null);
  }, [props.onNodeSelect]);

  const handleNodeMouseDown = useCallback(
    (event: ReactMouseEvent<SVGGElement>, nodeId: string) => {
      if (event.button !== 0) {
        return;
      }
      event.stopPropagation();
      setInteraction({ kind: "drag", nodeId });
    },
    [],
  );

  const handleNodeSelect = useCallback(
    (event: ReactMouseEvent<SVGGElement>, nodeId: string) => {
      event.stopPropagation();
      props.onNodeSelect?.(nodeId);
    },
    [props.onNodeSelect],
  );

  const degreeByNodeId = useMemo(() => {
    const degrees = new Map<string, number>();
    for (const edge of props.edges) {
      degrees.set(edge.sourceId, (degrees.get(edge.sourceId) ?? 0) + 1);
      degrees.set(edge.targetId, (degrees.get(edge.targetId) ?? 0) + 1);
    }
    return degrees;
  }, [props.edges]);

  const layoutNodeById = useMemo(() => {
    const map = new Map<string, LayoutNode>();
    layoutNodes.forEach((node) => {
      map.set(node.id, node);
    });
    return map;
  }, [layoutNodes]);

  const renderedEdges = useMemo(() => {
    const items: Array<{
      edge: KnowledgeGraphEdge;
      source: LayoutNode;
      target: LayoutNode;
    }> = [];
    for (const edge of props.edges) {
      const source = layoutNodeById.get(edge.sourceId);
      const target = layoutNodeById.get(edge.targetId);
      if (source === undefined || target === undefined) {
        continue;
      }
      items.push({ edge, source, target });
    }
    return items;
  }, [layoutNodeById, props.edges]);

  return (
    <svg
      ref={svgRef}
      aria-label="知识图谱画布"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      onClick={handleBackgroundClick}
      onMouseDown={handleBackgroundMouseDown}
      onWheel={handleWheel}
      style={{
        background: "var(--color-bg-base)",
        border: "1px solid var(--color-separator)",
        borderRadius: "var(--radius-lg)",
        cursor: interaction?.kind === "pan" ? "grabbing" : "grab",
        display: "block",
        height: "100%",
        minHeight: `${height}px`,
        width: "100%",
      }}
    >
      <g transform={`translate(${viewport.offsetX} ${viewport.offsetY}) scale(${viewport.scale})`}>
        {renderedEdges.map(({ edge, source, target }) => {
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          return (
            <g key={edge.id} pointerEvents="none">
              <line
                stroke="var(--color-fg-subtle)"
                strokeWidth={1.25}
                x1={source.x}
                x2={target.x}
                y1={source.y}
                y2={target.y}
              />
              <text
                dominantBaseline="middle"
                fill="var(--color-fg-muted)"
                fontFamily="var(--font-family-ui)"
                fontSize={11}
                textAnchor="middle"
                x={midX}
                y={midY}
              >
                {edge.label}
              </text>
            </g>
          );
        })}

        {layoutNodes.map((node) => {
          const degree = degreeByNodeId.get(node.id) ?? 0;
          const radius = 14 + Math.min(degree * 2, 8);
          const isSelected = props.selectedNodeId === node.id;
          return (
            <g
              key={node.id}
              aria-label={node.name}
              data-testid={`knowledge-graph-node-${node.type}-${node.id}`}
              role="button"
              tabIndex={0}
              onClick={(event) => {
                handleNodeSelect(event, node.id);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") {
                  return;
                }
                event.preventDefault();
                props.onNodeSelect?.(node.id);
              }}
              onMouseDown={(event) => {
                handleNodeMouseDown(event, node.id);
              }}
              style={{
                cursor: interaction?.kind === "drag" && interaction.nodeId === node.id ? "grabbing" : "grab",
              }}
              transform={`translate(${node.x} ${node.y})`}
            >
              <circle
                fill={nodeColors[node.type]}
                r={radius}
                stroke={isSelected ? "var(--color-accent)" : "var(--color-bg-surface)"}
                strokeWidth={isSelected ? 3 : 2}
              />
              <text
                dominantBaseline="middle"
                fill="#ffffff"
                fontFamily="var(--font-family-ui)"
                fontSize={11}
                fontWeight={600}
                textAnchor="middle"
              >
                {node.name.length > 5 ? `${node.name.slice(0, 5)}…` : node.name}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
