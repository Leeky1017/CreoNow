# Proposal: issue-338-governance-closeout-active-legacy

## Why
Current governance state is inconsistent: merged OpenSpec changes (`issue-334`, `issue-336`) remain active, and closed historical issues (`#39`, `#50`) still have pending active Rulebook tasks. This creates false execution signals and delivery ambiguity.

## What Changes
- Archive merged OpenSpec active changes `issue-334` and `issue-336`.
- Archive legacy pending Rulebook tasks `issue-39` and `issue-50`.
- Update `openspec/changes/EXECUTION_ORDER.md` to match the actual active set.
- Record dependency sync, red/green checks, and archive evidence in `ISSUE-338` RUN_LOG.

## Impact
- Affected specs:
  - `openspec/changes/issue-338-governance-closeout-active-legacy/specs/cross-module-integration-spec/spec.md`
- Affected code:
  - `openspec/changes/**`
  - `rulebook/tasks/**`
  - `openspec/_ops/task_runs/ISSUE-338.md`
- Breaking change: NO
- User benefit: governance state becomes deterministic and auditable; no stale active entries for closed/merged work.
