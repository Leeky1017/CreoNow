# Proposal: issue-336-rulebook-archive-issue-334

## Why

Issue #334 already merged to `main`, but its Rulebook task is still active. This leaves governance state inconsistent with delivery state and blocks clean closeout.

## What Changes

- Archive `rulebook/tasks/issue-334-archive-closeout-and-worktree-cleanup`
- Add OpenSpec change + RUN_LOG evidence for this post-merge closeout step
- Update `openspec/changes/EXECUTION_ORDER.md` for current active-change ordering

## Impact

- Affected specs: `openspec/specs/cross-module-integration-spec.md` (delta only)
- Affected code: `openspec/changes/**`, `rulebook/tasks/**`, `openspec/_ops/task_runs/**`
- Breaking change: NO
- User benefit: clean governance closure with auditable evidence
