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

const baseArgs = {
  activeSkill: "builtin:polish" as const,
  busy: false,
  errorMessage: null,
  generateDisabled: false,
  instruction: "润色这段文字，让节奏更紧凑。",
  instructionHint: "已选 21 个字符",
  model: "gpt-4.1-mini",
  onAccept: () => undefined,
  onClearReference: () => undefined,
  onGenerate: () => undefined,
  onInstructionChange: () => undefined,
  onModelChange: () => undefined,
  onReject: () => undefined,
  onSkillChange: () => undefined,
  reference,
};

export const Ready: Story = {
  args: {
    ...baseArgs,
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
    ...baseArgs,
    preview: null,
  },
};

export const Empty: Story = {
  args: {
    ...baseArgs,
    instruction: "",
    generateDisabled: true,
    instructionHint: "先在编辑器中选中一段文字，再请求 AI 建议。",
    preview: null,
    reference: null,
  },
};

export const ContinueMode: Story = {
  args: {
    ...baseArgs,
    activeSkill: "builtin:continue",
    instruction: "",
    instructionHint: "将基于光标前 27 个字符续写。",
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

export const DisabledActions: Story = {
  args: {
    ...Empty.args,
    canContinue: true,
    canPolish: false,
    canRewrite: false,
  },
};
