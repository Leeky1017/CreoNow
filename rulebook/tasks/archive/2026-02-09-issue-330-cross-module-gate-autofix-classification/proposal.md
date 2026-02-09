# Proposal: issue-330-cross-module-gate-autofix-classification

## Why

Cross-module gate can block drift, but remediation is still manual and slow.
We need deterministic machine classification plus safe autofix in dev branches.

## What Changes

- Add classification output for gate failures.
- Add `cross-module:autofix` command with safe baseline cleanup.
- Support optional auto-commit on `task/<N>-<slug>` branch.
- Keep CI check-only.

## Impact

- Affected specs: `openspec/changes/issue-330-cross-module-gate-autofix-classification/specs/cross-module-integration-spec/spec.md`
- Affected code: `scripts/cross-module-contract-gate.ts`, `scripts/cross-module-contract-autofix.ts`, `package.json`, unit tests
- Breaking change: NO
- User benefit: Agent can remediate faster after gate failure with auditable commits.
