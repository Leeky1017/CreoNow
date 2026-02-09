# Proposal: issue-342-governance-archive-issue-340-closeout

## Why
PR #341 已合并且 issue #340 已关闭，但对应 OpenSpec change 与 Rulebook task 仍停留在 active 目录，治理状态与交付事实不一致，需要收口归档。

## What Changes
- Archive `openspec/changes/issue-340-governance-closeout-archive-338-266`
- Archive `rulebook/tasks/issue-340-governance-closeout-archive-338-266`
- Update `openspec/changes/EXECUTION_ORDER.md` and record full evidence in `openspec/_ops/task_runs/ISSUE-342.md`

## Impact
- Affected specs:
  - `openspec/changes/issue-342-governance-archive-issue-340-closeout/specs/cross-module-integration-spec/spec.md`
- Affected code:
  - Governance docs and archive paths only (`openspec/changes/**`, `rulebook/tasks/**`, `openspec/_ops/task_runs/**`)
- Breaking change: NO
- User benefit: 活跃变更与任务状态与实际交付保持一致，减少治理漂移与后续误判。
