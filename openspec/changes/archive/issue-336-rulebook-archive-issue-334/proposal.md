# 提案：issue-336-rulebook-archive-issue-334

## 背景

`issue-334` 已合并到 `main`，但其 Rulebook task 仍处于 active 状态。
根据交付规则，任务完成后必须将对应 Rulebook task 归档并形成可追溯证据，否则治理状态与仓库事实不一致。

## 变更内容

- 将 `rulebook/tasks/issue-334-archive-closeout-and-worktree-cleanup` 归档到 `rulebook/tasks/archive/`。
- 补充 `ISSUE-336` RUN_LOG，记录依赖同步检查、归档命令与校验输出。
- 更新 `openspec/changes/EXECUTION_ORDER.md`，反映 `issue-336` 收口顺序与依赖关系。

## 受影响模块

- OpenSpec Change Governance — `openspec/changes/**`
- Rulebook Governance — `rulebook/tasks/**`
- Ops Evidence — `openspec/_ops/task_runs/ISSUE-336.md`

## 不做什么

- 不修改运行时代码、IPC 契约或跨模块行为。
- 不重跑与本次治理变更无关的功能实现工作。

## 审阅状态

- Owner 审阅：`PENDING`
