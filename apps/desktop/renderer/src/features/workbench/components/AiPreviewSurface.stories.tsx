import type { Meta, StoryObj } from "@storybook/react";

import { AiPreviewSurface } from "@/features/workbench/components/AiPreviewSurface";

const meta: Meta<typeof AiPreviewSurface> = {
  title: "Workbench/AiPreviewSurface",
  component: AiPreviewSurface,
};

export default meta;

type Story = StoryObj<typeof AiPreviewSurface>;

export const Ready: Story = {
  args: {
    busy: false,
    errorMessage: null,
    instruction: "润色这段文字，让节奏更紧凑。",
    model: "gpt-4.1-mini",
    onAccept: () => undefined,
    onGenerate: () => undefined,
    onInstructionChange: () => undefined,
    onModelChange: () => undefined,
    onReject: () => undefined,
    selection: {
      from: 1,
      to: 12,
      text: "风从北方来，带着草原上最后一丝温暖。",
      selectionTextHash: "demo",
    },
    preview: {
      originalText: "风从北方来，带着草原上最后一丝温暖。",
      runId: "run-demo",
      selection: {
        from: 1,
        to: 12,
        text: "风从北方来，带着草原上最后一丝温暖。",
        selectionTextHash: "demo",
      },
      suggestedText: "北地的风掠过山谷，把草原残存的暖意吹成一声轻而冷的叹息。",
    },
  },
};
