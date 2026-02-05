# ISSUE-198

- Issue: #198
- Branch: task/198-dashboard-project-actions
- PR: #199

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

### 2026-02-05 Implementation complete
- Command: `pnpm lint` + `pnpm test:e2e --grep "Dashboard project actions"`
- Key output: Lint passed, 4 E2E tests passed
- Evidence:
  ```
  Running 4 tests using 1 worker
  ····
    4 passed (5.2s)
  ```
- Commits:
  - `5330adf feat(dashboard): project rename/duplicate/archive IPC (#198)`
  - `bdc50d4 fix(db): register 0010_project_archive migration (#198)`
