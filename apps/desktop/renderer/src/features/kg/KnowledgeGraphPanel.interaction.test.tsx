import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { KnowledgeGraph } from "../../components/features/KnowledgeGraph/KnowledgeGraph";
import type { GraphData } from "../../components/features/KnowledgeGraph/types";

describe("KnowledgeGraphPanel.interaction", () => {
  const graphData: GraphData = {
    nodes: [
      {
        id: "n-1",
        label: "林远",
        type: "character",
        position: { x: 300, y: 180 },
      },
      {
        id: "n-2",
        label: "旧港",
        type: "location",
        position: { x: 520, y: 300 },
      },
    ],
    edges: [{ id: "r-1", source: "n-1", target: "n-2", label: "盟友" }],
  };

  it("should update node positions on drag and zoom around cursor anchor", () => {
    const onNodeMove = vi.fn();
    const onTransformChange = vi.fn();

    render(
      <KnowledgeGraph
        data={graphData}
        onNodeMove={onNodeMove}
        onTransformChange={onTransformChange}
      />,
    );

    const node = screen.getByText("林远").closest("[data-node-id='n-1']");
    expect(node).toBeTruthy();

    const canvas = screen.getByTestId("knowledge-graph-canvas");

    fireEvent.mouseDown(node as Element, {
      clientX: 300,
      clientY: 180,
    });
    fireEvent.mouseMove(canvas, {
      clientX: 340,
      clientY: 220,
    });
    fireEvent.mouseUp(canvas);

    expect(onNodeMove).toHaveBeenCalled();

    fireEvent.wheel(canvas, {
      deltaY: -120,
      clientX: 420,
      clientY: 240,
    });

    expect(onTransformChange).toHaveBeenCalled();

    const latestTransform = onTransformChange.mock.calls.at(-1)?.[0] as
      | { scale: number; translateX: number; translateY: number }
      | undefined;
    expect(latestTransform).toBeDefined();
    expect(latestTransform?.scale ?? 0).toBeGreaterThan(1);
    expect(latestTransform?.translateX).not.toBe(0);
    expect(latestTransform?.translateY).not.toBe(0);
  });
});

