import type { Meta, StoryObj } from "@storybook/react";

import { EditorSelectionToolbar } from "@/features/workbench/components/EditorSelectionToolbar";

const meta = {
  title: "Workbench/Editor Selection Toolbar",
  component: EditorSelectionToolbar,
  args: {
    anchor: {
      bottom: 228,
      left: 640,
      top: 200,
    },
    busy: false,
    selectionKey: "16:32:toolbar-selection",
    onChangeTone: () => {},
    onFixGrammar: () => {},
    onPolish: () => {},
    onSubmitInstruction: () => {},
    visible: true,
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof EditorSelectionToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Busy: Story = {
  args: {
    busy: true,
  },
};

export const Prompting: Story = {
  args: {
    defaultPromptOpen: true,
  },
};

export const Hidden: Story = {
  args: {
    visible: false,
  },
};
