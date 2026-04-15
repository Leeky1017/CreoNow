import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { KnowledgeGraphPanel } from "../KnowledgeGraphPanel";

const baseNodes = [
  {
    id: "character:char-1",
    name: "雷恩",
    type: "character" as const,
    description: "契约守护者。",
    updatedAt: 2,
  },
  {
    id: "location:loc-1",
    name: "深渊洞窟",
    type: "location" as const,
    description: "主线冲突地带。",
    updatedAt: 1,
  },
];

const baseLinks = [
  {
    id: "link-1",
    sourceId: "character:char-1",
    targetId: "location:loc-1",
    label: "探索",
  },
];

function renderPanel(override: Partial<ComponentProps<typeof KnowledgeGraphPanel>> = {}) {
  const onViewChange = vi.fn();
  const onQueryChange = vi.fn();
  render(
    <KnowledgeGraphPanel
      errorMessage={null}
      links={baseLinks}
      nodes={baseNodes}
      onQueryChange={onQueryChange}
      onRetry={() => {}}
      onViewChange={onViewChange}
      query=""
      status="ready"
      view="graph"
      {...override}
    />,
  );
  return { onQueryChange, onViewChange };
}

describe("KnowledgeGraphPanel", () => {
  it("ready 态渲染图谱画布与节点", () => {
    renderPanel();
    expect(screen.getByTestId("knowledge-graph-svg")).toBeInTheDocument();
    expect(screen.getByTestId("knowledge-graph-node-character-char-1")).toBeInTheDocument();
  });

  it("点击节点后显示详情", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("knowledge-graph-node-character-char-1"));
    expect(screen.getByTestId("knowledge-graph-detail")).toHaveTextContent("雷恩");
    expect(screen.getByTestId("knowledge-graph-detail")).toHaveTextContent("契约守护者。");
  });

  it("切换视图会触发 onViewChange", () => {
    const { onViewChange } = renderPanel();
    fireEvent.click(screen.getByTestId("knowledge-graph-view-summary"));
    expect(onViewChange).toHaveBeenCalledWith("summary");
  });

  it("summary 视图渲染实体卡片", () => {
    renderPanel({ view: "summary" });
    expect(screen.getByTestId("knowledge-graph-summary-list")).toBeInTheDocument();
    expect(screen.getByTestId("knowledge-graph-summary-character-char-1")).toBeInTheDocument();
  });

  it("搜索无命中时渲染 no-match", () => {
    renderPanel({ query: "不存在" });
    expect(screen.getByTestId("knowledge-graph-no-match")).toBeInTheDocument();
  });

  it("loading 和 error 状态可见", () => {
    const { rerender } = render(
      <KnowledgeGraphPanel
        errorMessage={null}
        links={[]}
        nodes={[]}
        onQueryChange={() => {}}
        onRetry={() => {}}
        onViewChange={() => {}}
        query=""
        status="loading"
        view="graph"
      />,
    );
    expect(screen.getByTestId("knowledge-graph-loading")).toBeInTheDocument();

    rerender(
      <KnowledgeGraphPanel
        errorMessage="failed"
        links={[]}
        nodes={[]}
        onQueryChange={() => {}}
        onRetry={() => {}}
        onViewChange={() => {}}
        query=""
        status="error"
        view="graph"
      />,
    );
    expect(screen.getByTestId("knowledge-graph-error")).toBeInTheDocument();
  });

  it("ready 但无数据时渲染 empty", () => {
    renderPanel({ nodes: [], links: [] });
    expect(screen.getByTestId("knowledge-graph-empty")).toBeInTheDocument();
  });
});
