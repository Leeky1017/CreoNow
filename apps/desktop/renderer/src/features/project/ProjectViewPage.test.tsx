import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProjectViewPage } from "./ProjectViewPage";
import type { PreloadApi } from "@/lib/preloadApi";

interface MockApiOverrides {
  project?: Partial<PreloadApi["project"]>;
  file?: Partial<PreloadApi["file"]>;
  character?: Partial<PreloadApi["character"]>;
}

function createMockApi(overrides?: MockApiOverrides): PreloadApi {
  const projectApi: PreloadApi["project"] = {
    list: vi.fn(async () => ({
      ok: true as const,
      data: {
        items: [
          {
            projectId: "proj-9",
            name: "霜桥",
            rootPath: "/projects/proj-9",
            type: "novel" as const,
            stage: "draft" as const,
            updatedAt: Date.parse("2025-01-01T00:00:00.000Z"),
            archivedAt: null,
          },
        ],
      },
    })),
    ...overrides?.project,
  } as unknown as PreloadApi["project"];

  const fileApi: PreloadApi["file"] = {
    listDocuments: vi.fn(async () => ({
      ok: true as const,
      data: {
        items: [
          { documentId: "doc-1", title: "第一章", sortOrder: 0, status: "draft" as const, type: "chapter" as const, updatedAt: 0 },
          { documentId: "doc-2", title: "第二章", sortOrder: 1, status: "draft" as const, type: "chapter" as const, updatedAt: 0 },
        ],
      },
    })),
    ...overrides?.file,
  } as unknown as PreloadApi["file"];

  const characterApi: PreloadApi["character"] = {
    list: vi.fn(async () => ({
      ok: true as const,
      data: {
        items: [
          {
            id: "char-1",
            projectId: "proj-9",
            name: "零号",
            description: "前特种部队成员，现为地下情报商。",
            attributes: { role: "主角", status: "active" },
            createdAt: 0,
            updatedAt: 0,
          },
          {
            id: "char-2",
            projectId: "proj-9",
            name: "克莱尔",
            description: "天才黑客，负责情报破解。",
            attributes: { role: "关键配角", status: "draft" },
            createdAt: 0,
            updatedAt: 0,
          },
        ],
      },
    })),
    ...overrides?.character,
  } as unknown as PreloadApi["character"];

  return {
    project: projectApi,
    file: fileApi,
    ai: {} as PreloadApi["ai"],
    version: {} as PreloadApi["version"],
    character: characterApi,
    location: {} as PreloadApi["location"],
    search: {} as PreloadApi["search"],
  };
}

