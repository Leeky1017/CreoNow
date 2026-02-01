import type { Meta, StoryObj } from "@storybook/react";
import { DiffView } from "./DiffView";

/**
 * DiffView 组件 Story
 *
 * 功能：
 * - 显示统一 diff 文本
 * - 代码样式渲染
 */
const meta = {
  title: "Features/DiffView",
  component: DiffView,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    diffText: {
      control: "text",
      description: "Unified diff text to display",
    },
  },
} satisfies Meta<typeof DiffView>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleDiff = `--- a/file.txt
+++ b/file.txt
@@ -1,5 +1,5 @@
 Line 1
-Line 2 (old)
+Line 2 (new)
 Line 3
 Line 4
 Line 5`;

const longDiff = `--- a/document.md
+++ b/document.md
@@ -1,15 +1,15 @@
 # Document Title
 
-This is the old introduction paragraph.
+This is the new introduction paragraph with improvements.
 
 ## Section 1
 
-Content of section 1.
+Updated content of section 1 with more details.
 
 ## Section 2
 
-Old section 2 content.
+New section 2 content that is much better.
 
 ## Conclusion
 
-Old conclusion.
+New and improved conclusion.`;

/**
 * 默认状态
 *
 * 简单 diff 示例
 */
export const Default: Story = {
  args: {
    diffText: sampleDiff,
  },
  render: (args) => (
    <div style={{ width: "400px", backgroundColor: "var(--color-bg-surface)", padding: "16px" }}>
      <DiffView {...args} />
    </div>
  ),
};

/**
 * 空 diff
 *
 * 无差异时的状态
 */
export const Empty: Story = {
  args: {
    diffText: "",
  },
  render: (args) => (
    <div style={{ width: "400px", backgroundColor: "var(--color-bg-surface)", padding: "16px" }}>
      <DiffView {...args} />
    </div>
  ),
};

/**
 * 长 diff
 *
 * 较长的差异内容
 */
export const LongDiff: Story = {
  args: {
    diffText: longDiff,
  },
  render: (args) => (
    <div style={{ width: "500px", backgroundColor: "var(--color-bg-surface)", padding: "16px" }}>
      <DiffView {...args} />
    </div>
  ),
};

/**
 * 窄宽度
 *
 * 最小宽度下的布局
 */
export const NarrowWidth: Story = {
  args: {
    diffText: sampleDiff,
  },
  render: (args) => (
    <div style={{ width: "280px", backgroundColor: "var(--color-bg-surface)", padding: "16px" }}>
      <DiffView {...args} />
    </div>
  ),
};

/**
 * 宽布局
 *
 * 较宽容器下的布局
 */
export const WideWidth: Story = {
  args: {
    diffText: longDiff,
  },
  render: (args) => (
    <div style={{ width: "800px", backgroundColor: "var(--color-bg-surface)", padding: "16px" }}>
      <DiffView {...args} />
    </div>
  ),
};

/**
 * 仅添加
 *
 * 只有添加行的 diff
 */
export const OnlyAdditions: Story = {
  args: {
    diffText: `--- a/new.txt
+++ b/new.txt
@@ -0,0 +1,3 @@
+Line 1
+Line 2
+Line 3`,
  },
  render: (args) => (
    <div style={{ width: "400px", backgroundColor: "var(--color-bg-surface)", padding: "16px" }}>
      <DiffView {...args} />
    </div>
  ),
};

/**
 * 仅删除
 *
 * 只有删除行的 diff
 */
export const OnlyDeletions: Story = {
  args: {
    diffText: `--- a/old.txt
+++ b/old.txt
@@ -1,3 +0,0 @@
-Line 1
-Line 2
-Line 3`,
  },
  render: (args) => (
    <div style={{ width: "400px", backgroundColor: "var(--color-bg-surface)", padding: "16px" }}>
      <DiffView {...args} />
    </div>
  ),
};
