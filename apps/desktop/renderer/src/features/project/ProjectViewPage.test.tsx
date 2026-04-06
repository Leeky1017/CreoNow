import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProjectViewPage } from "./ProjectViewPage";
import type { ProjectData } from "./mockData";

const project: ProjectData = {
  id: "proj-9",
  title: "霜桥",
  type: "novel",
  draftNumber: 2,
  createdAt: "2025-01-01T00:00:00.000Z",
  totalWords: 12000,
  chapterCount: 3,
  characterCount: 2,
  locationCount: 1,
  documents: [
    { id: "doc-1", title: "第一章", wordCount: 3000 },
    { id: "doc-2", title: "第二章", wordCount: 4000 },
  ],
  characters: [
    { id: "c1", name: "林溪", role: "主角" },
    { id: "c2", name: "沈砚", role: "配角" },
  ],
};

describe("ProjectViewPage", () => {
  it("点击编辑/设置按钮触发项目动作", () => {
    const onEditProject = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <ProjectViewPage
        project={project}
        onEditProject={onEditProject}
        onOpenSettings={onOpenSettings}
      />,
    );

    fireEvent.click(screen.getByTestId("project-view-edit-btn"));
    fireEvent.click(screen.getByTestId("project-view-settings-btn"));

    expect(onEditProject).toHaveBeenCalledWith("proj-9");
    expect(onOpenSettings).toHaveBeenCalledWith("proj-9");
  });

  it("文档条目点击与键盘回车都可打开文档", () => {
    const onOpenDocument = vi.fn();

    render(<ProjectViewPage project={project} onOpenDocument={onOpenDocument} />);

    fireEvent.click(screen.getByTestId("project-view-doc-doc-1"));
    fireEvent.keyDown(screen.getByTestId("project-view-doc-doc-2"), { key: "Enter" });

    expect(onOpenDocument).toHaveBeenCalledTimes(2);
    expect(onOpenDocument).toHaveBeenNthCalledWith(1, "doc-1");
    expect(onOpenDocument).toHaveBeenNthCalledWith(2, "doc-2");
  });

  it("添加角色按钮触发项目级回调", () => {
    const onAddCharacter = vi.fn();

    render(<ProjectViewPage project={project} onAddCharacter={onAddCharacter} />);

    fireEvent.click(screen.getByTestId("project-view-add-character-btn"));

    expect(onAddCharacter).toHaveBeenCalledTimes(1);
    expect(onAddCharacter).toHaveBeenCalledWith("proj-9");
  });
});
