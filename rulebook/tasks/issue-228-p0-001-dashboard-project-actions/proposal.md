# Proposal: issue-228-p0-001-dashboard-project-actions

## Why

Dashboard 的 rename/duplicate/archive 仍是占位，导致 MVP 项目管理闭环中断；同时 `project:list` 仍沿用 `includeDeleted`，与“归档不删除”语义冲突，影响 UI 与 IPC 契约一致性。

## What Changes

- 新增 DB 迁移 `0010_projects_archive.sql`，引入 `projects.archived_at`。
- 扩展 ProjectService：`rename`、`duplicate`、`archive/unarchive`。
- 扩展 IPC：`project:rename`、`project:duplicate`、`project:archive`；`project:list` 改为 `includeArchived?: boolean` 并返回 `archivedAt?: number`。
- 刷新 `ipc-generated.ts`，同步 renderer 类型。
- Dashboard 接入 RenameDialog、Duplicate、Archive/Unarchive 与 Archived 分组。
- 补充单测与 e2e：project service actions + dashboard project actions。
- 修复受影响 stories/tests 的 `ProjectStore` mock 类型。

## Impact

- Affected specs: `openspec/specs/creonow-mvp-readiness-remediation/spec.md`
- Affected code:
  - `apps/desktop/main/src/db/migrations/0010_projects_archive.sql`
  - `apps/desktop/main/src/services/projects/projectService.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/main/src/ipc/project.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/renderer/src/stores/projectStore.tsx`
  - `apps/desktop/renderer/src/features/dashboard/DashboardPage.tsx`
  - `apps/desktop/renderer/src/features/dashboard/RenameProjectDialog.tsx`
- Breaking change: YES（`project:list` request 从 `includeDeleted` 切换为 `includeArchived`）
- User benefit: Dashboard 项目管理动作可用且持久化，归档行为可逆、可见、可测试。
