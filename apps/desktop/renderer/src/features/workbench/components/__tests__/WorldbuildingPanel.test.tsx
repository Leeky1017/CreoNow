import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { WorldbuildingPanel } from "../WorldbuildingPanel";

const baseEntries = [
  {
    id: "loc-1",
    name: "阿卡迪亚",
    typeLabel: "设定 / 都市",
    description: "核心冲突城市。",
    status: "detailed" as const,
    updatedAt: 2,
  },
  {
    id: "loc-2",
    name: "地下回廊",
    typeLabel: "地点设定",
    description: "",
    status: "draft" as const,
    updatedAt: 1,
  },
];

function renderPanel(override: Partial<ComponentProps<typeof WorldbuildingPanel>> = {}) {
  const onTabChange = vi.fn();
  const onQueryChange = vi.fn();
  render(
    <WorldbuildingPanel
      entries={baseEntries}
      errorMessage={null}
      onCreateEntry={() => {}}
      onQueryChange={onQueryChange}
      onRetry={() => {}}
      onTabChange={onTabChange}
      query=""
      status="ready"
      tab="encyclopedia"
      {...override}
    />,
  );
  return { onQueryChange, onTabChange };
}

describe("WorldbuildingPanel", () => {
  it("ready 态渲染百科条目", () => {
    renderPanel();
    expect(screen.getByTestId("worldbuilding-entry-list")).toBeInTheDocument();
    expect(screen.getByTestId("worldbuilding-entry-loc-1")).toBeInTheDocument();
  });

  it("搜索无命中时渲染 no-match", () => {
    renderPanel({ query: "不存在" });
    expect(screen.getByTestId("worldbuilding-no-match")).toBeInTheDocument();
  });

  it("loading 与 error 状态可渲染", () => {
    const { rerender } = render(
      <WorldbuildingPanel
        entries={[]}
        errorMessage={null}
        onCreateEntry={() => {}}
        onQueryChange={() => {}}
        onRetry={() => {}}
        onTabChange={() => {}}
        query=""
        status="loading"
        tab="encyclopedia"
      />,
    );
    expect(screen.getByTestId("worldbuilding-loading")).toBeInTheDocument();

    rerender(
      <WorldbuildingPanel
        entries={[]}
        errorMessage="failed"
        onCreateEntry={() => {}}
        onQueryChange={() => {}}
        onRetry={() => {}}
        onTabChange={() => {}}
        query=""
        status="error"
        tab="encyclopedia"
      />,
    );
    expect(screen.getByTestId("worldbuilding-error")).toBeInTheDocument();
  });

  it("切换 tab 会触发 onTabChange", () => {
    const { onTabChange } = renderPanel();
    fireEvent.click(screen.getByTestId("worldbuilding-tab-map"));
    expect(onTabChange).toHaveBeenCalledWith("map");
  });
});
