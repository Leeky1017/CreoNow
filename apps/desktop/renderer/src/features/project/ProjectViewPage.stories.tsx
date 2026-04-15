import type { Meta, StoryObj } from "@storybook/react";

import { ProjectViewPage } from "./ProjectViewPage";
import type { PreloadApi } from "@/lib/preloadApi";

const meta: Meta<typeof ProjectViewPage> = {
  title: "Features/ProjectView",
  component: ProjectViewPage,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof ProjectViewPage>;

function createStoryApi(options?: { emptyCharacters?: boolean }): PreloadApi {
  return {
    project: {
      list: async () => ({
        ok: true as const,
        data: {
          items: [
            {
              projectId: "proj-1",
              name: "深渊档案",
              rootPath: "/projects/proj-1",
              type: "novel" as const,
              stage: "draft" as const,
              updatedAt: Date.now(),
              archivedAt: null,
            },
          ],
        },
      }),
    } as unknown as PreloadApi["project"],
    file: {
      listDocuments: async () => ({
        ok: true as const,
        data: {
          items: [
            { documentId: "doc-1", title: "第一章", sortOrder: 0, status: "draft" as const, type: "chapter" as const, updatedAt: Date.now() },
            { documentId: "doc-2", title: "第二章", sortOrder: 1, status: "draft" as const, type: "chapter" as const, updatedAt: Date.now() },
          ],
        },
      }),
    } as unknown as PreloadApi["file"],
    character: {
      list: async () => ({
        ok: true as const,
        data: {
          items: options?.emptyCharacters
            ? []
            : [
              {
                id: "char-1",
                projectId: "proj-1",
                name: "零号",
                description: "前特种部队成员，现为地下情报商。",
                attributes: { role: "主角", status: "active" },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
              {
                id: "char-2",
                projectId: "proj-1",
                name: "克莱尔",
                description: "天才黑客，负责情报破解。",
                attributes: { role: "关键配角", status: "draft" },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            ],
        },
      }),
    } as unknown as PreloadApi["character"],
    ai: {} as PreloadApi["ai"],
    version: {} as PreloadApi["version"],
    location: {} as PreloadApi["location"],
    search: {} as PreloadApi["search"],
  };
}

export const Default: Story = {
  args: {
    projectId: "proj-1",
    api: createStoryApi(),
  },
};

export const EmptyCharacters: Story = {
  args: {
    projectId: "proj-1",
    api: createStoryApi({ emptyCharacters: true }),
  },
};
