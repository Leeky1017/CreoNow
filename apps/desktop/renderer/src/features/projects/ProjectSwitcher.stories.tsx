import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn, userEvent, within } from "@storybook/test";

import type { ProjectListItem } from "../../stores/projectStore";
import { ProjectSwitcher, type ProjectSwitcherProps } from "./ProjectSwitcher";

const STORY_PROJECTS: ProjectListItem[] = [
  {
    projectId: "story-borealis",
    name: "Borealis",
    rootPath: "/projects/borealis",
    type: "screenplay",
    updatedAt: Date.now() - 3 * 60_000,
  },
  {
    projectId: "story-atlas",
    name: "Atlas",
    rootPath: "/projects/atlas",
    type: "novel",
    updatedAt: Date.now() - 15 * 60_000,
  },
  {
    projectId: "story-comet",
    name: "Comet",
    rootPath: "/projects/comet",
    type: "media",
    updatedAt: Date.now() - 60 * 60_000,
  },
];

/**
 * Use local state so Storybook can show selected project changes after switch.
 */
function StatefulProjectSwitcher(args: ProjectSwitcherProps): JSX.Element {
  const [currentProjectId, setCurrentProjectId] = React.useState(
    args.currentProjectId,
  );

  React.useEffect(() => {
    setCurrentProjectId(args.currentProjectId);
  }, [args.currentProjectId]);

  return (
    <div
      className="w-[320px] rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-base)] p-3"
      data-testid="project-switcher-story-wrapper"
    >
      <ProjectSwitcher
        {...args}
        currentProjectId={currentProjectId}
        onSwitch={async (projectId) => {
          await Promise.resolve(args.onSwitch(projectId));
          setCurrentProjectId(projectId);
        }}
      />
    </div>
  );
}

const meta: Meta<typeof ProjectSwitcher> = {
  title: "Features/Projects/ProjectSwitcher",
  component: ProjectSwitcher,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    currentProjectId: "story-atlas",
    projects: STORY_PROJECTS,
    onSwitch: fn(),
    onCreateProject: fn(),
  },
  render: (args) => <StatefulProjectSwitcher {...args} />,
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 展开态（有项目列表）
 */
export const Expanded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("project-switcher-trigger"));
  },
};

/**
 * 搜索态（过滤结果）
 */
export const Search: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("project-switcher-trigger"));
    await userEvent.type(canvas.getByTestId("project-switcher-search"), "at");
  },
};

/**
 * 空态（无项目 + 创建入口）
 */
export const Empty: Story = {
  args: {
    currentProjectId: null,
    projects: [],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("project-switcher-trigger"));
  },
};
