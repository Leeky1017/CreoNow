# Proposal: issue-400-editor-p1-bubble-menu-outline

## Why

`openspec/changes/editor-p1-bubble-menu-outline` 已定义 Bubble Menu 与 Outline 的核心交互要求，但当前实现仅覆盖了 `editor-p0` 基础能力，缺少 Bubble Menu 和与之对应的 Scenario 测试/Storybook 证据。若继续推进后续 editor change，会把高频编辑交互缺口带入下游，导致体验与规范不一致。

## What Changes

- 以 TDD 方式补齐 Bubble Menu 能力：
  - 非空选区显示，折叠选区/Code Block/只读隐藏。
  - 默认上方定位，空间不足翻转到下方。
  - 动作集：Bold、Italic、Underline、Strikethrough、Inline Code、Link。
  - 与固定 `EditorToolbar` 的 inline active 状态保持同步。
- 对照 change 的 9 个 Scenario，补齐或调整测试覆盖与 Red/Green 证据。
- 补齐 Storybook 场景：
  - Bubble Menu: visible / active / hidden
  - OutlinePanel: default / empty / search / drag-and-drop / multi-select
- 完成 RUN_LOG、preflight、PR auto-merge、change 归档、Rulebook task 归档以及控制面 `main` 收口。

## Impact

- Affected specs:
  - `openspec/changes/editor-p1-bubble-menu-outline/proposal.md`
  - `openspec/changes/editor-p1-bubble-menu-outline/specs/editor-delta.md`
  - `openspec/changes/editor-p1-bubble-menu-outline/tasks.md`
- Affected code:
  - `apps/desktop/renderer/src/features/editor/EditorPane.tsx`
  - `apps/desktop/renderer/src/features/editor/EditorToolbar.tsx`
  - `apps/desktop/renderer/src/features/editor/EditorPane.test.tsx`
  - `apps/desktop/renderer/src/features/editor/EditorToolbar.test.tsx`
  - `apps/desktop/renderer/src/features/outline/*`（仅针对 Scenario 差异最小修正）
  - `apps/desktop/renderer/src/features/editor/*.stories.tsx`
- Breaking change: NO（在现有编辑器行为上增量补齐）
- User benefit: 编辑时可就近格式化并获得可导航大纲，核心创作效率链路与 OpenSpec 一致。
