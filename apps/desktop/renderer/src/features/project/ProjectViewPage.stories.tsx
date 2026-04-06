import type { Meta, StoryObj } from "@storybook/react";

import { ProjectViewPage } from "./ProjectViewPage";

const meta: Meta<typeof ProjectViewPage> = {
  title: "Features/ProjectView",
  component: ProjectViewPage,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof ProjectViewPage>;

export const Default: Story = {
  args: {
    projectId: "proj-1",
  },
};

export const MinimalProject: Story = {
  args: {
    projectId: "proj-minimal",
  },
};
