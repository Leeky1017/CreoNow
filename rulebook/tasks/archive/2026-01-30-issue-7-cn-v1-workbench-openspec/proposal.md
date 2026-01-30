# Proposal: issue-7-cn-v1-workbench-openspec

## Why

CN V1 needs an executable, Windows-first OpenSpec baseline (spec + design + task cards) so implementation agents can deliver without guessing and CI can enforce quality gates.

## What Changes

- Add a new OpenSpec package under `openspec/specs/creonow-v1-workbench/`:
  - `spec.md` with requirements/scenarios/acceptance + non-goals (Windows-first, Spec-first).
  - `design/` docs that pin boundaries, IPC contract semantics, and test strategy.
  - `task_cards/` (>=10 P0) that are PR-sized, executable, and Windows-first.
- Add/extend project hygiene ignores for local plan/config files.

## Impact

- Affected specs: `openspec/specs/creonow-v1-workbench/**`
- Affected code: none (docs-only)
- Breaking change: NO
- User benefit: Implementation agents can ship CN V1 features with deterministic acceptance + tests (Playwright Electron E2E gates, fake-AI).
