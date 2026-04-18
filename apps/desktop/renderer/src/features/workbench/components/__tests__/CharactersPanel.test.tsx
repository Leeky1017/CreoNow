import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { CharactersPanel } from "../CharactersPanel";

const baseEntries = [
  {
    id: "char-1",
    name: "零号",
    role: "主角",
    description: "前特种部队成员。",
    status: "active" as const,
  },
  {
    id: "char-2",
    name: "克莱尔",
    role: "",
    description: "",
    status: "draft" as const,
  },
];

function renderPanel(override: Partial<ComponentProps<typeof CharactersPanel>> = {}) {
  const onQueryChange = vi.fn();
  const onDeleteEntry = vi.fn();
  render(
    <CharactersPanel
      entries={baseEntries}
      errorMessage={null}
      onCreateEntry={() => {}}
      onDeleteEntry={onDeleteEntry}
      onQueryChange={onQueryChange}
      onRetry={() => {}}
      query=""
      status="ready"
      {...override}
    />,
  );
  return { onDeleteEntry, onQueryChange };
}

describe("CharactersPanel", () => {
  it("ready 态渲染角色卡片", () => {
    renderPanel();
    expect(screen.getByTestId("characters-entry-list")).toBeInTheDocument();
    expect(screen.getByTestId("characters-entry-char-1")).toBeInTheDocument();
  });

  it("搜索无命中时渲染 no-match", () => {
    renderPanel({ query: "不存在" });
    expect(screen.getByTestId("characters-no-match")).toBeInTheDocument();
  });

  it("loading 与 error 状态可渲染", () => {
    const { rerender } = render(
      <CharactersPanel
        entries={[]}
        errorMessage={null}
        onCreateEntry={() => {}}
        onQueryChange={() => {}}
        onRetry={() => {}}
        query=""
        status="loading"
      />,
    );
    expect(screen.getByTestId("characters-loading")).toBeInTheDocument();

    rerender(
      <CharactersPanel
        entries={[]}
        errorMessage="failed"
        onCreateEntry={() => {}}
        onQueryChange={() => {}}
        onRetry={() => {}}
        query=""
        status="error"
      />,
    );
    expect(screen.getByTestId("characters-error")).toBeInTheDocument();
  });

  it("空状态可渲染", () => {
    renderPanel({ entries: [] });
    expect(screen.getByTestId("characters-empty")).toBeInTheDocument();
  });

  it("删除按钮触发 onDeleteEntry", () => {
    const { onDeleteEntry } = renderPanel();
    fireEvent.click(screen.getByTestId("characters-entry-delete-char-1"));
    expect(onDeleteEntry).toHaveBeenCalledWith(baseEntries[0]);
  });
});
