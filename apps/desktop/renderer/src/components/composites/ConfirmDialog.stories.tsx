import type { Meta, StoryObj } from "@storybook/react";

import { ConfirmDialog } from "./ConfirmDialog";

const meta: Meta<typeof ConfirmDialog> = {
  title: "Composites/ConfirmDialog",
  component: ConfirmDialog,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof ConfirmDialog>;

export const Neutral: Story = {
  args: {
    open: true,
    title: "删除草稿",
    description: "这份草稿会被移入废纸篓，7 天内可恢复。",
    confirmLabel: "确认删除",
    cancelLabel: "取消",
    tone: "neutral",
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export const Danger: Story = {
  args: {
    open: true,
    title: "清空本章修改",
    description: "当前章节所有未保存的修改都会被放弃，不可撤销。",
    confirmLabel: "放弃修改",
    cancelLabel: "取消",
    tone: "danger",
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export const TypedConfirm: Story = {
  args: {
    open: true,
    title: "确认删除「林远」",
    description: "这是关键节点，删除会牵动多处叙事。",
    confirmLabel: "确认删除",
    cancelLabel: "取消",
    tone: "danger",
    typedConfirmValue: "林远",
    typedConfirmPrompt: "请输入实体名称「林远」以确认删除",
    typedConfirmPlaceholder: "请输入实体名称以解锁删除",
    typedConfirmMismatch: "名称不一致，删除按钮保持锁定。",
    onConfirm: () => {},
    onCancel: () => {},
  },
};
