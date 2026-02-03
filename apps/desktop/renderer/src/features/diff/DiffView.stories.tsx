import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import {
  DiffView,
  UnifiedDiffView,
  parseDiffLines,
  getChangePositions,
} from "./DiffView";
import { DiffViewPanel } from "./DiffViewPanel";
import { DiffHeader, type DiffViewMode, type VersionInfo } from "./DiffHeader";
import { DiffFooter } from "./DiffFooter";
import { SplitDiffView } from "./SplitDiffView";
import {
  MultiVersionCompare,
  type VersionContent,
} from "./MultiVersionCompare";
import { layoutDecorator } from "../../components/layout/test-utils";

/**
 * DiffView 组件 Story
 *
 * 功能：
 * - 显示统一 diff 文本，带语法高亮
 * - 添加行（绿色背景）、删除行（红色背景 + 删除线）
 * - 头部信息（灰色）、上下文行（暗色）
 * - 双列行号（旧/新）
 * - +/- 指示器
 */
const meta = {
  title: "Features/DiffView",
  component: DiffView,
  decorators: [layoutDecorator],
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
@@ -42,15 +42,16 @@

 # The Architecture of Silence

-Intrigued by beauty, fascinated by technology and
-fuelled with an everlasting devotion to digital
-craftsmanship.
+Driven by aesthetics, fascinated by AI and fueled
+with an eternal devotion to digital art.

-Design is not just about making things look good. It is
+Design isn't merely about aesthetics. It is fundamentally
 about how things work. In the digital sphere, this
-translates to the seamless integration of form and
-function.
+translates to the seamless integration of form,
+function, and emotion.

 We build immersive environments where typography
 leads the eye and imagery sets the mood.`;

const mockVersions: VersionInfo[] = [
  { id: "2h", label: "Version from 2h ago", type: "auto" },
  { id: "yesterday", label: "Yesterday, 4:20 PM", type: "manual" },
  { id: "3days", label: "3 days ago", type: "auto" },
  { id: "current", label: "Current Version", type: "current" },
];

/**
 * Legacy DiffView（向后兼容）
 */
export const Default: Story = {
  args: {
    diffText: sampleDiff,
  },
  render: (args) => (
    <div
      style={{
        width: "400px",
        backgroundColor: "var(--color-bg-surface)",
        padding: "16px",
      }}
    >
      <DiffView {...args} />
    </div>
  ),
};

/**
 * 空 diff
 */
export const Empty: Story = {
  args: {
    diffText: "",
  },
  render: (args) => (
    <div
      style={{
        width: "400px",
        backgroundColor: "var(--color-bg-surface)",
        padding: "16px",
      }}
    >
      <DiffView {...args} />
    </div>
  ),
};

/**
 * 完整 DiffViewPanel（统一视图）
 *
 * 包含：Header + UnifiedDiffView + Footer
 */
export const FullPanelUnified: Story = {
  args: {
    diffText: longDiff,
  },
  render: (args) => (
    <div style={{ width: "900px", height: "600px" }}>
      <DiffViewPanel
        diffText={args.diffText}
        versions={mockVersions}
        initialViewMode="unified"
        onClose={() => console.log("Close clicked")}
        onRestore={() => console.log("Restore clicked")}
      />
    </div>
  ),
};

/**
 * 完整 DiffViewPanel（分屏视图）
 *
 * 包含：Header + SplitDiffView + Footer
 */
export const FullPanelSplit: Story = {
  args: {
    diffText: longDiff,
  },
  render: (args) => (
    <div style={{ width: "1100px", height: "600px" }}>
      <DiffViewPanel
        diffText={args.diffText}
        versions={mockVersions}
        initialViewMode="split"
        onClose={() => console.log("Close clicked")}
        onRestore={() => console.log("Restore clicked")}
      />
    </div>
  ),
};

/**
 * UnifiedDiffView 组件
 *
 * 带双列行号和 +/- 指示器
 */
export const UnifiedViewOnly: Story = {
  args: {
    diffText: longDiff,
  },
  render: (args) => {
    const { lines } = parseDiffLines(args.diffText);
    const changePositions = getChangePositions(lines);
    return (
      <div
        style={{ width: "700px", height: "400px" }}
        className="bg-[var(--color-bg-surface)] border border-[var(--color-separator)] rounded-lg overflow-hidden"
      >
        <UnifiedDiffView
          lines={lines}
          currentChangeIndex={0}
          changePositions={changePositions}
        />
      </div>
    );
  },
};

/**
 * SplitDiffView 组件
 *
 * 左右分屏 Before/After 视图
 */
export const SplitViewOnly: Story = {
  args: {
    diffText: longDiff,
  },
  render: (args) => {
    const { lines } = parseDiffLines(args.diffText);
    return (
      <div
        style={{ width: "900px", height: "400px" }}
        className="bg-[var(--color-bg-surface)] border border-[var(--color-separator)] rounded-lg overflow-hidden flex flex-col"
      >
        <SplitDiffView lines={lines} />
      </div>
    );
  },
};

/**
 * DiffHeader 组件
 *
 * 版本选择、视图切换、导航
 */
export const HeaderOnly: Story = {
  args: {
    diffText: sampleDiff,
  },
  render: () => <HeaderOnlyDemo />,
};

function HeaderOnlyDemo(): JSX.Element {
  const [viewMode, setViewMode] = React.useState<DiffViewMode>("unified");
  const [currentChange, setCurrentChange] = React.useState(2);
  const [beforeVersion, setBeforeVersion] = React.useState("2h");

  return (
    <div style={{ width: "900px" }} className="bg-[var(--color-bg-surface)]">
      <DiffHeader
        versions={mockVersions}
        selectedBeforeVersion={beforeVersion}
        selectedAfterVersion="current"
        onBeforeVersionChange={setBeforeVersion}
        onAfterVersionChange={() => {}}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currentChangeIndex={currentChange}
        totalChanges={12}
        onPreviousChange={() => setCurrentChange((c) => Math.max(0, c - 1))}
        onNextChange={() => setCurrentChange((c) => Math.min(11, c + 1))}
        onClose={() => console.log("Close clicked")}
      />
    </div>
  );
}

/**
 * DiffFooter 组件
 *
 * 统计信息和操作按钮
 */
export const FooterOnly: Story = {
  args: {
    diffText: sampleDiff,
  },
  render: () => (
    <div style={{ width: "900px" }} className="bg-[var(--color-bg-surface)]">
      <DiffFooter
        stats={{ addedLines: 42, removedLines: 18, changedHunks: 3 }}
        onClose={() => console.log("Close clicked")}
        onRestore={() => console.log("Restore clicked")}
      />
    </div>
  ),
};

/**
 * 交互演示
 *
 * 完整交互式面板
 */
export const InteractiveDemo: Story = {
  args: {
    diffText: longDiff,
  },
  render: (args) => <InteractiveDemoComponent diffText={args.diffText} />,
};

function InteractiveDemoComponent(props: { diffText: string }): JSX.Element {
  const [isOpen, setIsOpen] = React.useState(true);
  const [restoreInProgress, setRestoreInProgress] = React.useState(false);

  const handleRestore = (): void => {
    setRestoreInProgress(true);
    setTimeout(() => {
      setRestoreInProgress(false);
      alert("Restore complete!");
    }, 1500);
  };

  if (!isOpen) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-[var(--color-accent)] text-white rounded"
        >
          Open Diff View
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "1000px", height: "650px" }}>
      <DiffViewPanel
        diffText={props.diffText}
        versions={mockVersions}
        initialViewMode="unified"
        onClose={() => setIsOpen(false)}
        onRestore={handleRestore}
        restoreInProgress={restoreInProgress}
      />
    </div>
  );
}

/**
 * 仅添加
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
    <div style={{ width: "700px", height: "300px" }}>
      <DiffViewPanel
        diffText={args.diffText}
        versions={mockVersions}
        initialViewMode="unified"
      />
    </div>
  ),
};

/**
 * 仅删除
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
    <div style={{ width: "700px", height: "300px" }}>
      <DiffViewPanel
        diffText={args.diffText}
        versions={mockVersions}
        initialViewMode="unified"
      />
    </div>
  ),
};

// =============================================================================
// Multi-Version Compare Stories
// =============================================================================

const sampleContent1 = `# The Architecture of Silence

Intrigued by beauty, fascinated by technology and
fuelled with an everlasting devotion to digital
craftsmanship.

Design is not just about making things look good. It is
about how things work. In the digital realm, this
translates to the seamless integration of form and
function.

We build immersive environments where typography
leads the eye and imagery sets the mood.`;

const sampleContent2 = `# The Architecture of Silence

Driven by aesthetics, fascinated by AI and fueled
with an eternal devotion to digital art.

Design isn't merely about aesthetics. It is fundamentally
about how things work. In the digital sphere, this
translates to the seamless integration of form,
function, and emotion.

We build immersive environments where typography
leads the eye and imagery sets the mood.`;

const sampleContent3 = `# The Architecture of Silence

Driven by creativity, empowered by AI and fueled
with passion for digital excellence.

Design transcends mere aesthetics. It fundamentally
shapes how things work. In our digital world, this
means perfect harmony between form, function,
and human emotion.

We craft immersive experiences where typography
guides the eye and imagery evokes emotion.`;

const sampleContent4 = `# The Architecture of Silence

Inspired by creativity, enhanced by AI and fueled
with dedication to digital craftsmanship.

Design is the bridge between aesthetics and function.
In our increasingly digital world, this translates to
the seamless fusion of form, utility, and emotional
resonance.

We create immersive journeys where typography
leads and imagery speaks.`;

const multiVersions: VersionContent[] = [
  {
    id: "v1",
    label: "Original (3 days ago)",
    content: sampleContent1,
    type: "manual",
  },
  {
    id: "v2",
    label: "Version 2 (Yesterday)",
    content: sampleContent2,
    type: "auto",
  },
  {
    id: "v3",
    label: "Version 3 (2h ago)",
    content: sampleContent3,
    type: "auto",
  },
  {
    id: "v4",
    label: "Current Version",
    content: sampleContent4,
    type: "current",
  },
];

/**
 * 多版本对比 - 2 个版本
 */
export const MultiVersion2: Story = {
  args: {
    diffText: sampleDiff,
  },
  render: () => (
    <div style={{ width: "900px", height: "500px" }}>
      <MultiVersionCompare
        versions={multiVersions.slice(0, 2)}
        onClose={() => console.log("Close clicked")}
      />
    </div>
  ),
};

/**
 * 多版本对比 - 3 个版本
 */
export const MultiVersion3: Story = {
  args: {
    diffText: sampleDiff,
  },
  render: () => (
    <div style={{ width: "900px", height: "600px" }}>
      <MultiVersionCompare
        versions={multiVersions.slice(0, 3)}
        onClose={() => console.log("Close clicked")}
      />
    </div>
  ),
};

/**
 * 多版本对比 - 4 个版本（2x2 网格）
 */
export const MultiVersion4: Story = {
  args: {
    diffText: sampleDiff,
  },
  render: () => (
    <div style={{ width: "900px", height: "600px" }}>
      <MultiVersionCompare
        versions={multiVersions}
        onClose={() => console.log("Close clicked")}
      />
    </div>
  ),
};

/**
 * 多版本对比 - 无同步滚动
 */
export const MultiVersionNoSync: Story = {
  args: {
    diffText: sampleDiff,
  },
  render: () => (
    <div style={{ width: "900px", height: "600px" }}>
      <MultiVersionCompare
        versions={multiVersions}
        syncScroll={false}
        onClose={() => console.log("Close clicked")}
      />
    </div>
  ),
};
