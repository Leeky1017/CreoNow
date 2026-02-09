# 提案：issue-334-archive-closeout-and-worktree-cleanup

## 背景

`issue-326`、`issue-328`、`issue-330`、`issue-332` 已完成并合并到 `main`，但其 OpenSpec change 与 Rulebook task 仍有未归档项，导致执行面显示“已交付但未收口”的悬挂状态。
当前本地还保留多个历史 task worktree，影响后续任务准入与隔离管理。

## 变更内容

- 归档已合并 change：`issue-326`、`issue-328`、`issue-330`、`issue-332` 到 `openspec/changes/archive/`。
- 归档对应 Rulebook task：`issue-326`、`issue-328`、`issue-330`、`issue-332`。
- 更新 `openspec/changes/EXECUTION_ORDER.md`，反映归档后执行顺序与状态。
- 交付后清理本地 `.worktrees/*` 历史 worktree。

## 受影响模块

- OpenSpec Change Governance — `openspec/changes/**`
- Rulebook Governance — `rulebook/tasks/**`
- Ops Evidence — `openspec/_ops/task_runs/ISSUE-334.md`

## 不做什么

- 不修改运行时代码与 IPC 契约。
- 不重写历史 Issue 的功能产物。
- 不新增 required checks 或 CI 工作流。

## 审阅状态

- Owner 审阅：`PENDING`
