import type { GraphEdgeProps } from "./types";

/**
 * Calculate the midpoint of a line for label placement
 */
function getMidpoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number } {
  return {
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2,
  };
}

/**
 * GraphEdge component
 *
 * Renders a directed edge (arrow) between two nodes with an optional label.
 * Selected edges are highlighted in blue.
 */
export function GraphEdge({
  edge,
  sourcePosition,
  targetPosition,
  highlighted = false,
}: GraphEdgeProps): JSX.Element {
  const { id, label, selected } = edge;
  const isHighlighted = highlighted || selected;

  // Calculate line coordinates
  const x1 = sourcePosition.x;
  const y1 = sourcePosition.y;
  const x2 = targetPosition.x;
  const y2 = targetPosition.y;

  // Midpoint for label
  const midpoint = getMidpoint(x1, y1, x2, y2);

  // Label background size (approximate)
  const labelWidth = label.length * 6 + 20;
  const labelHeight = 16;

  // Line colors
  const lineColor = isHighlighted
    ? "var(--color-node-character)"
    : "var(--color-border-hover)";
  const lineWidth = isHighlighted ? 2 : 1;
  const markerEnd = isHighlighted
    ? "url(#arrowhead-selected)"
    : "url(#arrowhead)";

  return (
    <g data-edge-id={id}>
      {/* Main line */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={lineColor}
        strokeWidth={lineWidth}
        markerEnd={markerEnd}
        opacity={isHighlighted ? 0.9 : 0.7}
        className="transition-all duration-[var(--duration-fast)]"
      />

      {/* Label background */}
      <rect
        x={midpoint.x - labelWidth / 2}
        y={midpoint.y - labelHeight / 2}
        width={labelWidth}
        height={labelHeight}
        fill="var(--color-bg-base)"
        stroke={isHighlighted ? lineColor : "transparent"}
        strokeWidth={1}
        rx={4}
        ry={4}
      />

      {/* Label text */}
      <text
        x={midpoint.x}
        y={midpoint.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isHighlighted ? lineColor : "var(--color-fg-subtle)"}
        fontSize={10}
        fontFamily="var(--font-family-ui)"
        className="select-none pointer-events-none"
      >
        {label}
      </text>
    </g>
  );
}

/**
 * SVG defs for arrow markers
 * Should be included once in the SVG container
 */
export function EdgeMarkerDefs(): JSX.Element {
  return (
    <defs>
      {/* Default arrow (gray) */}
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="28"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-border-hover)" />
      </marker>

      {/* Selected/highlighted arrow (blue) */}
      <marker
        id="arrowhead-selected"
        markerWidth="10"
        markerHeight="7"
        refX="28"
        refY="3.5"
        orient="auto"
      >
        <polygon
          points="0 0, 10 3.5, 0 7"
          fill="var(--color-node-character)"
        />
      </marker>
    </defs>
  );
}

GraphEdge.displayName = "GraphEdge";
