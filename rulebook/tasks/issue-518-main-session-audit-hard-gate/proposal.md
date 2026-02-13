# Proposal: issue-518-main-session-audit-hard-gate

## Why

Sub-agent reported completion cannot be treated as merge-ready delivery unless the main session explicitly audits and signs off.
Without a machine-enforced audit section, preflight and CI cannot reliably block unaudited or rejected outputs.

## What Changes

- Add hard validation for RUN_LOG `## Main Session Audit` in `scripts/agent_pr_preflight.py`.
- Add equivalent CI guard in `.github/workflows/openspec-log-guard.yml`.
- Add unit tests covering pass and blocking scenarios.
- Sync OpenSpec template and delivery docs with mandatory main-session audit rule.

## Impact

- Affected specs: `openspec/changes/main-session-audit-hard-gate/specs/cross-module-integration-delta.md`
- Affected code: `scripts/agent_pr_preflight.py`, `scripts/tests/test_agent_pr_preflight.py`, `.github/workflows/openspec-log-guard.yml`
- Breaking change: NO (governance tightening only)
- User benefit: unaudited sub-agent outputs are blocked before merge by both local preflight and CI guard
