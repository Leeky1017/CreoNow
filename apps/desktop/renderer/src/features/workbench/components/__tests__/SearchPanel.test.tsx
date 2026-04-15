import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { SearchPanel } from "../SearchPanel";

const baseResults = [
  {
    id: "doc-1/chunk-1",
    documentId: "doc-1",
    title: "雨夜仓库",
    snippet: "林远在雨夜追踪线索，旧仓库门锁被人动过。",
    score: 0.9234,
    strategy: "hybrid" as const,
    updatedAt: 1_700_000_000_000,
  },
  {
    id: "doc-2/chunk-7",
    documentId: "doc-2",
    title: "人物档案",
    snippet: "退休刑警的背景在第三章出现关键冲突。",
    score: 0.8123,
    strategy: "semantic" as const,
    updatedAt: 1_700_000_100_000,
  },
];

function renderPanel(override: Partial<ComponentProps<typeof SearchPanel>> = {}) {
  const onQueryChange = vi.fn();
  const onRetry = vi.fn();
  const onStrategyChange = vi.fn();
  render(
    <SearchPanel
      errorMessage={null}
      onQueryChange={onQueryChange}
      onRetry={onRetry}
      onStrategyChange={onStrategyChange}
      query=""
      results={baseResults}
      status="ready"
      strategy="hybrid"
      {...override}
    />,
  );
  return { onQueryChange, onRetry, onStrategyChange };
}

describe("SearchPanel", () => {
  it("ready 态渲染结果列表与相关度分值", () => {
    renderPanel();
    expect(screen.getByTestId("search-result-list")).toBeInTheDocument();
    expect(screen.getByTestId("search-result-doc-1-chunk-1")).toBeInTheDocument();
    expect(screen.getByTestId("search-score-doc-1-chunk-1")).toHaveAttribute("data-score", "0.923");
  });

  it("query 输入触发 onQueryChange", () => {
    const { onQueryChange } = renderPanel();
    fireEvent.change(screen.getByTestId("search-query-input"), { target: { value: "仓库" } });
    expect(onQueryChange).toHaveBeenCalledWith("仓库");
  });

  it("strategy 切换触发 onStrategyChange", () => {
    const { onStrategyChange } = renderPanel({ strategy: "fts" });
    const semanticButton = screen.getByTestId("search-strategy-semantic");
    expect(screen.getByTestId("search-strategy-fts")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(semanticButton);
    expect(onStrategyChange).toHaveBeenCalledWith("semantic");
  });

  it("loading 与 error 状态可见", () => {
    const { rerender } = render(
      <SearchPanel
        errorMessage={null}
        onQueryChange={() => {}}
        onRetry={() => {}}
        onStrategyChange={() => {}}
        query=""
        results={[]}
        status="loading"
        strategy="hybrid"
      />,
    );
    expect(screen.getByTestId("search-loading")).toBeInTheDocument();

    rerender(
      <SearchPanel
        errorMessage="failed"
        onQueryChange={() => {}}
        onRetry={() => {}}
        onStrategyChange={() => {}}
        query=""
        results={[]}
        status="error"
        strategy="hybrid"
      />,
    );
    expect(screen.getByTestId("search-error")).toBeInTheDocument();
  });

  it("ready 且无查询时渲染 empty", () => {
    renderPanel({ results: [] });
    expect(screen.getByTestId("search-empty")).toBeInTheDocument();
  });

  it("ready 且无匹配时渲染 no-match", () => {
    renderPanel({ query: "不存在关键词" });
    expect(screen.getByTestId("search-no-match")).toBeInTheDocument();
  });

  it("重试按钮触发 onRetry", () => {
    const { onRetry } = renderPanel();
    fireEvent.click(screen.getByTestId("search-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
