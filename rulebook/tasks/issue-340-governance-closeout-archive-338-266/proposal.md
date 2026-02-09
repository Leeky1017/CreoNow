# Proposal: issue-340-governance-closeout-archive-338-266

## Why
PR #339 与 PR #279 已合并，但对应 OpenSpec change 和 Rulebook task 仍在 active 目录，治理状态与交付事实不一致，需要收口归档。

## What Changes
- Archive `openspec/changes/issue-338-governance-closeout-active-legacy` and `openspec/changes/db-native-binding-doctor`
- Archive `rulebook/tasks/issue-338-governance-closeout-active-legacy` and `rulebook/tasks/issue-266-db-native-binding-doctor`
- Update `openspec/changes/EXECUTION_ORDER.md` and record full evidence in `openspec/_ops/task_runs/ISSUE-340.md`

## Impact
- Affected specs:
  - `openspec/changes/issue-340-governance-closeout-archive-338-266/specs/cross-module-integration-spec/spec.md`
- Affected code:
  - Governance docs and archive paths only (`openspec/changes/**`, `rulebook/tasks/**`, `openspec/_ops/task_runs/**`)
- Breaking change: NO
- User benefit: 活跃变更与任务面板状态与实际交付保持一致，减少治理漂移与后续误判。
