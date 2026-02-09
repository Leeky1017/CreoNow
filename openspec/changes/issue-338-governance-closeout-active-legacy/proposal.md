# 提案：issue-338-governance-closeout-active-legacy

## 背景

`issue-334` 与 `issue-336` 已合并到 `main`，但对应 OpenSpec change 仍位于活跃目录，执行面存在“已交付但未归档”的治理残留。
同时，历史已关闭 issue（`#39`、`#50`）对应 Rulebook task 仍停留在 active 目录并保持 pending，造成任务状态与实际策略（不复用历史 issue）不一致。

## 变更内容

- 归档已合并的 OpenSpec active changes：
  - `issue-334-archive-closeout-and-worktree-cleanup`
  - `issue-336-rulebook-archive-issue-334`
- 归档历史关闭 issue 的遗留 Rulebook active tasks：
  - `issue-39-p0-008-context-engineering`
  - `issue-50-p0-012-search-embedding-rag`
- 更新 `openspec/changes/EXECUTION_ORDER.md`，反映当前活跃 change 集合与依赖关系。
- 补充 `ISSUE-338` RUN_LOG，记录依赖同步检查、Red/Green 证据与归档命令输出。

## 受影响模块

- OpenSpec Change Governance — `openspec/changes/**`
- Rulebook Task Governance — `rulebook/tasks/**`
- Ops Evidence — `openspec/_ops/task_runs/ISSUE-338.md`

## 不做什么

- 不修改任何运行时代码、IPC 契约或模块功能行为。
- 不复用已关闭 issue 作为新实现入口。
- 不处理 `issue-266` 的功能修复（单独 follow-up）。

## 审阅状态

- Owner 审阅：`PENDING`
