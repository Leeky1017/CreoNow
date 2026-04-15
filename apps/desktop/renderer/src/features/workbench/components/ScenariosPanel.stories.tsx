import type { Meta, StoryObj } from "@storybook/react";

import { ScenariosPanel } from "./ScenariosPanel";

const meta: Meta<typeof ScenariosPanel> = {
  title: "Workbench/ScenariosPanel",
  component: ScenariosPanel,
  args: {
    activeScenarioId: "novel",
    errorMessage: null,
    onRetry: () => undefined,
    onSelectScenario: () => undefined,
    status: "ready",
    scenarios: [
      {
        id: "novel",
        labelKey: "scenario.novel",
        description: "章节级长线叙事与角色冲突主导。",
        profileKey: "sidebar.scenarios.profile.novel",
      },
      {
        id: "script",
        labelKey: "scenario.script",
        description: "场次切换与对白节奏优先。",
        profileKey: "sidebar.scenarios.profile.script",
      },
      {
        id: "social",
        labelKey: "scenario.social",
        description: "传播导向短文与结构化选题。",
        profileKey: "sidebar.scenarios.profile.social",
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof ScenariosPanel>;

export const Ready: Story = {};

export const Loading: Story = {
  args: {
    status: "loading",
  },
};

export const ErrorState: Story = {
  args: {
    status: "error",
    errorMessage: "scenario service unavailable",
  },
};

export const Empty: Story = {
  args: {
    scenarios: [],
  },
};
