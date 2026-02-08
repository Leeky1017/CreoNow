# Proposal: issue-267-ipc-partial-closeout

## Why
Close two IPC “partial implementation” gaps from ISSUE-265 by aligning envelope spec wording (`ok`) and adding preload exposure security automation evidence.

## What Changes
- Add OpenSpec delta for envelope wording and preload security evidence requirements.
- Update IPC main spec and targeted archived IPC specs from `success` wording to `ok`.
- Add unit test + E2E test evidence for renderer-side `ipcRenderer/require` inaccessibility.
- Update run logs and closeout evidence for ISSUE-265 + ISSUE-267.

## Impact
- Affected specs: `openspec/specs/ipc/spec.md`, `openspec/changes/ipc-p0-envelope-ok-and-preload-security-evidence/**`, selected `openspec/changes/archive/**/specs/ipc/spec.md`
- Affected code: `apps/desktop/tests/unit/*`, `apps/desktop/tests/e2e/app-launch.spec.ts`, `package.json` (test:unit chain)
- Breaking change: NO
- User benefit: IPC 审计状态可收敛为 “32 implemented / 0 partial / 0 missing” with executable security evidence.
