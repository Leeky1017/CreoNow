import type { Meta, StoryObj } from "@storybook/react";

import { ProjectViewPage } from "./ProjectViewPage";
import { mockProject } from "./mockData";

const meta: Meta<typeof ProjectViewPage> = {
  title: "Features/ProjectView",
  component: ProjectViewPage,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof ProjectViewPage>;

export const Default: Story = {
  args: {
    project: mockProject,
  },
};

export const MinimalProject: Story = {
  args: {
    project: {
      ...mockProject,
      documents: [mockProject.documents[0]],
      characters: [mockProject.characters[0]],
      chapterCount: 1,
      characterCount: 1,
      totalWords: 2340,
    },
  },
};
