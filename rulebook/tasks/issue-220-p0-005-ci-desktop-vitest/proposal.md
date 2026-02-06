# Proposal: issue-220-p0-005-ci-desktop-vitest

## Why

MVP remediation documents referenced a non-existent design baseline path and CI lacked renderer/store Vitest gating. This causes execution ambiguity and allows regressions to merge without desktop component test enforcement.

## What Changes

- Normalize remediation spec/task-card design baseline references to existing paths:
  - `design/system/README.md`
  - `design/system/01-tokens.css`
  - `design/DESIGN_DECISIONS.md`
- Update CI `check` job to run `pnpm -C apps/desktop test:run` before Storybook build check.
- Add issue run log and evidence records for org delivery.

## Impact

- Affected specs:
  - `openspec/specs/creonow-mvp-readiness-remediation/spec.md`
  - `openspec/specs/creonow-mvp-readiness-remediation/task_cards/index.md`
  - `openspec/specs/creonow-mvp-readiness-remediation/task_cards/p0/P0-001-dashboard-project-actions-rename-duplicate-archive.md`
- Affected code:
  - `.github/workflows/ci.yml`
- Breaking change: NO
- User benefit: Clear SSOT references and stronger CI gate for renderer/store regressions.
