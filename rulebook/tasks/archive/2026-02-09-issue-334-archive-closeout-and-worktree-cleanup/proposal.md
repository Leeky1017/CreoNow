# Proposal: issue-334-archive-closeout-and-worktree-cleanup

## Why
Multiple merged issues remain unarchived in OpenSpec/Rulebook, which leaves governance state inconsistent and blocks clean delivery closure.

## What Changes
- Archive merged OpenSpec changes (326/328/330/332)
- Archive corresponding Rulebook tasks
- Refresh EXECUTION_ORDER and run preflight evidence
- Clean local historical worktrees after merge

## Impact
- Affected specs: cross-module-integration-spec (delta only)
- Affected code: openspec/changes, rulebook/tasks, run logs
- Breaking change: NO
- User benefit: governance state becomes consistent and workspace isolation is cleaned up