describe("ProjectViewPage", () => {
  it("点击编辑/设置按钮触发项目动作", async () => {
    const onEditProject = vi.fn();
    const onOpenSettings = vi.fn();
    const api = createMockApi();

    render(
      <ProjectViewPage
        projectId="proj-9"
        api={api}
        onEditProject={onEditProject}
        onOpenSettings={onOpenSettings}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("project-view-edit-btn")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("project-view-edit-btn"));
    fireEvent.click(screen.getByTestId("project-view-settings-btn"));

    expect(onEditProject).toHaveBeenCalledWith("proj-9");
    expect(onOpenSettings).toHaveBeenCalledWith("proj-9");
  });

  it("文档条目点击与键盘回车都可打开文档", async () => {
    const onOpenDocument = vi.fn();
    const api = createMockApi();

    render(<ProjectViewPage projectId="proj-9" api={api} onOpenDocument={onOpenDocument} />);

    await waitFor(() => expect(screen.getByTestId("project-view-doc-doc-1")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("project-view-doc-doc-1"));
    fireEvent.keyDown(screen.getByTestId("project-view-doc-doc-2"), { key: "Enter" });

    expect(onOpenDocument).toHaveBeenCalledTimes(2);
    expect(onOpenDocument).toHaveBeenNthCalledWith(1, "doc-1");
    expect(onOpenDocument).toHaveBeenNthCalledWith(2, "doc-2");
  });

  it("添加角色按钮触发项目级回调", async () => {
    const onAddCharacter = vi.fn();
    const api = createMockApi();

    render(<ProjectViewPage projectId="proj-9" api={api} onAddCharacter={onAddCharacter} />);

    await waitFor(() => expect(screen.getByTestId("project-view-add-character-btn")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("project-view-add-character-btn"));

    expect(onAddCharacter).toHaveBeenCalledTimes(1);
    expect(onAddCharacter).toHaveBeenCalledWith("proj-9");
  });

  it("角色区支持搜索过滤与视图切换", async () => {
    const api = createMockApi();
    render(<ProjectViewPage projectId="proj-9" api={api} />);

    await waitFor(() => expect(screen.getByTestId("project-view-characters-grid")).toBeInTheDocument());
    expect(screen.getByTestId("project-view-char-char-1")).toBeInTheDocument();
    expect(screen.getByTestId("project-view-char-char-2")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("project-view-character-search"), { target: { value: "克莱尔" } });
    expect(screen.queryByTestId("project-view-char-char-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("project-view-char-char-2")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("project-view-char-list-btn"));
    expect(screen.getByTestId("project-view-characters-list")).toBeInTheDocument();
    expect(screen.getByTestId("project-view-char-row-char-2")).toBeInTheDocument();
  });

  it("角色为空时显示空状态并可触发添加", async () => {
    const onAddCharacter = vi.fn();
    const api = createMockApi({
      character: {
        list: vi.fn(async () => ({ ok: true as const, data: { items: [] } })),
      },
    });

    render(<ProjectViewPage projectId="proj-9" api={api} onAddCharacter={onAddCharacter} />);

    await waitFor(() => expect(screen.getByTestId("project-view-characters-empty")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("project-view-add-character-empty-btn"));
    expect(onAddCharacter).toHaveBeenCalledWith("proj-9");
  });

  it("角色搜索无匹配时显示 no-match 空态", async () => {
    const api = createMockApi();
    render(<ProjectViewPage projectId="proj-9" api={api} />);

    await waitFor(() => expect(screen.getByTestId("project-view-characters-grid")).toBeInTheDocument());
    fireEvent.change(screen.getByTestId("project-view-character-search"), { target: { value: "不存在角色" } });
    expect(screen.getByTestId("project-view-characters-no-match")).toBeInTheDocument();
  });

  it("角色列表请求失败时进入错误态", async () => {
    const api = createMockApi({
      character: {
        list: vi.fn(async () => ({
          ok: false as const,
          error: { code: "INTERNAL" as const, message: "character list failed" },
        })),
      },
    });

    render(<ProjectViewPage projectId="proj-9" api={api} />);

    await waitFor(() => expect(screen.getByTestId("project-view-error")).toBeInTheDocument());
  });

  it("未知状态和空角色字段走回退文案", async () => {
    const api = createMockApi({
      character: {
        list: vi.fn(async () => ({
          ok: true as const,
          data: {
            items: [
              {
                id: "char-unknown",
                projectId: "proj-9",
                name: "未命名角色",
                description: "",
                attributes: { status: "archived", role: "" },
                createdAt: 0,
                updatedAt: 0,
              },
            ],
          },
        })),
      },
    });

    render(<ProjectViewPage projectId="proj-9" api={api} />);

    await waitFor(() => expect(screen.getByTestId("project-view-char-char-unknown")).toBeInTheDocument());
    expect(screen.getByText("未归类")).toBeInTheDocument();
    expect(screen.getByText("未设置定位")).toBeInTheDocument();
    expect(screen.getByText("尚未填写角色描述")).toBeInTheDocument();
    expect(screen.getByText("1 其他状态")).toBeInTheDocument();
  });

  it("projectId 切换时重置角色搜索条件", async () => {
    const api = createMockApi({
      project: {
        list: vi.fn(async () => ({
          ok: true as const,
          data: {
            items: [
              {
                projectId: "proj-9",
                name: "旧项目",
                rootPath: "/projects/proj-9",
                type: "novel" as const,
                stage: "draft" as const,
                updatedAt: Date.parse("2025-01-01T00:00:00.000Z"),
              },
              {
                projectId: "proj-10",
                name: "新项目",
                rootPath: "/projects/proj-10",
                type: "novel" as const,
                stage: "draft" as const,
                updatedAt: Date.parse("2025-01-02T00:00:00.000Z"),
              },
            ],
          },
        })),
      },
      character: {
        list: vi.fn(async ({ projectId }) => ({
          ok: true as const,
          data: {
            items: projectId === "proj-10"
              ? [
                {
                  id: "char-new",
                  projectId: "proj-10",
                  name: "新角色",
                  description: "切换后角色",
                  attributes: { role: "配角", status: "active" },
                  createdAt: 0,
                  updatedAt: 0,
                },
              ]
              : [
                {
                  id: "char-old",
                  projectId: "proj-9",
                  name: "旧角色",
                  description: "旧项目角色",
                  attributes: { role: "主角", status: "active" },
                  createdAt: 0,
                  updatedAt: 0,
                },
              ],
          },
        })),
      },
    });

    const { rerender } = render(<ProjectViewPage projectId="proj-9" api={api} />);
    await waitFor(() => expect(screen.getByTestId("project-view-char-char-old")).toBeInTheDocument());

    const searchInput = screen.getByTestId("project-view-character-search") as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: "不存在" } });
    expect(screen.getByTestId("project-view-characters-no-match")).toBeInTheDocument();

    rerender(<ProjectViewPage projectId="proj-10" api={api} />);
    await waitFor(() => expect(screen.getByTestId("project-view-char-char-new")).toBeInTheDocument());
    expect((screen.getByTestId("project-view-character-search") as HTMLInputElement).value).toBe("");
  });
});
