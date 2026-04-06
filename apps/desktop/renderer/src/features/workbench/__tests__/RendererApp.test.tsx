import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/workbench/WorkbenchApp", () => ({
  WorkbenchApp: () => <div data-testid="workbench-app" />,
}));

import { RendererApp } from "@/features/workbench/RendererApp";

function createProjectApi() {
  return {
    getCurrent: vi.fn(async () => ({ ok: false, error: { code: "NOT_FOUND", message: "missing" } })),
    list: vi.fn(async () => ({
      ok: true,
      data: {
        items: [
          {
            projectId: "proj-1",
            name: "暗流",
            rootPath: "/projects/proj-1",
            type: "novel",
            stage: "draft",
            updatedAt: 123,
            archivedAt: null,
          },
        ],
      },
    })),
    setCurrent: vi.fn(async () => ({ ok: true, data: { projectId: "proj-1", rootPath: "/projects/proj-1" } })),
    stats: vi.fn(async () => ({
      ok: true,
      data: {
        total: 1,
        active: 1,
        archived: 0,
        totalWordCount: 1234,
        overallProgressPercent: 56,
        perProject: [{ projectId: "proj-1", wordCount: 1234, targetWordCount: 2200, progressPercent: 56 }],
      },
    })),
    create: vi.fn(async () => ({ ok: true, data: { projectId: "proj-2", rootPath: "/projects/proj-2" } })),
    switchProject: vi.fn(async ({ projectId }) => ({
      ok: true,
      data: { currentProjectId: projectId, switchedAt: "2026-01-01T00:00:00.000Z" },
    })),
  };
}

describe("RendererApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("无当前项目时进入 Dashboard，并可点击项目卡片进入 Workbench", async () => {
    const projectApi = createProjectApi();
    window.api = ({
      project: projectApi,
      file: {} as never,
      ai: {} as never,
      version: {} as never,
    } as unknown) as NonNullable<typeof window.api>;

    render(<RendererApp />);

    await waitFor(() => expect(screen.getByTestId("dashboard-page")).toBeInTheDocument());
    expect(screen.getByText("1,234 字")).toBeInTheDocument();
    expect(screen.getByText("进度 56%")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("dashboard-project-card-proj-1"));

    await waitFor(() =>
      expect(projectApi.switchProject).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: "proj-1", fromProjectId: "dashboard" }),
      ),
    );
    await waitFor(() => expect(screen.getByTestId("workbench-app")).toBeInTheDocument());
  });

  it("点击新建项目会创建并切换到新项目", async () => {
    const projectApi = createProjectApi();
    window.api = ({
      project: projectApi,
      file: {} as never,
      ai: {} as never,
      version: {} as never,
    } as unknown) as NonNullable<typeof window.api>;

    render(<RendererApp />);

    await waitFor(() => expect(screen.getByTestId("dashboard-create-project-btn")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("dashboard-create-project-btn"));

    await waitFor(() => expect(projectApi.create).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(projectApi.switchProject).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: "proj-2", fromProjectId: "dashboard" }),
      ),
    );
    await waitFor(() => expect(screen.getByTestId("workbench-app")).toBeInTheDocument());
  });
});
