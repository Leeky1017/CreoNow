# Proposal: issue-39-p0-008-context-engineering

## Why
CNWB-REQ-060 requires an auditable and safe context pipeline: `.creonow` sources,
stable prefix hashing, token budget + trim evidence, and redaction to prevent
secrets/absolute paths from leaking into prompts, logs, or UI.

## What Changes
- Add main-process `.creonow` IPC + services (ensure/status/watch).
- Add renderer context assembly (4 layers) with deterministic serialization and
  `stablePrefixHash`/`promptHash`.
- Add redaction utilities that produce structured evidence.
- Add Context Viewer UI + store, wired into AI Panel.
- Add Windows E2E coverage for viewer/redaction/watch.

## Impact
- Affected specs:
  - openspec/specs/creonow-v1-workbench/spec.md (CNWB-REQ-060)
  - openspec/specs/creonow-v1-workbench/design/04-context-engineering.md
  - openspec/specs/creonow-v1-workbench/design/03-ipc-contract-and-errors.md
- Affected code:
  - apps/desktop/main/src/ipc/context.ts
  - apps/desktop/main/src/services/context/**
  - apps/desktop/renderer/src/lib/ai/contextAssembler.ts
  - apps/desktop/renderer/src/lib/redaction/redact.ts
  - apps/desktop/renderer/src/features/ai/ContextViewer.tsx
  - apps/desktop/renderer/src/stores/contextStore.ts
  - apps/desktop/tests/e2e/context-viewer-redaction.spec.ts
- Breaking change: NO
- User benefit: transparent, deterministic, and safe AI context with debuggable
  trimming/redaction and stable hashes for acceptance + caching.
