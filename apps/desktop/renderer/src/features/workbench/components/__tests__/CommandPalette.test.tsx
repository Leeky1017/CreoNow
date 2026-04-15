import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CommandPalette } from "@/features/workbench/components/CommandPalette";

const baseProps = {
  emptyLabel: "没有匹配结果。",
  groupLabels: {
    actions: "快捷动作",
    documents: "最近文档",
    navigation: "导航",
    scenarios: "场景",
  } as const,
  items: [
    { id: "nav-dashboard", group: "navigation" as const, label: "仪表盘", description: "查看项目概览" },
    { id: "scenario-novel", group: "scenarios" as const, label: "长篇小说", description: "大纲与主线冲突驱动" },
    { id: "doc-1", group: "documents" as const, label: "第一章", description: "03/18 21:14" },
    { id: "action-new-doc", group: "actions" as const, label: "新建文档", description: "创建新文稿" },
  ],
  onClose: vi.fn(),
  onQueryChange: vi.fn(),
  onSelect: vi.fn(),
  open: true,
  placeholder: "搜索页面、场景或命令…",
  query: "",
  shortcutHint: "Ctrl/Cmd+K",
  title: "命令面板",
};

describe("CommandPalette", () => {
  it("renders grouped results when open", () => {
    render(<CommandPalette {...baseProps} />);

    expect(screen.getByRole("dialog", { name: "命令面板" })).toBeInTheDocument();
    expect(screen.getByText("导航")).toBeInTheDocument();
    expect(screen.getByText("场景")).toBeInTheDocument();
    expect(screen.getByText("最近文档")).toBeInTheDocument();
    expect(screen.getByText("快捷动作")).toBeInTheDocument();
  });

  it("filters items by query and shows empty state", () => {
    const onQueryChange = vi.fn();
    const { rerender } = render(<CommandPalette {...baseProps} onQueryChange={onQueryChange} />);

    fireEvent.change(screen.getByPlaceholderText("搜索页面、场景或命令…"), { target: { value: "文档" } });
    expect(onQueryChange).toHaveBeenCalledWith("文档");

    rerender(<CommandPalette {...baseProps} query="不存在" onQueryChange={onQueryChange} />);
    expect(screen.getByText("没有匹配结果。")).toBeInTheDocument();
  });

  it("calls onSelect and onClose callbacks", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(<CommandPalette {...baseProps} onSelect={onSelect} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /仪表盘查看项目概览/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "nav-dashboard" }));

    fireEvent.mouseDown(screen.getByRole("dialog", { name: "命令面板" }).parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps Tab focus inside the dialog", () => {
    render(<CommandPalette {...baseProps} />);

    const dialog = screen.getByRole("dialog", { name: "命令面板" });
    const input = screen.getByPlaceholderText("搜索页面、场景或命令…");
    const buttons = screen.getAllByRole("button");
    const last = buttons[buttons.length - 1];

    last.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(input).toHaveFocus();
  });
});
