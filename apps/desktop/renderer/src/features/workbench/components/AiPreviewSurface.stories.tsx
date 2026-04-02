import type { Meta, StoryObj } from "@storybook/react";

import { AiPreviewSurface } from "@/features/workbench/components/AiPreviewSurface";

const meta: Meta<typeof AiPreviewSurface> = {
  title: "Workbench/AiPreviewSurface",
  component: AiPreviewSurface,
};

export default meta;

type Story = StoryObj<typeof AiPreviewSurface>;

const reference = {
  from: 1,
  to: 12,
  text: "风从北方来，带着草原上最后一丝温暖。",
  selectionTextHash: "demo",
};

export const Ready: Story = {
  args: {
    busy: false,
    errorMessage: null,
    instruction: "润色这段文字，让节奏更紧凑。",
    model: "gpt-4.1-mini",
    onAccept: () => undefined,
    onClearReference: () => undefined,
    onGenerate: () => undefined,
    onInstructionChange: () => undefined,
    onModelChange: () => undefined,
    onReject: () => undefined,
    reference,
    preview: {
      context: { documentId: "doc-demo", projectId: "project-demo", revision: 1 },
      executionId: "exec-demo",
      originalText: reference.text,
      runId: "run-demo",
      selection: reference,
      suggestedText: "北地的风掠过山谷，把草原残存的暖意吹成一声轻而冷的叹息。",
    },
  },
};

export const ReferenceOnly: Story = {
  args: {
    ...Ready.args,
    preview: null,
  },
};

export const Empty: Story = {
  args: {
    ...Ready.args,
    preview: null,
    reference: null,
  },
};

export const Loading: Story = {
  args: {
    ...ReferenceOnly.args,
    busy: true,
  },
};

export const ErrorState: Story = {
  args: {
    ...ReferenceOnly.args,
    errorMessage: "AI 服务暂时不可用，请稍后再试。",
  },
};
