import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { CalendarPanel } from "../CalendarPanel";

const milestones = [
  {
    id: "m1",
    dateLabel: "本周",
    title: "主线推进",
    description: "完成主章节初稿",
    status: "active" as const,
  },
];

const events = [
  { id: "e1", day: 3, title: "角色卡校验", type: "fiction" as const },
  { id: "e2", day: 3, title: "冲突弧复盘", type: "script" as const },
];

function renderPanel(override: Partial<ComponentProps<typeof CalendarPanel>> = {}) {
  const onRetry = vi.fn();
  render(
    <CalendarPanel
      errorMessage={null}
      events={events}
      milestones={milestones}
      onRetry={onRetry}
      status="ready"
      {...override}
    />,
  );
  return { onRetry };
}

describe("CalendarPanel", () => {
  it("ready 态渲染里程碑和日历网格", () => {
    renderPanel();
    expect(screen.getByTestId("calendar-grid")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-milestones")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-milestone-m1")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-day-3")).toBeInTheDocument();
  });

  it("月份切换和重试操作可触发", () => {
    const { onRetry } = renderPanel();
    const before = screen.getByTestId("calendar-month-label").textContent;
    fireEvent.click(screen.getByTestId("calendar-next-month"));
    const after = screen.getByTestId("calendar-month-label").textContent;
    expect(after).not.toBe(before);

    fireEvent.click(screen.getByTestId("calendar-reload"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("loading 与 error 状态可渲染", () => {
    const { rerender } = render(
      <CalendarPanel
        errorMessage={null}
        events={[]}
        milestones={[]}
        onRetry={() => {}}
        status="loading"
      />,
    );
    expect(screen.getByTestId("calendar-loading")).toBeInTheDocument();

    rerender(
      <CalendarPanel
        errorMessage="failed"
        events={[]}
        milestones={[]}
        onRetry={() => {}}
        status="error"
      />,
    );
    expect(screen.getByTestId("calendar-error")).toBeInTheDocument();
  });

  it("ready 但无事件和里程碑时渲染空状态", () => {
    renderPanel({ events: [], milestones: [] });
    expect(screen.getByTestId("calendar-empty-events")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-empty-milestones")).toBeInTheDocument();
  });
});
