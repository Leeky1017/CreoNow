import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TimelineView, type TimelineEventItem } from "./TimelineView";

describe("TimelineView.ordering", () => {
  it("should render chapter-based axis and persist event reordering", () => {
    const onOrderChange = vi.fn();

    const events: TimelineEventItem[] = [
      {
        id: "ev-1",
        title: "第一幕开端",
        chapter: "Chapter-01",
        order: 1,
      },
      {
        id: "ev-2",
        title: "旧港冲突",
        chapter: "Chapter-02",
        order: 2,
      },
      {
        id: "ev-3",
        title: "雨夜分歧",
        chapter: "Chapter-03",
        order: 3,
      },
    ];

    render(<TimelineView events={events} onOrderChange={onOrderChange} />);

    expect(screen.getAllByText("Chapter-01").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chapter-02").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chapter-03").length).toBeGreaterThan(0);

    const source = screen.getByTestId("timeline-event-ev-2");
    const target = screen.getByTestId("timeline-event-ev-1");

    fireEvent.dragStart(source);
    fireEvent.dragOver(target);
    fireEvent.drop(target);

    expect(onOrderChange).toHaveBeenCalledWith(["ev-2", "ev-1", "ev-3"]);
  });
});
