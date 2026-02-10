# Proposal: issue-393-editor-p0-tiptap-foundation-toolbar

## Why

`editor-p0-tiptap-foundation-toolbar` 是 Editor 泳道的基础变更。当前实现缺少对 `@tiptap/extension-underline` 的集成、工具栏 active 状态同步与可验证的 Red→Green 证据链，无法满足 OpenSpec 对 P0 的完整交付要求。

## What Changes

- 补齐 TipTap P0 基础能力：StarterKit + Underline 扩展、工具栏状态同步、粘贴内容清洗。
- 按 Scenario 建立并执行 TDD：工具栏/快捷键、IPC bootstrap、autosave 状态机与 suppress 路径。
- 补齐 Dependency Sync Check、RUN_LOG、change 勾选与归档、Rulebook 收口。
- 通过 PR auto-merge 完成 `main` 收口并清理 worktree。

## Impact

- Affected specs:
  - `openspec/changes/editor-p0-tiptap-foundation-toolbar/specs/editor-delta.md`
  - `openspec/changes/editor-p0-tiptap-foundation-toolbar/tasks.md`
- Affected code:
  - `apps/desktop/renderer/src/features/editor/*`
  - `apps/desktop/renderer/src/stores/editorStore.tsx`
  - `apps/desktop/renderer/src/config/shortcuts.ts`
- Breaking change: NO
- User benefit: 编辑器基础格式化、保存链路与状态反馈行为可预测，后续 Editor P1~P4 建设可直接复用稳定基线。
