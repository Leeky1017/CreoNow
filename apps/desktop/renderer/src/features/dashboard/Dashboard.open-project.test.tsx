import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DashboardPage } from "./DashboardPage";
import {
  ProjectStoreProvider,
  createProjectStore,
} from "../../stores/projectStore";

function createInvokeMock() {
  return vi.fn().mockImplementation((channel: string) => {
    if (channel === "project:project:list") {
      return Promise.resolve({
        ok: true,
        data: {
          items: [
            {
              projectId: "p-open-1",
              name: "暗流",
              rootPath: "/tmp/p-open-1",
              updatedAt: Date.now(),
              stage: "draft",
            },
          ],
        },
      });
    }

    if (channel === "project:project:getcurrent") {
      return Promise.resolve({
        ok: false,
        error: { code: "NOT_FOUND", message: "No current project" },
      });
    }

    if (channel === "project:project:setcurrent") {
      return Promise.resolve({
        ok: true,
        data: {
          projectId: "p-open-1",
          rootPath: "/tmp/p-open-1",
        },
      });
    }

    return Promise.resolve({ ok: true, data: {} });
  });
}

describe("Dashboard open project (PM1-S6)", () => {
  it("should open selected project card and navigate to editor layout", async () => {
    const invoke = createInvokeMock();
    const projectStore = createProjectStore({ invoke });
    const onProjectSelect = vi.fn();

    render(
      <ProjectStoreProvider store={projectStore}>
        <DashboardPage onProjectSelect={onProjectSelect} />
      </ProjectStoreProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-hero-card")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId("dashboard-hero-card"));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("project:project:setcurrent", {
        projectId: "p-open-1",
      });
      expect(onProjectSelect).toHaveBeenCalledWith("p-open-1");
    });
  });
});
