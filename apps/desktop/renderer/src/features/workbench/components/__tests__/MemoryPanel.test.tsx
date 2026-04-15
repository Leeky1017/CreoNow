import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { MemoryPanel } from "../MemoryPanel";

const baseEntries = [
  {
    id: "mem-1",
    key: "角色设定：艾琳娜的目击者身份",
    value: "雷恩对深渊的第一感官是硫磺味。",
    category: "character-setting",
    source: "system",
    createdAt: 1,
    updatedAt: 3,
  },
  {
    id: "mem-2",
    key: "写作偏好：场景描写先于对白",
    value: "冷静外表下隐藏创伤。",
    category: "preference",
    source: "user",
    createdAt: 1,
    updatedAt: 2,
  },
];

function renderPanel(override: Partial<ComponentProps<typeof MemoryPanel>> = {}) {
  const onQueryChange = vi.fn();
  const onRetry = vi.fn();
  render(
    <MemoryPanel
      entries={baseEntries}
      errorMessage={null}
      onQueryChange={onQueryChange}
      onRetry={onRetry}
      query=""
      status="ready"
      {...override}
    />,
  );
  return { onQueryChange, onRetry };
}

describe("MemoryPanel", () => {
  it("ready 态渲染列表和详情", () => {
    renderPanel();
    expect(screen.getByTestId("memory-entry-list")).toBeInTheDocument();
    expect(screen.getByTestId("memory-detail")).toHaveTextContent("角色设定：艾琳娜的目击者身份");
  });

  it("点击词条后详情切换", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("memory-entry-mem-2"));
    expect(screen.getByTestId("memory-detail")).toHaveTextContent("写作偏好：场景描写先于对白");
    expect(screen.getByTestId("memory-entry-mem-2")).toHaveAttribute("aria-pressed", "true");
  });

  it("搜索无命中时渲染 no-match", () => {
    renderPanel({ query: "不存在" });
    expect(screen.getByTestId("memory-no-match")).toBeInTheDocument();
  });

  it("loading 与 error 状态可见", () => {
    const { rerender } = render(
      <MemoryPanel
        entries={[]}
        errorMessage={null}
        onQueryChange={() => {}}
        onRetry={() => {}}
        query=""
        status="loading"
      />,
    );
    expect(screen.getByTestId("memory-loading")).toBeInTheDocument();

    rerender(
      <MemoryPanel
        entries={[]}
        errorMessage="failed"
        onQueryChange={() => {}}
        onRetry={() => {}}
        query=""
        status="error"
      />,
    );
    expect(screen.getByTestId("memory-error")).toBeInTheDocument();
  });

  it("ready 但无数据时渲染 empty", () => {
    renderPanel({ entries: [] });
    expect(screen.getByTestId("memory-empty")).toBeInTheDocument();
  });

  it("重试按钮会触发 onRetry", () => {
    const { onRetry } = renderPanel();
    fireEvent.click(screen.getByTestId("memory-reload"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
