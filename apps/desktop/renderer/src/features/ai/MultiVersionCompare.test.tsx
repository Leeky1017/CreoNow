import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MultiVersionCompare } from "./MultiVersionCompare";
import type { VersionContent } from "./VersionPane";

const versions4: VersionContent[] = [
  { id: "v1", label: "Original", content: "Line 1\nLine 2", type: "manual" },
  { id: "v2", label: "Version 2", content: "Line 1\nLine 2\nLine 3", type: "auto" },
  { id: "v3", label: "Version 3", content: "Hello\nWorld", type: "auto" },
  { id: "v4", label: "Current Version", content: "Final\nContent", type: "current" },
];

describe("MultiVersionCompare", () => {
  it("应该渲染容器和 4 个版本面板", () => {
    render(<MultiVersionCompare versions={versions4} />);

    expect(screen.getByTestId("multi-version-compare")).toBeInTheDocument();
    for (const v of versions4) {
      expect(screen.getByTestId(`version-pane-${v.id}`)).toBeInTheDocument();
      expect(screen.getByText(v.label)).toBeInTheDocument();
    }
  });

  it("3 个版本时最后一个面板应跨两列", () => {
    const versions3 = versions4.slice(0, 3);
    render(<MultiVersionCompare versions={versions3} />);

    const pane = screen.getByTestId("version-pane-v3");
    const wrapper = pane.parentElement;
    expect(wrapper?.className ?? "").toContain("col-span-2");
  });

  it("开启同步滚动时，滚动一个面板会同步到其他面板", async () => {
    const versions2 = versions4.slice(0, 2);
    render(<MultiVersionCompare versions={versions2} syncScroll />);

    const a = screen.getByTestId("version-pane-content-v1");
    const b = screen.getByTestId("version-pane-content-v2");

    expect((a as HTMLDivElement).scrollTop).toBe(0);
    expect((b as HTMLDivElement).scrollTop).toBe(0);

    (a as HTMLDivElement).scrollTop = 120;
    fireEvent.scroll(a);

    await waitFor(() => {
      expect((b as HTMLDivElement).scrollTop).toBe(120);
    });
  });

  it("关闭同步滚动时，滚动不会影响其他面板", async () => {
    const versions2 = versions4.slice(0, 2);
    render(<MultiVersionCompare versions={versions2} syncScroll={false} />);

    const a = screen.getByTestId("version-pane-content-v1");
    const b = screen.getByTestId("version-pane-content-v2");

    (a as HTMLDivElement).scrollTop = 80;
    fireEvent.scroll(a);

    await waitFor(() => {
      expect((b as HTMLDivElement).scrollTop).toBe(0);
    });
  });
});

