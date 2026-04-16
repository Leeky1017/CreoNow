import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { KnowledgeGraphPanel } from "@/features/workbench/components/KnowledgeGraphPanel";

type KnowledgeGraphPanelNodes = ComponentProps<typeof KnowledgeGraphPanel>["nodes"];

const graphNodes: KnowledgeGraphPanelNodes = [
  {
    attributes: { 年龄: "28" } as Record<string, string>,
    description: "冷静克制，擅长追踪。",
    id: "node-linyuan",
    name: "林远",
    type: "character" as const,
  },
  {
    attributes: { 区域: "旧城北区" } as Record<string, string>,
    description: "雨夜追逐的关键场景。",
    id: "node-clocktower",
    name: "旧钟楼",
    type: "location" as const,
  },
  {
    attributes: { 立场: "中立偏敌对" } as Record<string, string>,
    description: "控制旧城地下网络。",
    id: "node-faction",
    name: "黑曜会",
    type: "faction" as const,
  },
];

const graphEdges = [
  {
    id: "edge-ally",
    label: "盟友",
    sourceId: "node-linyuan",
    targetId: "node-faction",
  },
  {
    id: "edge-located",
    label: "位于",
    sourceId: "node-faction",
    targetId: "node-clocktower",
  },
];

describe("KnowledgeGraphPanel", () => {
  it("renders core graph elements and relation labels", () => {
    render(
      <KnowledgeGraphPanel
        edges={graphEdges}
        nodes={graphNodes}
        status="ready"
      />,
    );

    expect(screen.getByRole("button", { name: "林远" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "旧钟楼" })).toBeInTheDocument();
    expect(screen.getByText("盟友")).toBeInTheDocument();
  });

  it("supports type filtering and can restore all nodes", () => {
    render(
      <KnowledgeGraphPanel
        edges={graphEdges}
        nodes={graphNodes}
        status="ready"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "角色" }));
    expect(screen.queryByRole("button", { name: "林远" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "旧钟楼" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "地点" }));
    fireEvent.click(screen.getByRole("button", { name: "阵营" }));
    fireEvent.click(screen.getByRole("button", { name: "事件" }));
    fireEvent.click(screen.getByRole("button", { name: "物品" }));
    fireEvent.click(screen.getByRole("button", { name: "其他" }));

    expect(screen.getByText("当前筛选没有匹配实体。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "显示全部" }));
    expect(screen.getByRole("button", { name: "林远" })).toBeInTheDocument();
  });

  it("shows filter-empty recovery state in summary view", () => {
    render(
      <KnowledgeGraphPanel
        edges={graphEdges}
        nodes={graphNodes}
        status="ready"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "角色" }));
    fireEvent.click(screen.getByRole("button", { name: "地点" }));
    fireEvent.click(screen.getByRole("button", { name: "阵营" }));
    fireEvent.click(screen.getByRole("button", { name: "事件" }));
    fireEvent.click(screen.getByRole("button", { name: "物品" }));
    fireEvent.click(screen.getByRole("button", { name: "其他" }));

    fireEvent.click(screen.getByTestId("knowledge-graph-view-summary"));
    expect(screen.getByTestId("knowledge-graph-filter-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("knowledge-graph-summary-list")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "显示全部" }));
    expect(screen.getByTestId("knowledge-graph-summary-list")).toBeInTheDocument();
  });

  it("switches node selection and updates detail panel", () => {
    render(
      <KnowledgeGraphPanel
        edges={graphEdges}
        nodes={graphNodes}
        status="ready"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "旧钟楼" }));
    expect(screen.getByRole("heading", { level: 3, name: "旧钟楼" })).toBeInTheDocument();
    expect(screen.getByText("实体类型")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "黑曜会" }));
    expect(screen.getByRole("heading", { level: 3, name: "黑曜会" })).toBeInTheDocument();
    expect(screen.getByText("关系数量")).toBeInTheDocument();
  });

  it("renders empty state and error state", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <KnowledgeGraphPanel
        edges={[]}
        nodes={[]}
        status="ready"
      />,
    );
    expect(screen.getByText("暂无知识图谱实体")).toBeInTheDocument();
    expect(screen.getByText("先创建角色或地点，图谱会自动形成结构。")).toBeInTheDocument();

    rerender(
      <KnowledgeGraphPanel
        edges={[]}
        errorMessage="图谱读取失败"
        nodes={[]}
        onRetry={onRetry}
        status="error"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("图谱读取失败");
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("supports query filtering and graph/summary view switch", () => {
    render(
      <KnowledgeGraphPanel
        edges={graphEdges}
        nodes={graphNodes}
        status="ready"
      />,
    );

    expect(screen.getByTestId("knowledge-graph-view-graph")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByTestId("knowledge-graph-view-summary"));
    expect(screen.getByTestId("knowledge-graph-view-summary")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("knowledge-graph-summary-list")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("knowledge-graph-search"), { target: { value: "不存在关键词" } });
    expect(screen.getByTestId("knowledge-graph-no-match")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "显示全部" })).not.toBeInTheDocument();
  });

  it("renders notice message when provided", () => {
    render(
      <KnowledgeGraphPanel
        edges={graphEdges}
        nodes={graphNodes}
        noticeMessage="图谱过大，仅加载前 500 条数据。"
        status="ready"
      />,
    );

    expect(screen.getByTestId("knowledge-graph-notice")).toHaveTextContent("图谱过大，仅加载前 500 条数据。");
  });
});
