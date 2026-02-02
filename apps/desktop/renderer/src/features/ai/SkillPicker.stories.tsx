import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { SkillPicker } from "./SkillPicker";

/**
 * SkillPicker 组件 Story
 *
 * 功能：
 * - 技能列表弹窗
 * - 选中/禁用状态
 * - 点击选择
 */
const meta: Meta<typeof SkillPicker> = {
  title: "Features/SkillPicker",
  component: SkillPicker,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    open: {
      control: "boolean",
      description: "Whether the picker is open",
    },
    selectedSkillId: {
      control: "text",
      description: "Currently selected skill ID",
    },
  },
  args: {
    onOpenChange: fn(),
    onSelectSkillId: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SkillPicker>;

const sampleSkills = [
  { id: "default", name: "Default", enabled: true, valid: true, scope: "global" as const, packageId: "pkg-1", version: "1.0.0" },
  { id: "rewrite", name: "Rewrite", enabled: true, valid: true, scope: "global" as const, packageId: "pkg-2", version: "1.0.0" },
  { id: "summarize", name: "Summarize", enabled: true, valid: true, scope: "project" as const, packageId: "pkg-3", version: "1.0.0" },
  { id: "disabled-skill", name: "Disabled Skill", enabled: false, valid: true, scope: "global" as const, packageId: "pkg-4", version: "1.0.0" },
  { id: "invalid-skill", name: "Invalid Skill", enabled: true, valid: false, scope: "global" as const, packageId: "pkg-5", version: "1.0.0" },
];

/**
 * 打开状态
 *
 * 技能选择器打开
 */
export const Open: Story = {
  args: {
    open: true,
    items: sampleSkills,
    selectedSkillId: "default",
  },
  render: (args) => (
    <div style={{ position: "relative", width: "300px", height: "400px" }}>
      <SkillPicker {...args} />
    </div>
  ),
};

/**
 * 关闭状态
 *
 * 技能选择器关闭（不渲染）
 */
export const Closed: Story = {
  args: {
    open: false,
    items: sampleSkills,
    selectedSkillId: "default",
  },
  render: (args) => (
    <div style={{ position: "relative", width: "300px", height: "400px" }}>
      <SkillPicker {...args} />
      <div style={{ padding: "20px", color: "var(--color-fg-muted)" }}>
        Picker is closed (nothing rendered)
      </div>
    </div>
  ),
};

/**
 * 选中其他技能
 *
 * 选中 Rewrite 技能
 */
export const SelectedRewrite: Story = {
  args: {
    open: true,
    items: sampleSkills,
    selectedSkillId: "rewrite",
  },
  render: (args) => (
    <div style={{ position: "relative", width: "300px", height: "400px" }}>
      <SkillPicker {...args} />
    </div>
  ),
};

/**
 * 空列表
 *
 * 无技能可选
 */
export const EmptyList: Story = {
  args: {
    open: true,
    items: [],
    selectedSkillId: "",
  },
  render: (args) => (
    <div style={{ position: "relative", width: "300px", height: "200px" }}>
      <SkillPicker {...args} />
    </div>
  ),
};

/**
 * 多项禁用
 *
 * 多个技能禁用或无效
 */
export const ManyDisabled: Story = {
  args: {
    open: true,
    items: [
      { id: "enabled", name: "Enabled Skill", enabled: true, valid: true, scope: "global" as const, packageId: "pkg-1", version: "1.0.0" },
      { id: "disabled-1", name: "Disabled 1", enabled: false, valid: true, scope: "global" as const, packageId: "pkg-2", version: "1.0.0" },
      { id: "disabled-2", name: "Disabled 2", enabled: false, valid: true, scope: "global" as const, packageId: "pkg-3", version: "1.0.0" },
      { id: "invalid-1", name: "Invalid 1", enabled: true, valid: false, scope: "global" as const, packageId: "pkg-4", version: "1.0.0" },
      { id: "invalid-2", name: "Invalid 2", enabled: true, valid: false, scope: "global" as const, packageId: "pkg-5", version: "1.0.0" },
    ],
    selectedSkillId: "enabled",
  },
  render: (args) => (
    <div style={{ position: "relative", width: "300px", height: "400px" }}>
      <SkillPicker {...args} />
    </div>
  ),
};
