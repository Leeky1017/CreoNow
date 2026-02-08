import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { DashboardPage } from "./DashboardPage";
import {
  ProjectStoreProvider,
  createProjectStore,
} from "../../stores/projectStore";

function createInvokeMock() {
  return vi.fn().mockImplementation((channel: string) => {
    if (channel === "project:project:list") {
      return Promise.resolve({ ok: true, data: { items: [] } });
    }
    if (channel === "project:project:getcurrent") {
      return Promise.resolve({
        ok: false,
        error: { code: "NOT_FOUND", message: "No current project" },
      });
    }
    return Promise.resolve({ ok: true, data: {} });
  });
}

describe("Dashboard empty state (PM1-S7)", () => {
  it("should render empty state illustration and primary create CTA", async () => {
    const projectStore = createProjectStore({ invoke: createInvokeMock() });

    render(
      <ProjectStoreProvider store={projectStore}>
        <DashboardPage />
      </ProjectStoreProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-empty")).toBeInTheDocument();
    });

    expect(
      screen.getByText("开始创建你的第一个创作项目"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-create-first")).toBeInTheDocument();
  });
});
