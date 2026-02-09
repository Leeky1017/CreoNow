# Cross Module Integration Specification Delta

## Change: issue-336-rulebook-archive-issue-334

### Requirement: 已合并任务归档收口 [ADDED]

This governance workflow MUST archive merged active Rulebook tasks, and it SHALL leave no active duplicate entry for the same issue.

#### Scenario: issue-334 任务完成归档 [ADDED]

- **Given** `issue-334` PR 已合并到 `main`
- **When** 执行 Rulebook 归档
- **Then** `issue-334-archive-closeout-and-worktree-cleanup` 不再处于 active
- **And** 归档目录中存在对应条目
