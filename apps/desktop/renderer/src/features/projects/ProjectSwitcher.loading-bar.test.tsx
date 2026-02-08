import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectSwitcher } from "./ProjectSwitcher";

describe("ProjectSwitcher loading bar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should show top progress bar after 1s timeout and hide on completion", async () => {
    let resolveSwitch: (() => void) | null = null;
    const onSwitch = vi.fn(() => {
      return new Promise<void>((resolve) => {
        resolveSwitch = resolve;
      });
    });

    render(
      <ProjectSwitcher
        currentProjectId="proj-a"
        projects={[
          { projectId: "proj-a", name: "A", rootPath: "/a", updatedAt: 1 },
          { projectId: "proj-b", name: "B", rootPath: "/b", updatedAt: 2 },
        ]}
        onSwitch={onSwitch}
      />,
    );

    fireEvent.change(screen.getByTestId("project-switcher-select"), {
      target: { value: "proj-b" },
    });

    expect(screen.queryByTestId("project-switcher-progress")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("project-switcher-progress")).toBeInTheDocument();

    await act(async () => {
      resolveSwitch?.();
      await Promise.resolve();
    });

    expect(screen.queryByTestId("project-switcher-progress")).toBeNull();
  });
});
