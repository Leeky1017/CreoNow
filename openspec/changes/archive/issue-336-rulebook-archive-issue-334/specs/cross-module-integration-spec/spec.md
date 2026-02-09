# Cross Module Integration Specification Delta

## Change: issue-336-rulebook-archive-issue-334

### Requirement: 已合并任务归档收口 [ADDED]

This governance workflow MUST archive merged active Rulebook tasks, and it SHALL leave no active duplicate entry for the same issue.

#### Scenario: 已合并任务进入归档 [ADDED] (S1)

- **Given** `issue-334` 的 PR 已合并到 `main`
- **When** 执行 Rulebook 收口流程
- **Then** `rulebook/tasks/issue-334-archive-closeout-and-worktree-cleanup` 被移动到 `rulebook/tasks/archive/*`
- **And** active task 列表不再包含 `issue-334-archive-closeout-and-worktree-cleanup`

#### Scenario: 收口证据可追溯 [ADDED] (S2)

- **Given** 执行了任务归档
- **When** 执行交付校验
- **Then** `openspec/_ops/task_runs/ISSUE-336.md` 记录命令、结果与 PR 链接
- **And** `EXECUTION_ORDER.md` 反映当前活跃 change 的顺序与依赖
