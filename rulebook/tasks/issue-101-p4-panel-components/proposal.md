# Proposal: issue-101-p4-panel-components

## Why

Phase 4 面板组件的 Story/测试需要可持续维护、可在 CI 中稳定通过并支持浏览器验证；当前分支存在 `@ts-nocheck` 规避类型检查、FileTreePanel Rename 输入框溢出、以及 Radix Trigger 因 ref 未转发导致的运行时告警/交互不稳定。与此同时，`storybook-static/` 构建产物被误纳入版本控制，影响 PR 体积与可读性。

## What Changes

- 修复 `FileTreePanel`：Rename 输入框不再溢出；Rename/Delete 通过右键 ContextMenu 与 `⋯` 菜单提供（不再 inline）。
- 设计系统层：`Button`/`ListItem` 改为 `forwardRef` 以满足 Radix `asChild` 触发器的 ref 需求；新增 `ContextMenu` primitive。
- Story/Test 质量：移除 Phase 4 面板组件 Story/Test 中的 `@ts-nocheck`，补齐类型与 mocks，使 `typecheck/lint/test` 全绿。
- 工程卫生：从 git 中移除 `apps/desktop/storybook-static/`，并在 `.gitignore` 中忽略该构建产物。

## Impact

- Affected specs:
  - `rulebook/tasks/issue-101-p4-panel-components/specs/creonow-v1-workbench/spec.md`
- Affected code:
  - `apps/desktop/renderer/src/features/files/FileTreePanel.tsx`
  - `apps/desktop/renderer/src/features/files/FileTreePanel.stories.tsx`
  - `apps/desktop/renderer/src/features/files/FileTreePanel.test.tsx`
  - `apps/desktop/renderer/src/components/primitives/{Button,ListItem,ContextMenu}.tsx`
  - `apps/desktop/renderer/src/components/primitives/index.ts`
  - Phase 4 其它面板组件 Story/Test（移除 `@ts-nocheck` 并补齐类型）
  - `apps/desktop/package.json`, `pnpm-lock.yaml`, `.gitignore`
- Breaking change: NO
- User benefit:
  - Rename 交互符合常规设计，不再出现输入框“瞬间放大/溢出”
  - 右键即可 Rename/Delete（同时保留 `⋯` 菜单以增强可发现性）
  - CI/Storybook 更稳定、PR 更干净（不包含构建产物）
