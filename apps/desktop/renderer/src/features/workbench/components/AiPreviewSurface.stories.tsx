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
    canContinue: true,
    canPolish: true,
    canRewrite: true,
    errorMessage: null,
    instruction: "润色这段文字，让节奏更紧凑。",
    model: "gpt-4.1-mini",
    onAccept: () => undefined,
    onClearReference: () => undefined,
    onInstructionChange: () => undefined,
    onLaunchSkill: () => undefined,
    onModelChange: () => undefined,
    onReject: () => undefined,
    reference,
    preview: {
      context: { documentId: "doc-demo", projectId: "project-demo", revision: 1 },
      executionId: "exec-demo",
      originalText: reference.text,
      runId: "run-demo",
      selection: reference,
      skill: "polish",
      sourceUserEditRevision: 1,
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
    canPolish: false,
    canRewrite: false,
    instruction: "",
    preview: null,
    reference: null,
  },
};

export const ContinuePreview: Story = {
  args: {
    ...Empty.args,
    preview: {
      context: { documentId: "doc-demo", projectId: "project-demo", revision: 1 },
      executionId: "exec-continue",
      originalText: "",
      runId: "run-continue",
      selection: null,
      skill: "continue",
      sourceUserEditRevision: 1,
      suggestedText: "她抬头望见远处灯火，忽然意识到这一夜还远未结束。",
    },
  },
};

export const Loading: Story = {
  args: {
    ...ReferenceOnly.args,
    busy: true,
    canContinue: false,
    canPolish: false,
    canRewrite: false,
  },
};

export const ErrorState: Story = {
  args: {
    ...ReferenceOnly.args,
    errorMessage: "AI 服务暂时不可用，请稍后再试。",
  },
};

/** rewrite 可触发（canRewrite=true）但指令为空 → 仅用于视觉验收截图 */
export const RewriteEmptyInstructionDisabled: Story = {
  args: {
    ...ReferenceOnly.args,
    canContinue: false,
    canPolish: false,
    canRewrite: true,
    instruction: "",
  },
};
