import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  KnowledgeGraphCanvas,
  type KnowledgeGraphEdge,
  type KnowledgeGraphNode,
} from "@/features/workbench/components/KnowledgeGraphCanvas";

function extractRadiusFromTransform(transform: string | null): number {
  if (transform === null) {
    return 0;
  }
  const match = transform.match(/translate\(([-\d.]+)\s+([-\d.]+)\)/);
  if (match === null) {
    return 0;
  }
  const x = Number.parseFloat(match[1] ?? "0");
  const y = Number.parseFloat(match[2] ?? "0");
  return Math.sqrt(x * x + y * y);
}

describe("KnowledgeGraphCanvas render fallback", () => {
  it("keeps aria label and suppresses edge labels for dense graphs", async () => {
    const nodes: KnowledgeGraphNode[] = Array.from({ length: 181 }, (_, index) => ({
      id: `node-${index}`,
      name: `节点${index}`,
      type: "character",
      description: "",
      attributes: {},
    }));
    const edges: KnowledgeGraphEdge[] = Array.from({ length: 260 }, (_, index) => ({
      id: `edge-${index}`,
      sourceId: `node-${index % 181}`,
      targetId: `node-${(index + 7) % 181}`,
      label: `关系-${index}`,
    }));

    render(
      <KnowledgeGraphCanvas
        ariaLabel="图谱画布可访问标签"
        edges={edges}
        nodes={nodes}
        selectedNodeId={null}
      />,
    );

    expect(screen.getByLabelText("图谱画布可访问标签")).toBeInTheDocument();
    expect(screen.queryByText("关系-0")).not.toBeInTheDocument();

    const firstNode = await screen.findByTestId("knowledge-graph-node-character-node-0");
    const lastNode = await screen.findByTestId("knowledge-graph-node-character-node-180");

    const firstRadius = extractRadiusFromTransform(firstNode.getAttribute("transform"));
    const lastRadius = extractRadiusFromTransform(lastNode.getAttribute("transform"));
    expect(Math.abs(lastRadius - firstRadius)).toBeGreaterThan(50);
  });
});
