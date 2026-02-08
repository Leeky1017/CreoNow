# Proposal: issue-278-document-management-p1-file-tree-organization

## Why

Issue #278 聚焦 Document Management P1 的“文件树与章节组织”能力。P0 已提供 CRUD/类型/状态基线，但当前文件树缺少可验收的拖拽排序、层级移动、上下文菜单、键盘导航、空态与 Storybook 覆盖，无法满足主规范 requirement 的完整交付要求。

## What Changes

- 扩展 `FileTreePanel`：树结构构建、可见节点拍平、拖拽排序、拖入文件夹、上下文菜单、键盘导航、空态入口。
- 扩展 `fileStore`：新增 `reorder` 与 `moveToFolder` action 并接入 IPC。
- 补充测试：拖拽、菜单、键盘、空态、Storybook 覆盖；同步修订既有面板测试。
- 更新对应 OpenSpec change 文档与执行证据（RUN_LOG）。

## Impact

- Affected specs:
  - `openspec/changes/document-management-p1-file-tree-organization/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `apps/desktop/renderer/src/features/files/FileTreePanel.tsx`
  - `apps/desktop/renderer/src/features/files/FileTreePanel.stories.tsx`
  - `apps/desktop/renderer/src/stores/fileStore.ts`
  - `apps/desktop/renderer/src/features/files/FileTreePanel*.test.tsx`
  - `apps/desktop/renderer/src/features/files/FileTreePanel.storybook-coverage.test.ts`
- Breaking change: NO
- User benefit: 文件组织与导航可用性显著提升，文件树行为与 OpenSpec requirement 对齐，且具备可回归测试基线。
