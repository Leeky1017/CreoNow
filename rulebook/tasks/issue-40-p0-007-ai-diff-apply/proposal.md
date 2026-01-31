# Proposal: issue-40-p0-007-ai-diff-apply

## Why

CN workbench needs a safe “AI output → human review → apply” loop for editor
selection replacement, with deterministic conflict detection and observable
versioning evidence (actor=ai) for Windows E2E reliability gates.

## What Changes

- Add unified diff generation for selection replacement proposals.
- Add diff UI + Apply/Reject controls to the AI panel.
- Add conflict detection (selection text hash) and TipTap transaction apply.
- Extend document write IPC/service to support `actor=ai` and `reason=ai-apply:<runId>`.
- Add Windows E2E to cover success + conflict + main.log evidence.

## Impact

- Affected specs:
  - `openspec/specs/creonow-v1-workbench/task_cards/p0/P0-007-ai-diff-and-apply-selection-version-ai.md`
  - `openspec/specs/creonow-v1-workbench/design/02-document-model-ssot.md`
  - `openspec/specs/creonow-v1-workbench/design/09-ai-runtime-and-network.md`
- Affected code:
  - Renderer: `apps/desktop/renderer/src/features/ai/*`, `apps/desktop/renderer/src/lib/diff/*`, `apps/desktop/renderer/src/stores/aiStore.ts`
  - Main: `apps/desktop/main/src/ipc/*`, `apps/desktop/main/src/services/documents/*`
  - Tests: `apps/desktop/tests/e2e/*`
- Breaking change: NO (adds new capabilities; existing flows remain)
- User benefit: reviewable diffs and safe apply with conflict detection + version history
