import type { Meta, StoryObj } from "@storybook/react";

import { DashboardPage } from "./DashboardPage";
import { mockProjects } from "./mockData";

const meta: Meta<typeof DashboardPage> = {
  title: "Features/Dashboard",
  component: DashboardPage,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof DashboardPage>;

export const Default: Story = {
  args: {
    projects: mockProjects,
  },
};

export const Empty: Story = {
  args: {
    projects: [],
  },
};

export const SingleProject: Story = {
  args: {
    projects: [mockProjects[0]],
  },
};

export const Switching: Story = {
  args: {
    projects: mockProjects,
    disabled: true,
    progressActive: true,
  },
};

export const SwitchRetry: Story = {
  args: {
    projects: mockProjects,
    error: "Project switch timed out. Retry to restore the target project context.",
    onRetryError: () => {},
  },
};
