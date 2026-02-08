# Proposal: issue-287-deliver-pending-workspace-governance

## Why
控制面仓库存在未交付改动，包含多个已完成 change 的归档落盘、Rulebook 任务归档、执行顺序同步与 RUN_LOG 补录。若不一次性收口，将持续触发治理漂移和重复 closeout 返工。

## What Changes
- 提交并交付当前工作区全部待提交改动。
- 归档所有已完成但仍在活跃目录的 OpenSpec changes。
- 同步 Rulebook 任务状态与归档目录。
- 补齐 ISSUE-287 RUN_LOG，并通过 preflight + PR auto-merge 完成主干收口。

## Impact
- Affected specs:
  - `openspec/changes/archive/**`
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/_ops/task_runs/ISSUE-264.md`
  - `openspec/_ops/task_runs/ISSUE-287.md`
- Affected code:
  - `rulebook/tasks/archive/**`
  - `rulebook/tasks/issue-287-deliver-pending-workspace-governance/**`
- Breaking change: NO
- User benefit: 仓库治理状态与实际交付状态一致，所有当前待交付改动合并回 `main`，避免后续重复收口。
