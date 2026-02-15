# Spec Delta: issue-574-post-merge-lint-ratchet-fix

## Context
Post-merge CI drift must be remediated without changing product behavior.

## Requirements
1. `lint:ratchet` must return to baseline (no regression vs `scripts/lint-baseline.json`).
2. Changes must be minimal and behavior-preserving.
3. Delivery must follow OpenSpec + Rulebook + GitHub governed flow.

## Acceptance
- `pnpm lint:ratchet` passes.
- `pnpm typecheck` passes.
