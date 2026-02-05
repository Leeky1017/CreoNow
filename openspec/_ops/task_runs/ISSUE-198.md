# ISSUE-198

- Issue: #198
- Branch: task/198-dashboard-project-actions
- PR: <fill-after-created>

## Plan

- 新增数据库迁移 `0010_project_archive.sql` 添加 `archived_at` 字段
- 扩展 IPC contract: `project:rename`, `project:duplicate`, `project:archive`
- 实现 projectService 的 rename/duplicate/archive 方法
- 注册 IPC handlers
- 更新 projectStore 添加新 actions
- 更新 DashboardPage 使用真实 IPC
- 新增 E2E 测试

## Runs

### 2026-02-05 Initial setup
- Command: `gh issue create` + `agent_worktree_setup.sh 198 dashboard-project-actions`
- Key output: Issue #198 created, worktree at `.worktrees/issue-198-dashboard-project-actions`
- Evidence: Branch `task/198-dashboard-project-actions` created from `origin/main`
