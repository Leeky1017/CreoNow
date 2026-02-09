# 提案：issue-340-governance-closeout-archive-338-266

## 背景

`PR #339`（issue-338）与 `PR #279`（issue-266）均已合并到 `main`，但对应 OpenSpec change 与 Rulebook task 仍停留在 active 目录，执行面状态与交付事实不一致。

## 变更内容

- 归档已合并的 OpenSpec active changes：
  - `issue-338-governance-closeout-active-legacy`
  - `db-native-binding-doctor`
- 归档对应 Rulebook active tasks：
  - `issue-338-governance-closeout-active-legacy`
  - `issue-266-db-native-binding-doctor`
- 更新 `openspec/changes/EXECUTION_ORDER.md`，反映归档后的活跃 change 集合。
- 补充 `ISSUE-340` RUN_LOG，记录依赖同步检查、Red/Green 证据与归档命令输出。

## 受影响模块

- OpenSpec Change Governance — `openspec/changes/**`
- Rulebook Task Governance — `rulebook/tasks/**`
- Ops Evidence — `openspec/_ops/task_runs/ISSUE-340.md`

## 不做什么

- 不修改运行时代码、IPC 契约或模块功能行为。
- 不复用历史关闭 issue。
- 不引入新的功能变更需求。

## 审阅状态

- Owner 审阅：`PENDING`
