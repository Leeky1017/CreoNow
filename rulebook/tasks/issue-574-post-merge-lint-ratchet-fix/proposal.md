# Proposal: issue-574-post-merge-lint-ratchet-fix

## Why

Post-merge audit found `main` CI failure on commit `252caf7d` with lint-ratchet drift (`baseline=66 current=67`), so we must restore ratchet baseline and recover governance green state.

## What Changes

- Apply a minimal, behavior-preserving lint-ratchet remediation in `editorStore`.
- Re-run lint ratchet and typecheck as acceptance evidence.
- Deliver through governed PR flow and merge back to `main`.

## Impact

- Affected specs: governance-only closeout for post-merge CI drift
- Affected code: `apps/desktop/renderer/src/stores/editorStore.tsx`
- Breaking change: NO
- User benefit: restore CI stability and keep branch protection signal trustworthy
